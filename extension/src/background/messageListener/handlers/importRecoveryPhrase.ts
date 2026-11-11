import { Store } from "redux";
import StellarHDWallet from "stellar-hd-wallet";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { captureException } from "@sentry/browser";

import { ImportRecoveryPhraseMessage } from "@shared/api/types/message-request";
import { SecretSourceType } from "@shared/api/types";
import { ACCOUNT_ALREADY_EXISTS_ERROR } from "@shared/constants/errors";
import {
  isValidImportMnemonic,
  normalizeMnemonic,
} from "@shared/api/helpers/mnemonic";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { linkWalletSources } from "background/helpers/link-sources";
import { SessionTimer } from "background/helpers/session";
import {
  addSecretSource,
  getPhraseSourceId,
  getSecretSources,
  listSecretSources,
} from "background/helpers/secret-sources";
import { getActiveAccountId } from "background/helpers/account";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  publicKeySelector,
} from "background/ducks/session";
import { verifyAddPassword } from "../helpers/verify-add-password";
import { discoverFundedIndices } from "../helpers/discover-funded-indices";
import { storeAccount } from "../helpers/store-account";
import { activatePublicKey } from "../helpers/activate-public-key";
import { PHRASE_ALREADY_HELD_ERROR } from "./addRecoveryPhraseSource";

const { fromMnemonic } = StellarHDWallet;

export const IMPORT_PHRASE_FAILED_ERROR = "Error adding recovery phrase";

/*
  Adds a recovery phrase the user typed to a live wallet as a new phrase
  source: index 0 always, then every index from 1 to `discoveryDepth - 1`
  that is funded on mainnet. Every refusal returns before the first write.

  Unlike onboarding recover, this never clears the wallet: existing sources,
  accounts, names, indices, provenance and the application state stay as
  they are.
*/
export const importRecoveryPhrase = async ({
  request,
  localStore,
  sessionStore,
  keyManager,
  sessionTimer,
  discoveryDepth,
}: {
  request: ImportRecoveryPhraseMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
  discoveryDepth: number;
}) => {
  const { password } = request;
  const mnemonicPhrase = normalizeMnemonic(request.mnemonicPhrase || "");

  if (!isValidImportMnemonic(mnemonicPhrase)) {
    return { error: "Invalid mnemonic phrase" };
  }

  const passwordError = await verifyAddPassword({
    password,
    localStore,
    sessionStore,
    keyManager,
    sessionTimer,
  });
  if (passwordError) {
    return { error: passwordError };
  }

  let sourceId: string;
  let wallet: ReturnType<typeof fromMnemonic>;
  try {
    sourceId = await getPhraseSourceId(mnemonicPhrase);
    wallet = fromMnemonic(mnemonicPhrase);
  } catch (e) {
    captureException(
      `Error deriving imported phrase source: ${JSON.stringify(e)}`,
    );
    return { error: IMPORT_PHRASE_FAILED_ERROR };
  }

  const isSourceHeld = async () =>
    Boolean((await getSecretSources({ localStore }))[sourceId]);

  // Checked before discovery to skip the lookups for a held phrase.
  if (await isSourceHeld()) {
    return { error: PHRASE_ALREADY_HELD_ERROR };
  }

  const fundedIndices = await discoverFundedIndices({
    wallet,
    from: 1,
    to: discoveryDepth - 1,
  });
  const indices = [0, ...fundedIndices];

  // Checked again after discovery: another import of the same phrase may
  // have finished while the lookups ran.
  if (await isSourceHeld()) {
    return { error: PHRASE_ALREADY_HELD_ERROR };
  }

  // Collisions are refused, never merged: if any address this phrase would
  // add is already in the wallet (say, imported earlier as a secret key),
  // nothing is added.
  const held = new Set(
    allAccountsSelector(sessionStore.getState()).map(
      ({ publicKey }) => publicKey,
    ),
  );
  if (indices.some((i) => held.has(wallet.getPublicKey(i)))) {
    return { error: ACCOUNT_ALREADY_EXISTS_ERROR };
  }

  const previousActiveId = await getActiveAccountId({ localStore });

  try {
    // The source goes first, so a failure partway leaves a held source that
    // a retry is refused against, never accounts with no source.
    await addSecretSource({
      localStore,
      id: sourceId,
      type: SecretSourceType.PHRASE,
    });

    for (const i of indices) {
      await storeAccount({
        password,
        keyPair: {
          publicKey: wallet.getPublicKey(i),
          privateKey: wallet.getSecret(i),
        },
        mnemonicPhrase,
        phraseSourceId: sourceId,
        sourceId,
        derivationIndex: i,
        sessionStore,
        keyManager,
        localStore,
      });
    }

    // storeAccount leaves the last stored account active; the phrase's
    // first account is the one to land on.
    const first = allAccountsSelector(sessionStore.getState()).find(
      (account) =>
        account.sourceId === sourceId &&
        account.publicKey === wallet.getPublicKey(0),
    );
    await activatePublicKey({
      id: first?.id,
      publicKey: wallet.getPublicKey(0),
      sessionStore,
      localStore,
    });
  } catch (e) {
    captureException(`Error importing recovery phrase: ${JSON.stringify(e)}`);
    // storeAccount moves the active account to each account it stores. Put
    // back the one the popup still shows.
    try {
      await activatePublicKey({
        id: previousActiveId,
        sessionStore,
        localStore,
      });
    } catch (restoreError) {
      captureException(
        `Error restoring active account after failed import: ${JSON.stringify(
          restoreError,
        )}`,
      );
    }
    return { error: IMPORT_PHRASE_FAILED_ERROR };
  }

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
