import React, { useState, useEffect } from "react";
import StellarSdk from "stellar-sdk";

import {
  resetDevData,
  createAccount,
  changeNetwork,
  fundAccount,
  addAccount,
  importAccount,
  importHardwareWallet,
  makeAccountActive,
  updateAccountName,
  loadAccount,
  getMnemonicPhrase,
  confirmMnemonicPhrase,
  recoverAccount,
  confirmPassword,
  getAccountBalances,
  getAccountHistory,
  getAssetIcons,
  retryAssetIcon,
  getAssetDomains,
  rejectAccess,
  grantAccess,
  handleSignedHwTransaction,
  signTransaction,
  signFreighterTransaction,
  addRecentAddress,
  loadRecentAddresses,
  signOut,
  saveSettings,
  loadSettings,
  showBackupPhrase,
  addCustomNetwork,
  removeCustomNetwork,
  editCustomNetwork,
  getBlockedDomains,
} from "@shared/api/internal";

import {
  requestPublicKey,
  submitTransaction,
  requestNetwork,
  requestNetworkDetails,
} from "@shared/api/external";

import { WalletType } from "@shared/constants/hardwareWallet";
import {
  NETWORK_NAMES,
  TESTNET_NETWORK_DETAILS,
  NETWORKS,
  NETWORK_URLS,
  FUTURENET_NETWORK_DETAILS,
} from "@shared/constants/stellar";

import { Balances } from "@shared/api/types";

const testPublicKey =
  "GAM7OKWGYLITNSTD6335XNCBT6S2MZRT7UWQVZJHF5BQVMNF3YIKJTWY";
const testSecretKey =
  "SC3JPZM3IULPEWMXYCMUI5DHQQRE4TVC75BMNKZZZSSYWXVLJUMPINWG";
const testPassword = "test";
const testTxXDR =
  "AAAAAgAAAAC/Aa0zCy4X49LY6Y9QoC9Z94wG2/mz7eFcQJOH3qGY0AAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAACwAAAAAAAAACAAAAAAAAAAA=";
const random = Math.random().toString(36).substring(2);
const testCustomNetwork = {
  network: NETWORKS.TESTNET,
  networkName: `custom network ${random}`,
  networkUrl: NETWORK_URLS.TESTNET,
  networkPassphrase: StellarSdk.Networks.TESTNET,
};

