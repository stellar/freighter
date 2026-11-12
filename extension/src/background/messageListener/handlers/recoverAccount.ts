import { Store } from "redux";
import StellarHDWallet from "stellar-hd-wallet";

import { RecoverAccountMessage } from "@shared/api/types/message-request";
import { removePreviousAccount } from "../helpers/remove-previous-account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { SessionTimer } from "background/helpers/session";
import { storeAccount } from "../helpers/store-account";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import { captureException } from "@sentry/browser";
import { discoverFundedIndices } from "../helpers/discover-funded-indices";
import {
  addSecretSource,
  getPhraseSourceId,
} from "background/helpers/secret-sources";
import { SecretSourceType } from "@shared/api/types";
import {
  buildRecoveryResponse,
  clearWalletForRecovery,
  finishRecovery,
} from "../helpers/recovery-lifecycle";

const { fromMnemonic } = StellarHDWallet;

export const recoverAccount = async ({
  request,
  localStore,
  sessionStore,
  keyManager,
  sessionTimer,
  numOfPublicKeysToCheck,
}: {
  request: RecoverAccountMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
  numOfPublicKeysToCheck: number;
}) => {
  const { password, recoverMnemonic, isOverwritingAccount } = request;
  let wallet;
  let phraseSourceId = "";
  let error = "";

  if (isOverwritingAccount) {
    await removePreviousAccount({ localStore });
  }

  try {
    wallet = fromMnemonic(recoverMnemonic);
    phraseSourceId = await getPhraseSourceId(recoverMnemonic);
  } catch (e) {
    console.error(e);
    wallet = undefined;
    error = "Invalid mnemonic phrase";
  }

  if (wallet) {
    const keyPair = {
      publicKey: wallet.getPublicKey(0),
      privateKey: wallet.getSecret(0),
    };

    await clearWalletForRecovery({ localStore, sessionStore });

    try {
      await storeAccount({
        mnemonicPhrase: recoverMnemonic,
        phraseSourceId,
        sourceId: phraseSourceId,
        derivationIndex: 0,
        password,
        keyPair,
        isSettingHashKey: true,
        sessionStore,
        localStore,
        keyManager,
      });
      await addSecretSource({
        localStore,
        id: phraseSourceId,
        type: SecretSourceType.PHRASE,
      });
    } catch (e) {
      captureException(`Error recovering account: ${JSON.stringify(e)}`);
    }

    // lets check first couple of accounts and pre-load them if funded on mainnet

    const fundedIndices = await discoverFundedIndices({
      wallet,
      from: 1,
      to: numOfPublicKeysToCheck,
    });

    for (const i of fundedIndices) {
      try {
        const newKeyPair = {
          publicKey: wallet.getPublicKey(i),
          privateKey: wallet.getSecret(i),
        };

        // Not `imported`. These are derived from the recovery phrase we
        // just took, at derivation indices 1..n — the same thing
        // `addAccount` produces, which stores them unflagged. "Imported"
        // is reserved for accounts brought in from a secret key, which
        // the phrase cannot re-derive.
        await storeAccount({
          password,
          keyPair: newKeyPair,
          mnemonicPhrase: recoverMnemonic,
          phraseSourceId,
          sourceId: phraseSourceId,
          derivationIndex: i,
          sessionStore,
          localStore,
          keyManager,
        });
      } catch (e) {
        captureException(
          `Error preloading account: ${JSON.stringify(e)} - ${i}`,
        );
        // continue
      }
    }

    // let's make the first public key the active one
    await finishRecovery({
      publicKey: wallet.getPublicKey(0),
      localStore,
      sessionStore,
      sessionTimer,
    });
  }

  return buildRecoveryResponse({ localStore, sessionStore, error });
};
