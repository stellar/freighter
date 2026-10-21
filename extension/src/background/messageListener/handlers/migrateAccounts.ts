import { Store } from "redux";
import StellarHDWallet from "stellar-hd-wallet";
import * as StellarSdk from "stellar-sdk";
import BigNumber from "bignumber.js";

import { MigrateAccountsMessage } from "@shared/api/types/message-request";
import {
  allAccountsSelector,
  buildHasPrivateKeySelector,
  migratedMnemonicPhraseSelector,
  publicKeySelector,
} from "background/ducks/session";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getKeyIdList } from "background/helpers/account";
import { xlmToStroop } from "helpers/stellar";
import {
  stellarSdkServer,
  submitTx,
} from "@shared/api/helpers/stellarSdkServer";
import { KeyManager } from "@stellar/typescript-wallet-sdk-km";
import {
  MAINNET_NETWORK_DETAILS,
  NETWORK_URLS,
} from "@shared/constants/stellar";
import { unlockKeystore } from "../helpers/unlock-keystore";
import { calculateSenderMinBalance } from "@shared/helpers/migration";
import { migrateTrustlines } from "background/helpers/migration";
import { replaceAccount } from "../helpers/replace-account";
import { activatePublicKey } from "../helpers/activate-public-key";
import {
  addMnemonic,
  clearSession,
  deriveKeyFromString,
  SessionTimer,
  storeActiveHashKey,
  storeEncryptedTemporaryData,
} from "background/helpers/session";
import {
  addSecretSource,
  getPhraseSourceId,
} from "background/helpers/secret-sources";
import { SecretSourceType } from "@shared/api/types";
import { KEY_ID } from "constants/localStorageTypes";

const { fromMnemonic } = StellarHDWallet;