export const IntegrationTest = () => {
  const [isDone, setIsDone] = useState(false);
  // ALEC TODO - remove
  console.log("running integration tests");

  // ALEC TODO - check that no errors occurred anywhere
  // ALEC TODO - add some sort of confirmation that a test completed
  useEffect(() => {
    const runTests = async () => {
      await resetDevData();

      let res: any;

      // changeNetwork
      res = await changeNetwork(NETWORK_NAMES.TESTNET);
      assertEq(res, TESTNET_NETWORK_DETAILS);

      // create account
      res = await createAccount(testPassword);
      assertArray(res.allAccounts);
      assertString(res.publicKey);

      // fundAccount
      await fundAccount(testPublicKey);

      // addAccount
      res = await addAccount(testPassword);
      assertArray(res.allAccounts);
      assertString(res.publicKey);
      assertBoolean(res.hasPrivateKey);

      // importAccount
      res = await importAccount(testPassword, testSecretKey);
      assertArray(res.allAccounts);
      assertString(res.publicKey);
      assertBoolean(res.hasPrivateKey);

      // importHardwareWallet
      res = await importHardwareWallet(
        testPublicKey,
        WalletType.LEDGER,
        "44'/148'/1'",
      );
      assertArray(res.allAccounts);
      assertString(res.publicKey);
      assertString(res.bipPath);
      assertBoolean(res.hasPrivateKey);

      // makeAccountActive
      res = await makeAccountActive(testPublicKey);
      assertString(res.publicKey);
      assertString(res.bipPath);
      assertBoolean(res.hasPrivateKey);

      // updateAccountName
      res = await updateAccountName("new-name");
      assertArray(res.allAccounts);

      // loadAccount
      res = await loadAccount();
      assertArray(res.allAccounts);
      assertString(res.publicKey);
      assertString(res.bipPath);
      assertBoolean(res.hasPrivateKey);
      assertString(res.applicationState);

      // getMnemonicPhrase
      res = await getMnemonicPhrase();
      assertString(res.mnemonicPhrase);
      const mnemonicPhrase = res.mnemonicPhrase;

      // confirmMnemonicPhrase
      res = await confirmMnemonicPhrase(mnemonicPhrase);
      assertString(res.applicationState);
      assertBoolean(res.isCorrectPhrase);
      assertEq(res.isCorrectPhrase, true);

      await resetDevData();

      // recoverAccount
      res = await recoverAccount(testPassword, mnemonicPhrase);
      assertArray(res.allAccounts);
      assertString(res.publicKey);
      assertBoolean(res.hasPrivateKey);
      assertEq(res.error, "");

      // confirmPassword
      res = await confirmPassword(testPassword);
      assertArray(res.allAccounts);
      assertString(res.publicKey);
      assertString(res.bipPath);
      assertBoolean(res.hasPrivateKey);
      assertString(res.applicationState);

      // getAccountBalances
      res = await getAccountBalances({
        publicKey: testPublicKey,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      assertEq(Object.keys(res.balances).length > 0, true);
      assertBoolean(res.isFunded);
      assertNumber(res.subentryCount);

      // getAccountHistory
      res = await getAccountHistory({
        publicKey: testPublicKey,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      assertArray(res.operations);

      // getAssetIcons
      const hold = {
        native: {
          token: { type: "native", code: "XLM" },
        },
        "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5": {
          token: {
            type: "credit_alphanum4",
            code: "USDC",
            issuer: {
              key: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
              code: "USDC",
            },
          },
        },
      };
      const testBalances = (hold as unknown) as Balances;
      res = await getAssetIcons({
        balances: testBalances,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      assertEq(Object.keys(res).length > 0, true);

      // retryAssetIcon
      res = await retryAssetIcon({
        key: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        code: "USDC",
        assetIcons: {},
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      assertEq(Object.keys(res).length > 0, true);

      // getAssetDomains
      res = await getAssetDomains({
        balances: testBalances,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      assertEq(Object.keys(res).length > 0, true);

      // rejectAccess
      await rejectAccess();

      // grantAccess
      await grantAccess("https://laboratory.stellar.org");

      // handleSignedHwTransaction
      await handleSignedHwTransaction({ signedTransaction: "" });

      // signTransaction
      await signTransaction({ transaction: testTxXDR });

      // signFreighterTransaction
      res = await signFreighterTransaction({
        transactionXDR: testTxXDR,
        network: TESTNET_NETWORK_DETAILS.networkPassphrase,
      });
      assertString(res.signedTransaction);

      // addRecentAddress
      res = await addRecentAddress({ publicKey: testPublicKey });
      assertArray(res.recentAddresses);

      // loadRecentAddresses
      res = await loadRecentAddresses();
      assertArray(res.recentAddresses);

      // signOut
      res = await signOut();
      assertString(res.publicKey);
      assertString(res.applicationState);

      // saveSettings
      res = await saveSettings({
        isDataSharingAllowed: true,
        isMemoValidationEnabled: true,
        isSafetyValidationEnabled: true,
        isValidatingSafeAssetsEnabled: true,
        isExperimentalModeEnabled: true,
      });
      assertEq(res.networkDetails, FUTURENET_NETWORK_DETAILS);
      assertArray(res.networksList);
      assertEq(res.error, undefined);
      assertEq(res.isDataSharingAllowed, true);
      assertEq(res.isMemoValidationEnabled, true);
      assertEq(res.isSafetyValidationEnabled, true);
      assertEq(res.isValidatingSafeAssetsEnabled, true);
      assertEq(res.isExperimentalModeEnabled, true);

      // loadSettings
      res = await loadSettings();
      assertEq(res.networkDetails, FUTURENET_NETWORK_DETAILS);
      assertArray(res.networksList);
      assertEq(res.error, undefined);
      assertEq(res.isDataSharingAllowed, true);
      assertEq(res.isMemoValidationEnabled, true);
      assertEq(res.isSafetyValidationEnabled, true);
      assertEq(res.isValidatingSafeAssetsEnabled, true);
      assertEq(res.isExperimentalModeEnabled, true);

      // showBackupPhrase
      res = await showBackupPhrase(testPassword);
      assertEq(res.error, undefined);

      // addCustomNetwork
      res = await addCustomNetwork(testCustomNetwork);
      const networksListLength = res.networksList.length;
      assertArray(res.networksList);
      assertEq(
        res.networksList[networksListLength - 1].networkName,
        testCustomNetwork.networkName,
      );

      // editCustomNetwork
      res = await editCustomNetwork({
        networkDetails: {
          ...testCustomNetwork,
          networkName: `new network ${random}`,
        },
        networkIndex: networksListLength - 1,
      });
      assertArray(res.networksList);
      assertEq(
        res.networksList[networksListLength - 1].networkName,
        `new network ${random}`,
      );

      // removeCustomNetwork
      res = await removeCustomNetwork(testCustomNetwork.networkName);
      assertArray(res.networksList);
      assertEq(res.networksList.length, networksListLength - 1);

      // getBlockedDomains
      res = await getBlockedDomains();
      assertEq(Object.keys(res.blockedDomains).length > 0, true);

      // changeNetwork
      res = await changeNetwork(NETWORK_NAMES.PUBNET);

      // requestPublicKey
      res = await requestPublicKey();
      assertString(res);

      // submitTransaction
      res = await submitTransaction(testTxXDR);
      assertString(res);

      // requestNetwork
      res = await requestNetwork();
      assertString(res);

      // requestNetworkDetails
      res = await requestNetworkDetails();
      assertString(res.network);
      assertString(res.networkPassphrase);
      assertString(res.networkUrl);

      setIsDone(true);
    };
    runTests();
  }, []);

  return (
    <div>
      <div>Running integration tests ...</div>
      <div>{isDone ? "Done" : ""}</div>
    </div>
  );
};

// ALEC tODO - reorder these

const assertNumber = (val: any) => {
  if (Number.isNaN(val)) {
    console.error(
      `[${val}]: incorrect type. Want Number but found ${typeof val}`,
    );
  }
};

const assertEq = (have: any, want: any) => {
  const haveString = JSON.stringify(have);
  const wantString = JSON.stringify(want);
  if (haveString !== wantString) {
    console.error(`[${haveString}]: incorrect value. Want ${wantString}`);
  }
};

const assertBoolean = (val: any) => {
  if (!(typeof val === "boolean")) {
    console.error(
      `[${val}]: incorrect type. Want Boolean but found ${typeof val}`,
    );
  }
};

const assertString = (val: any) => {
  if (!(typeof val === "string") && !(val instanceof String)) {
    console.error(
      `[${val}]: incorrect type. Want String but found ${typeof val}`,
    );
  }
};

const assertArray = (val: any) => {
  if (!Array.isArray(val)) {
    console.error(
      `[${val}]: incorrect type. Want Array but found ${typeof val}`,
    );
  }
};

// ALEC TODO - remove
console.log({
  StellarSdk,
  NETWORKS,
  NETWORK_URLS,
  assertNumber,
  WalletType,
  testPublicKey,
  testSecretKey,
  assertBoolean,
  testCustomNetwork,
});
const hold = {};
console.log((hold as unknown) as Balances);
