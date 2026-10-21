import { Store } from "redux";
import StellarHDWallet from "stellar-hd-wallet";

import { AddAccountMessage } from "@shared/api/types/message-request";
import {
  clearSession,
  getEncryptedTemporaryData,
  getMnemonics,
  SessionTimer,
} from "background/helpers/session";
import {
  getDefaultMnemonic,
  getHeldMnemonic,
} from "background/helpers/secret-sources";
import {
  markDerivationIndexUsed,
  nextDerivationIndex,
} from "background/helpers/derivation-indices";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KEY_ID } from "constants/localStorageTypes";
import { loginToAllAccounts } from "../helpers/login-all-accounts";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { captureException } from "@sentry/browser";
import {
  getIsHardwareWalletActive,
  getActiveAccountId,
} from "background/helpers/account";
import { getNonHwKeyID } from "../helpers/get-non-hw-key-id";
import { unlockKeystore } from "../helpers/unlock-keystore";
import { storeAccount } from "../helpers/store-account";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  publicKeySelector,
} from "background/ducks/session";

const { fromMnemonic } = StellarHDWallet;

export const addAccount = async ({
  request,
  localStore,
  sessionStore,
  keyManager,
  sessionTimer,
}: {
  request: AddAccountMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
}) => {
  const { password, sourceId: requestedSourceId } = request;

  /*
    The phrase to derive from: the one the message names, else the active
    account's phrase, else the pinned source or the first held phrase. The
    source chooser will always name one; the implicit cases cover a
    one-phrase wallet and a migrated wallet until then.
  */
  const resolveSource = async () => {
    if (requestedSourceId) {
      return getHeldMnemonic({
        sessionStore,
        localStore,
        sourceId: requestedSourceId,
      });
    }

    const activeId = await getActiveAccountId({ localStore });
    const active = allAccountsSelector(sessionStore.getState()).find(
      ({ id }) => id === activeId,
    );
    const fromActive = active?.sourceId
      ? await getHeldMnemonic({
          sessionStore,
          localStore,
          sourceId: active.sourceId,
        })
      : null;

    return fromActive || getDefaultMnemonic({ sessionStore, localStore });
  };

  let source = await resolveSource();

  // Nothing held means the session is locked: unlock, then resolve again.
  if (
    !source &&
    !Object.keys(await getMnemonics({ sessionStore, localStore })).length
  ) {
    try {
      await loginToAllAccounts(
        password,
        localStore,
        sessionStore,
        keyManager,
        sessionTimer,
      );
      source = await resolveSource();
    } catch (e) {
      captureException(
        `Error logging in to all accounts in Add Account - ${JSON.stringify(
          e,
        )}`,
      );
      return { error: "Unable to login" };
    }
  }

  if (!source) {
    return {
      error: requestedSourceId
        ? "Unknown recovery phrase"
        : "No recovery phrase to derive from",
    };
  }

  const { mnemonic: mnemonicPhrase, sourceId } = source;

  const keyID = (await getIsHardwareWalletActive({ localStore }))
    ? await getNonHwKeyID({ localStore })
    : (await localStore.getItem(KEY_ID)) || "";

  // if the session is active, confirm that the password is correct and the hashkey properly unlocks
  let activePrivateKey = "";
  try {
    await unlockKeystore({ keyID, password, keyManager });
    activePrivateKey = await getEncryptedTemporaryData({
      sessionStore,
      localStore,
      keyName: keyID,
    });
  } catch (e) {
    console.error(e);
    return { error: "Incorrect password" };
  }

  if (!activePrivateKey) {
    captureException("Error decrypting active private key in Add Account");
    return { error: "Incorrect password" };
  }

  /*
    Derive at the phrase's lowest unused index. If that key is already an
    account, the index set has fallen behind the accounts: mark the index
    used and move on to the next. At most every held account can collide, so
    the loop is bounded by the account count plus one.
  */
  const heldPublicKeys = new Set(
    allAccountsSelector(sessionStore.getState()).map(
      ({ publicKey }) => publicKey,
    ),
  );
  let keyPair: { publicKey: string; privateKey: string } | null = null;
  let derivationIndex = -1;

  try {
    const wallet = fromMnemonic(mnemonicPhrase);
    const skipped: number[] = [];

    for (let attempt = 0; attempt <= heldPublicKeys.size; attempt += 1) {
      derivationIndex = await nextDerivationIndex({ localStore, sourceId });
      const publicKey = wallet.getPublicKey(derivationIndex);

      if (!heldPublicKeys.has(publicKey)) {
        keyPair = { publicKey, privateKey: wallet.getSecret(derivationIndex) };
        break;
      }

      await markDerivationIndexUsed({
        localStore,
        sourceId,
        index: derivationIndex,
      });
      skipped.push(derivationIndex);
    }

    if (skipped.length) {
      captureException(
        `Derivation index set for source ${sourceId} was missing indices ${skipped.join(
          ", ",
        )}`,
      );
    }
  } catch (e) {
    captureException(`Error deriving account: ${JSON.stringify(e)}`);
    return { error: "Error adding account" };
  }

  if (!keyPair) {
    captureException(`No free derivation index found for source ${sourceId}`);
    return { error: "Error adding account" };
  }

  // Add the new account to our data store
  try {
    await storeAccount({
      password,
      keyPair,
      mnemonicPhrase,
      phraseSourceId: sourceId,
      sourceId,
      derivationIndex,
      sessionStore,
      keyManager,
      localStore,
    });
  } catch (e) {
    await clearSession({ localStore, sessionStore });
    captureException(`Error adding account: ${JSON.stringify(e)}`);
    return { error: "Error adding account" };
  }

  const currentState = sessionStore.getState();
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);

  return {
    publicKey: publicKeySelector(currentState),
    activeAccountId: await getActiveAccountId({ localStore }),
    allAccounts: allAccountsSelector(currentState),
    hasPrivateKey: await hasPrivateKeySelector(currentState),
  };
};
