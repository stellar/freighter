import { Store } from "redux";
import { Keypair } from "stellar-sdk";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";

import {
  getIsHardwareWalletActive,
  getKeyIdList,
  HW_PREFIX,
} from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KEY_ID, TEMPORARY_STORE_ID } from "constants/localStorageTypes";
import { getNonHwKeyID } from "./get-non-hw-key-id";
import { unlockKeystore } from "./unlock-keystore";
import {
  clearSession,
  deriveKeyFromString,
  SessionTimer,
  storeActiveHashKey,
  storeEncryptedTemporaryData,
  storeMnemonics,
} from "background/helpers/session";
import { getWalletSources } from "background/helpers/wallet-sources";
import { pinFirstSource } from "background/helpers/secret-sources";
import { flushSessionStore } from "background/store";
import {
  allAccountsSelector,
  logIn,
  publicKeySelector,
} from "background/ducks/session";
import { getStoredAccounts } from "./get-stored-accounts";
import { attributePendingAccounts } from "./attribute-pending-accounts";
import { captureException } from "@sentry/browser";
import { SERVICE_TYPES } from "@shared/constants/services";
import { deriveAuthKeypair } from "@shared/api/helpers/deriveAuthKeypair";
import { broadcastSessionState } from "./broadcast-session-state";

/* Retrive and store encrypted data for all existing accounts */
export const loginToAllAccounts = async (
  password: string,
  localStore: DataStorageAccess,
  sessionStore: Store,
  keyManager: KeyManager,
  sessionTimer: SessionTimer,
) => {
  const keyIdList = await getKeyIdList({ localStore });

  // if active hw then use the first non-hw keyID to check password
  // with keyManager
  let keyID = (await localStore.getItem(KEY_ID)) || "";
  let hwPublicKey = "";
  if (await getIsHardwareWalletActive({ localStore })) {
    hwPublicKey = keyID.split(":")[1];
    keyID = await getNonHwKeyID({ localStore });
  }

  // first make sure the password is correct to get active keystore, short circuit if not
  const { publicKey: activePublicKey } = await unlockKeystore({
    keyID,
    password,
    keyManager,
  });

  // Pre-V2 migration, unlock pass (#76). It runs before the session rebuild
  // so the rebuilt account list reads the provenance it writes. Identity is
  // the pinned source, never the active keystore's phrase; the migration
  // alone applies the pre-V2 rule once, to pin the existing analytics id.
  let didAttribute = false;
  try {
    didAttribute = await attributePendingAccounts({
      localStore,
      keyManager,
      password,
    });
  } catch (e) {
    // Attribution must never lock the user out; the next unlock retries.
    captureException(
      `Error attributing pre-V2 accounts on unlock: ${JSON.stringify(e)}`,
    );
  }

  // Repairs a pin write that failed after its source record landed. The
  // request path (getSigningIdentity) never writes the pin, so this and
  // registration are the only repairs.
  try {
    await pinFirstSource({ localStore });
  } catch (e) {
    captureException(e, {
      extra: { context: "loginToAllAccounts: repairing the pinned source" },
    });
  }

  const hashKey = await deriveKeyFromString(password);

  const heldAccounts = allAccountsSelector(sessionStore.getState());
  if (
    didAttribute ||
    !publicKeySelector(sessionStore.getState()) ||
    !heldAccounts.length ||
    // A session persisted by a build that predates `Account.id` cannot
    // resolve anything by id; rebuild it from storage.
    heldAccounts.some((account) => !account.id)
  ) {
    // we have cleared redux store via reloading extension/browser
    // construct allAccounts from local storage
    // log the user in using all accounts and public key/phrase from above to create the store

    await sessionStore.dispatch(
      logIn({
        publicKey: hwPublicKey || activePublicKey,
        allAccounts: await getStoredAccounts(password, keyManager, localStore),
        localStore,
      }) as any,
    );
  }

  // clear the temporary store (if it exists) so we can replace it with the new encrypted data
  await localStore.remove(TEMPORARY_STORE_ID);

  // Every phrase the wallet holds, collected from the keystores as they are
  // opened below. There is no single "wallet phrase": each phrase-derived
  // keystore carries its own phrase in `extra`, and a standalone secret key
  // carries none (hardware keystores hold no secret and are skipped).
  const heldPhrases = new Set<string>();

  for (let i = 0; i < keyIdList.length; i += 1) {
    const currentKeyId = keyIdList[i];

    if (!currentKeyId.includes(HW_PREFIX)) {
      const keyStoreToUnlock = await unlockKeystore({
        keyID: keyIdList[i],
        password,
        keyManager,
      });

      const phrase = keyStoreToUnlock.extra?.mnemonicPhrase;
      if (phrase) {
        heldPhrases.add(phrase);
      }

      try {
        await storeEncryptedTemporaryData({
          localStore,
          keyName: keyIdList[i],
          temporaryData: keyStoreToUnlock.privateKey,
          hashKey,
        });
      } catch (e) {
        captureException(
          `Error storing encrypted temporary data: ${JSON.stringify(
            e,
          )} - ${JSON.stringify(keyIdList)}: ${i}`,
        );
      }
    }
  }

  // The keypairs come along so the warm-up below does not derive each phrase
  // a second time.
  const mnemonics: Record<string, string> = {};
  const phraseSigners = new Map<string, Keypair>();
  for (const phrase of heldPhrases) {
    try {
      const { userId, keypair } = await deriveAuthKeypair(phrase);
      mnemonics[userId] = phrase;
      phraseSigners.set(userId, keypair);
    } catch (e) {
      // One unreadable phrase must not lock the user out: the private keys
      // above are already in hand, so every account can still sign.
      captureException(
        `Error deriving a phrase source id on unlock: ${JSON.stringify(e)}`,
      );
    }
  }

  if (Object.keys(mnemonics).length) {
    try {
      await storeMnemonics({ localStore, hashKey, mnemonics });
    } catch (e) {
      await clearSession({ localStore, sessionStore });
      captureException(
        `Error storing encrypted temporary data: ${JSON.stringify(e)}`,
      );
      // Rethrow so we don't fall through to startSession() +
      // broadcastSessionState(SESSION_UNLOCKED) below, which would tell
      // every Freighter surface the wallet is unlocked even though
      // clearSession() just wiped it.
      throw e;
    }
  }

  try {
    await storeActiveHashKey({
      sessionStore,
      hashKey,
    });
  } catch (e) {
    await clearSession({ localStore, sessionStore });
    captureException(`Error storing active hash key: ${JSON.stringify(e)}`);
    // Rethrow so we don't fall through to startSession() +
    // broadcastSessionState(SESSION_UNLOCKED) below — the session was
    // just cleared and the wallet must not be reported as unlocked.
    throw e;
  }

  // Derive every source identity now, while the unlock is already paying for
  // key material, so the first signed backend request does not. A failure
  // only skips the warm-up; getWalletSources derives again on demand.
  try {
    await getWalletSources({ sessionStore, localStore, phraseSigners });
  } catch (e) {
    captureException(e, {
      extra: { context: "loginToAllAccounts: deriving wallet sources" },
    });
  }

  // start the timer now that we have active private key
  await sessionTimer.startSession();
  await flushSessionStore(sessionStore);
  await broadcastSessionState(SERVICE_TYPES.SESSION_UNLOCKED);
};
