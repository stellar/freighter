import { Store } from "redux";
import StellarHDWallet from "stellar-hd-wallet";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { captureException } from "@sentry/browser";

import { AddRecoveryPhraseSourceMessage } from "@shared/api/types/message-request";
import { SecretSourceType } from "@shared/api/types";
import { ACCOUNT_ALREADY_EXISTS_ERROR } from "@shared/constants/errors";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { linkWalletSources } from "background/helpers/link-sources";
import {
  getActiveHashKeyCryptoKey,
  SessionTimer,
} from "background/helpers/session";
import {
  addSecretSource,
  getPhraseSourceId,
  getSecretSources,
  listSecretSources,
} from "background/helpers/secret-sources";
import {
  getIsHardwareWalletActive,
  getActiveAccountId,
} from "background/helpers/account";
import { KEY_ID } from "constants/localStorageTypes";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  pendingMnemonicPhraseIdSelector,
  pendingMnemonicPhraseSelector,
  publicKeySelector,
  setPendingMnemonicPhrase,
} from "background/ducks/session";
import { loginToAllAccounts } from "../helpers/login-all-accounts";
import { getNonHwKeyID } from "../helpers/get-non-hw-key-id";
import { unlockKeystore } from "../helpers/unlock-keystore";
import { storeAccount } from "../helpers/store-account";

const { fromMnemonic } = StellarHDWallet;

export const PENDING_PHRASE_MISSING_ERROR =
  "The new recovery phrase is no longer available. Start again.";
export const PHRASE_ALREADY_HELD_ERROR =
  "This recovery phrase is already in your wallet";

/*
  Stores the phrase `generateRecoveryPhrase` is holding as a new phrase source
  and derives its first account, at index 0. The wallet it joins may hold any
  mix of sources, or no phrase at all (a secret-key wallet), so nothing here
  resolves an existing phrase: the password is checked against the active
  hot keystore, the way an import checks it.

  Unlike onboarding create, this adds to a live wallet: it never clears the
  session or touches the application state.
*/
export const addRecoveryPhraseSource = async ({
  request,
  sessionStore,
  localStore,
  keyManager,
  sessionTimer,
}: {
  request: AddRecoveryPhraseSourceMessage;
  sessionStore: Store;
  localStore: DataStorageAccess;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
}) => {
  const { password, accountName, pendingPhraseId } = request;
  const mnemonicPhrase = pendingMnemonicPhraseSelector(sessionStore.getState());

  // Another window's generation replaces this one, so a mismatched id means
  // the held phrase isn't the one this window showed.
  if (
    !mnemonicPhrase ||
    !pendingPhraseId ||
    pendingPhraseId !== pendingMnemonicPhraseIdSelector(sessionStore.getState())
  ) {
    return { error: PENDING_PHRASE_MISSING_ERROR };
  }

  if ((await getActiveHashKeyCryptoKey({ sessionStore })) === null) {
    try {
      await loginToAllAccounts(
        password,
        localStore,
        sessionStore,
        keyManager,
        sessionTimer,
      );
    } catch (e) {
      captureException(
        `Error logging in to all accounts in Add Recovery Phrase Source - ${JSON.stringify(
          e,
        )}`,
      );
      return { error: "Unable to login" };
    }
  }

  const keyID = (await getIsHardwareWalletActive({ localStore }))
    ? await getNonHwKeyID({ localStore })
    : (await localStore.getItem(KEY_ID)) || "";

  try {
    await unlockKeystore({ keyID, password, keyManager });
  } catch (e) {
    console.error(e);
    return { error: "Incorrect password" };
  }

  let sourceId: string;
  let keyPair: { publicKey: string; privateKey: string };

  try {
    sourceId = await getPhraseSourceId(mnemonicPhrase);
    const wallet = fromMnemonic(mnemonicPhrase);
    keyPair = {
      publicKey: wallet.getPublicKey(0),
      privateKey: wallet.getSecret(0),
    };
  } catch (e) {
    captureException(`Error deriving new phrase source: ${JSON.stringify(e)}`);
    return { error: "Error adding recovery phrase" };
  }

  // A generated phrase colliding is not a real case, but the checks are what
  // keep two sources or two accounts from sharing an id or an address.
  if ((await getSecretSources({ localStore }))[sourceId]) {
    return { error: PHRASE_ALREADY_HELD_ERROR };
  }
  if (
    allAccountsSelector(sessionStore.getState()).some(
      ({ publicKey }) => publicKey === keyPair.publicKey,
    )
  ) {
    return { error: ACCOUNT_ALREADY_EXISTS_ERROR };
  }

  try {
    await storeAccount({
      password,
      keyPair,
      mnemonicPhrase,
      phraseSourceId: sourceId,
      sourceId,
      derivationIndex: 0,
      accountName,
      sessionStore,
      keyManager,
      localStore,
    });
    await addSecretSource({
      localStore,
      id: sourceId,
      type: SecretSourceType.PHRASE,
    });
  } catch (e) {
    captureException(`Error adding recovery phrase: ${JSON.stringify(e)}`);
    return { error: "Error adding recovery phrase" };
  }

  sessionStore.dispatch(
    setPendingMnemonicPhrase({
      pendingMnemonicPhrase: "",
      pendingMnemonicPhraseId: "",
    }),
  );

  // The new phrase is a source of its own. Not awaited.
  void linkWalletSources({ sessionStore, localStore });

  const currentState = sessionStore.getState();
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);

  return {
    publicKey: publicKeySelector(currentState),
    activeAccountId: await getActiveAccountId({ localStore }),
    allAccounts: allAccountsSelector(currentState),
    hasPrivateKey: await hasPrivateKeySelector(currentState),
    secretSources: await listSecretSources({ localStore }),
  };
};
