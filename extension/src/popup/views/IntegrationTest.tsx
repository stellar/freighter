import React, { useState, useEffect } from "react";
import StellarSdk from "stellar-sdk";

import {
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
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { SERVICE_TYPES, DEV_SERVER } from "@shared/constants/services";

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
const testBalances = ({
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
} as unknown) as Balances;

export const IntegrationTest = () => {
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!DEV_SERVER) {
      console.error("used for dev only");
      return;
    }

    const runTests = async () => {
      let res: any;
      console.log("🧪 starting integration tests 🧪");
      res = await resetDevData();
      if (res.error) {
        console.error(
          "extension must be built in experimental mode to run integration tests",
        );
        return;
      }

      res = await changeNetwork(NETWORK_NAMES.TESTNET);
      runAsserts("changeNetwork", () => {
        assertEq(res, TESTNET_NETWORK_DETAILS);
      });

      res = await createAccount(testPassword);
      runAsserts("createAccount", () => {
        assertArray(res.allAccounts);
        assertString(res.publicKey);
      });

      await fundAccount(testPublicKey);
      runAsserts("fundAccount", () => {});

      res = await addAccount(testPassword);
      runAsserts("addAccount", () => {
        assertArray(res.allAccounts);
        assertString(res.publicKey);
        assertBoolean(res.hasPrivateKey);
      });

      res = await importAccount(testPassword, testSecretKey);
      runAsserts("importAccount", () => {
        assertArray(res.allAccounts);
        assertString(res.publicKey);
        assertBoolean(res.hasPrivateKey);
      });

      res = await importHardwareWallet(
        testPublicKey,
        WalletType.LEDGER,
        "44'/148'/1'",
      );
      runAsserts("importHardwareWallet", () => {
        assertArray(res.allAccounts);
        assertString(res.publicKey);
        assertString(res.bipPath);
        assertBoolean(res.hasPrivateKey);
      });

      res = await makeAccountActive(testPublicKey);
      runAsserts("makeAccountActive", () => {
        assertString(res.publicKey);
        assertString(res.bipPath);
        assertBoolean(res.hasPrivateKey);
      });

      res = await updateAccountName("new-name");
      runAsserts("updateAccountName", () => {
        assertArray(res.allAccounts);
      });

      res = await loadAccount();
      runAsserts("loadAccount", () => {
        assertArray(res.allAccounts);
        assertString(res.publicKey);
        assertString(res.bipPath);
        assertBoolean(res.hasPrivateKey);
        assertString(res.applicationState);
      });

      res = await getMnemonicPhrase();
      runAsserts("getMnemonicPhrase", () => {
        assertString(res.mnemonicPhrase);
      });
      const mnemonicPhrase = res.mnemonicPhrase;

      res = await confirmMnemonicPhrase(mnemonicPhrase);
      runAsserts("confirmMnemonicPhrase", () => {
        assertString(res.applicationState);
        assertBoolean(res.isCorrectPhrase);
        assertEq(res.isCorrectPhrase, true);
      });

      await resetDevData();
      runAsserts("resetDevData", () => {});

      res = await recoverAccount(testPassword, mnemonicPhrase);

      runAsserts("recoverAccount", () => {
        assertArray(res.allAccounts);
        assertString(res.publicKey);
        assertBoolean(res.hasPrivateKey);
        assertEq(res.error, "");
      });

      res = await confirmPassword(testPassword);
      runAsserts("confirmPassword", () => {
        assertArray(res.allAccounts);
        assertString(res.publicKey);
        assertString(res.bipPath, true);
        assertBoolean(res.hasPrivateKey);
        assertString(res.applicationState);
      });

      res = await getAccountBalances({
        publicKey: testPublicKey,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      runAsserts("getAccountBalances", () => {
        assertEq(Object.keys(res.balances).length > 0, true);
        assertBoolean(res.isFunded);
        assertNumber(res.subentryCount);
      });

      res = await getAccountHistory({
        publicKey: testPublicKey,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      runAsserts("getAccountHistory", () => {
        assertArray(res.operations);
      });

      res = await getAssetIcons({
        balances: testBalances,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      runAsserts("getAssetIcons", () => {
        assertEq(Object.keys(res).length > 0, true);
      });

      res = await retryAssetIcon({
        key: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        code: "USDC",
        assetIcons: {},
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      runAsserts("retryAssetIcon", () => {
        assertEq(Object.keys(res).length > 0, true);
      });

      res = await getAssetDomains({
        balances: testBalances,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
      runAsserts("getAssetDomains", () => {
        assertEq(Object.keys(res).length > 0, true);
      });

      await rejectAccess();
      runAsserts("rejectAccess", () => {});

      await grantAccess("https://laboratory.stellar.org");
      runAsserts("grantAccess", () => {});

      await handleSignedHwTransaction({ signedTransaction: "" });
      runAsserts("handleSignedHwTransaction", () => {});

      await signTransaction({ transaction: testTxXDR });
      runAsserts("signTransaction", () => {});

      res = await signFreighterTransaction({
        transactionXDR: testTxXDR,
        network: TESTNET_NETWORK_DETAILS.networkPassphrase,
      });
      runAsserts("signFreighterTransaction", () => {
        assertString(res.signedTransaction);
      });

      res = await addRecentAddress({ publicKey: testPublicKey });
      runAsserts("addRecentAddress", () => {
        assertArray(res.recentAddresses);
      });

      res = await loadRecentAddresses();
      runAsserts("loadRecentAddresses", () => {
        assertArray(res.recentAddresses);
      });

      res = await signOut();
      runAsserts("signOut", () => {
        assertString(res.publicKey, true);
        assertString(res.applicationState);
      });

      res = await saveSettings({
        isDataSharingAllowed: true,
        isMemoValidationEnabled: true,
        isSafetyValidationEnabled: true,
        isValidatingSafeAssetsEnabled: true,
        isExperimentalModeEnabled: true,
      });
      runAsserts("saveSettings", () => {
        assertEq(res.networkDetails, FUTURENET_NETWORK_DETAILS);
        assertArray(res.networksList);
        assertEq(res.error, undefined);
        assertEq(res.isDataSharingAllowed, true);
        assertEq(res.isMemoValidationEnabled, true);
        assertEq(res.isSafetyValidationEnabled, true);
        assertEq(res.isValidatingSafeAssetsEnabled, true);
        assertEq(res.isExperimentalModeEnabled, true);
      });

      res = await loadSettings();
      runAsserts("loadSettings", () => {
        assertEq(res.networkDetails, FUTURENET_NETWORK_DETAILS);
        assertArray(res.networksList);
        assertEq(res.error, undefined);
        assertEq(res.isDataSharingAllowed, true);
        assertEq(res.isMemoValidationEnabled, true);
        assertEq(res.isSafetyValidationEnabled, true);
        assertEq(res.isValidatingSafeAssetsEnabled, true);
        assertEq(res.isExperimentalModeEnabled, true);
      });

      res = await showBackupPhrase(testPassword);
      runAsserts("showBackupPhrase", () => {
        assertEq(res.error, undefined);
      });

      res = await addCustomNetwork(testCustomNetwork);
      const networksListLength = res.networksList.length;
      runAsserts("addCustomNetwork", () => {
        assertArray(res.networksList);
        assertEq(
          res.networksList[networksListLength - 1].networkName,
          testCustomNetwork.networkName,
        );
      });

      res = await editCustomNetwork({
        networkDetails: {
          ...testCustomNetwork,
          networkName: `new network ${random}`,
        },
        networkIndex: networksListLength - 1,
      });

      runAsserts("editCustomNetwork", () => {
        assertArray(res.networksList);
        assertEq(
          res.networksList[networksListLength - 1].networkName,
          `new network ${random}`,
        );
      });

      res = await removeCustomNetwork(testCustomNetwork.networkName);
      runAsserts("removeCustomNetwork", () => {
        assertArray(res.networksList);
        assertEq(res.networksList.length, networksListLength - 1);
      });

      res = await getBlockedDomains();
      runAsserts("getBlockedDomains", () => {
        assertEq(Object.keys(res.blockedDomains).length > 0, true);
      });

      await changeNetwork(NETWORK_NAMES.PUBNET);
      res = await requestPublicKey();
      runAsserts("requestPublicKey", () => {
        assertString(res);
      });

      res = await submitTransaction(testTxXDR);
      runAsserts("submitTransaction", () => {
        assertString(res);
      });

      res = await requestNetwork();
      runAsserts("requestNetwork", () => {
        assertString(res);
      });

      res = await requestNetworkDetails();
      runAsserts("requestNetworkDetails", () => {
        assertString(res.network);
        assertString(res.networkPassphrase);
        assertString(res.networkUrl);
      });

      console.log("👍 Done 👍");
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

const runAsserts = (func: string, asserts = () => {}) => {
  try {
    asserts();
    console.log(`${func} ✅`);
  } catch (e) {
    console.error(e);
  }
};

const assertEq = (have: any, want: any) => {
  const haveString = JSON.stringify(have);
  const wantString = JSON.stringify(want);
  if (haveString !== wantString) {
    throw new Error(`[${haveString}]: incorrect value. Want ${wantString}`);
  }
};

const assertNumber = (val: any) => {
  if (Number.isNaN(val)) {
    console.error(
      `[${val}]: incorrect type. Want Number but found ${typeof val}`,
    );
  }
};

const assertBoolean = (val: any) => {
  if (!(typeof val === "boolean")) {
    console.error(
      `[${val}]: incorrect type. Want Boolean but found ${typeof val}`,
    );
  }
};

const assertString = (val: any, allowEmpty: boolean = false) => {
  if (!(typeof val === "string") && !(val instanceof String)) {
    console.error(
      `[${val}]: incorrect type. Want String but found ${typeof val}`,
    );
  } else if (!allowEmpty && val.length === 0) {
    console.error(`[${val}]: found empty`);
  }
};

const assertArray = (val: any, allowEmpty: boolean = false) => {
  if (!Array.isArray(val)) {
    console.error(
      `[${val}]: incorrect type. Want Array but found ${typeof val}`,
    );
  } else if (!allowEmpty && val.length === 0) {
    console.error(`[${val}]: found empty`);
  }
};

const resetDevData = () =>
  sendMessageToBackground({
    type: SERVICE_TYPES.RESET_DEV_DATA,
  });