export const migrateAccounts = async ({
  request,
  localStore,
  sessionStore,
  keyManager,
  sessionTimer,
}: {
  request: MigrateAccountsMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  keyManager: KeyManager;
  sessionTimer: SessionTimer;
}) => {
  const { balancesToMigrate, isMergeSelected, recommendedFee, password } =
    request;

  const migratedMnemonicPhrase = migratedMnemonicPhraseSelector(
    sessionStore.getState(),
  );
  const migratedAccounts = [];

  if (!password || !migratedMnemonicPhrase) {
    return { error: "Authentication error" };
  }

  const newWallet = fromMnemonic(migratedMnemonicPhrase);
  // Read once: `replaceAccount` swaps ids in place, so positions are stable.
  const keyIdList: string[] = await getKeyIdList({ localStore });
  const fee = xlmToStroop(recommendedFee).toFixed();
  // The migrated phrase is the source of every account created below.
  const phraseSourceId = await getPhraseSourceId(migratedMnemonicPhrase);
  // The first account that actually migrated; it becomes the active one.
  let firstMigratedKeyPair: { publicKey: string; privateKey: string } | null =
    null;

  // we expect all migrations to be done on MAINNET
  const server = stellarSdkServer(
    NETWORK_URLS.PUBLIC,
    MAINNET_NETWORK_DETAILS.networkPassphrase,
  );
  const networkPassphrase = StellarSdk.Networks.PUBLIC;

  /*
    For each migratable balance, we'll go through the following steps:
    1. We create a new keypair that will be the destination account
    2. We send the minimum amount of XLM needed to create the destination acct and also provide
      enough funds to create necessary trustlines
    3. Replace the old source account with the destination account in redux and in local storage.
      When the user refreshes the app, they will already be logged into their new accounts.
    4. Migrate the trustlines from the source account to destination
    5. Start an account session with the destination account so the user can start signing tx's with their newly migrated account
  */

  for (let i = 0; i < balancesToMigrate.length; i += 1) {
    const {
      publicKey,
      xlmBalance,
      minBalance,
      trustlineBalances,
      id: keyID,
    } = balancesToMigrate[i];
    const migratedAccount = {
      ...balancesToMigrate[i],
      newPublicKey: "",
      isMigrated: true,
    };

    // The account to migrate is the keystore with this id. Its position in
    // `keyIdList` (persisted storage order, never the presentation order of
    // `allAccounts`) is the derivation index the replacement takes on the new
    // phrase, as it always has. #74 replaces this with per-source index sets.
    const derivationIndex = keyIdList.indexOf(keyID);
    if (derivationIndex === -1) {
      throw new Error(`No keystore with id ${keyID}`);
    }

    const store = await unlockKeystore({ password, keyID, keyManager });

    const sourceAccount = await server.loadAccount(publicKey);

    // create a new keystore and migrate while replacing the keyId in the list
    const newKeyPair = {
      publicKey: newWallet.getPublicKey(derivationIndex),
      privateKey: newWallet.getSecret(derivationIndex),
    };

    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee,
      networkPassphrase,
    });

    // the amount the sender needs to hold to complete the migration
    const senderAccountMinBal = calculateSenderMinBalance({
      minBalance,
      recommendedFee,
      trustlineBalancesLength: trustlineBalances.length,
      isMergeSelected,
    });

    const startingBalance = new BigNumber(xlmBalance)
      .minus(senderAccountMinBal)
      .toString();

    transaction.addOperation(
      StellarSdk.Operation.createAccount({
        destination: newKeyPair.publicKey,
        startingBalance,
      }),
    );

    const sourceKeys = StellarSdk.Keypair.fromSecret(store.privateKey);
    const builtTransaction = transaction.setTimeout(180).build();

    try {
      builtTransaction.sign(sourceKeys);
    } catch (e) {
      console.error(e);
    }

    try {
      await submitTx({ server, tx: builtTransaction });
    } catch (e) {
      console.error(e);
      migratedAccount.isMigrated = false;
    }

    // if the preceding step has failed, this will fail as well. Don't bother making the API call
    if (migratedAccount.isMigrated) {
      try {
        // now that the destination accounts are funded, we can add the trustline balances

        await migrateTrustlines({
          trustlineBalances,
          server,
          newKeyPair,
          fee,
          sourceAccount,
          sourceKeys,
          isMergeSelected,
          networkPassphrase,
        });
      } catch (e) {
        console.error(e);
        migratedAccount.isMigrated = false;
      }
    }

    // if any of the preceding steps have failed, this will fail as well. Don't bother making the API call
    if (isMergeSelected && migratedAccount.isMigrated) {
      // since we're doing a merge, we can merge the old account into the new one, which will delete the old account

      const mergeTransaction = new StellarSdk.TransactionBuilder(
        sourceAccount,
        {
          fee,
          networkPassphrase,
        },
      );
      mergeTransaction.addOperation(
        StellarSdk.Operation.accountMerge({
          destination: newKeyPair.publicKey,
        }),
      );

      const builtMergeTransaction = mergeTransaction.setTimeout(180).build();

      try {
        builtMergeTransaction.sign(sourceKeys);
      } catch (e) {
        console.error(e);
      }

      try {
        await submitTx({ server, tx: builtMergeTransaction });
      } catch (e) {
        console.error(e);
        migratedAccount.isMigrated = false;
      }
    }

    if (migratedAccount.isMigrated) {
      // replace the source account with the new one in `allAccounts` and store the keys

      await replaceAccount({
        args: {
          mnemonicPhrase: migratedMnemonicPhrase,
          sourceId: phraseSourceId,
          password,
          keyPair: newKeyPair,
          idToReplace: keyID,
        },
        localStore,
        sessionStore,
        keyManager,
      });
      firstMigratedKeyPair = firstMigratedKeyPair || newKeyPair;
    }

    migratedAccount.newPublicKey = newKeyPair.publicKey;
    migratedAccounts.push(migratedAccount);
  }

  // if any of the accounts have been successfully migrated, go ahead and log in
  if (firstMigratedKeyPair) {
    // let's make the first migrated account the active one
    await activatePublicKey({
      publicKey: firstMigratedKeyPair.publicKey,
      sessionStore,
      localStore,
    });

    await clearSession({ localStore, sessionStore });

    await sessionTimer.startSession();
    const hashKey = await deriveKeyFromString(password);
    await storeEncryptedTemporaryData({
      localStore,
      keyName: await localStore.getItem(KEY_ID),
      temporaryData: firstMigratedKeyPair.privateKey,
      hashKey,
    });

    // The migrated phrase is a new source the wallet now holds. The old
    // phrase keeps its record even when every account migrated off it:
    // telling requires opening every keystore, which a later issue does.
    await addMnemonic({
      localStore,
      hashKey,
      sourceId: phraseSourceId,
      mnemonic: migratedMnemonicPhrase,
    });
    await addSecretSource({
      localStore,
      id: phraseSourceId,
      type: SecretSourceType.PHRASE,
    });

    await storeActiveHashKey({
      sessionStore,
      hashKey,
    });
  }

  const currentState = sessionStore.getState();
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);

  return {
    migratedAccounts,
    publicKey: publicKeySelector(currentState),
    allAccounts: allAccountsSelector(currentState),
    hasPrivateKey: await hasPrivateKeySelector(currentState),
  };
};
