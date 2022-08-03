import StellarSdk from "stellar-sdk";
import { DataProvider } from "@stellar/wallet-sdk";
import {
  Account,
  AccountBalancesInterface,
  AccountHistoryInterface,
  Balances,
  HorizonOperation,
  Settings,
} from "./types";
import { MAINNET_NETWORK_DETAILS, NetworkDetails } from "../helpers/stellar";
import { SERVICE_TYPES } from "../constants/services";
import { APPLICATION_STATE } from "../constants/applicationState";
import { WalletType } from "../constants/hardwareWallet";
import { sendMessageToBackground } from "./helpers/extensionMessaging";
import { getIconUrlFromIssuer } from "./helpers/getIconUrlFromIssuer";

const TRANSACTIONS_LIMIT = 100;

export const createAccount = async (
  password: string,
): Promise<{ publicKey: string; allAccounts: Array<Account> }> => {
  let publicKey = "";
  let allAccounts = [] as Array<Account>;

  try {
    ({ allAccounts, publicKey } = await sendMessageToBackground({
      password,
      type: SERVICE_TYPES.CREATE_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  return { allAccounts, publicKey };
};

export const fundAccount = async (publicKey: string): Promise<void> => {
  try {
    await sendMessageToBackground({
      publicKey,
      type: SERVICE_TYPES.FUND_ACCOUNT,
    });
  } catch (e) {
    console.error(e);
  }
};

export const addAccount = async (
  password: string,
): Promise<{
  publicKey: string;
  allAccounts: Array<Account>;
  hasPrivateKey: boolean;
}> => {
  let error = "";
  let publicKey = "";
  let allAccounts = [] as Array<Account>;
  let hasPrivateKey = false;

  try {
    ({
      allAccounts,
      error,
      publicKey,
      hasPrivateKey,
    } = await sendMessageToBackground({
      password,
      type: SERVICE_TYPES.ADD_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  if (error) {
    throw new Error(error);
  }

  return { allAccounts, publicKey, hasPrivateKey };
};

export const importAccount = async (
  password: string,
  privateKey: string,
): Promise<{
  publicKey: string;
  allAccounts: Array<Account>;
  hasPrivateKey: boolean;
}> => {
  let error = "";
  let publicKey = "";
  let allAccounts = [] as Array<Account>;
  let hasPrivateKey = false;

  try {
    ({
      allAccounts,
      publicKey,
      error,
      hasPrivateKey,
    } = await sendMessageToBackground({
      password,
      privateKey,
      type: SERVICE_TYPES.IMPORT_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  // @TODO: should this be universal? See asana ticket.
  if (error) {
    throw new Error(error);
  }

  return { allAccounts, publicKey, hasPrivateKey };
};

export const importHardwareWallet = async (
  publicKey: string,
  hardwareWalletType: WalletType,
  bipPath: string,
) => {
  let _publicKey = "";
  let allAccounts = [] as Array<Account>;
  let hasPrivateKey = false;
  let _bipPath = "";
  try {
    ({
      publicKey: _publicKey,
      allAccounts,
      hasPrivateKey,
      bipPath: _bipPath,
    } = await sendMessageToBackground({
      publicKey,
      hardwareWalletType,
      bipPath,
      type: SERVICE_TYPES.IMPORT_HARDWARE_WALLET,
    }));
  } catch (e) {
    console.log({ e });
  }
  return {
    allAccounts,
    publicKey: _publicKey,
    hasPrivateKey,
    bipPath: _bipPath,
  };
};

export const makeAccountActive = (
  publicKey: string,
): Promise<{ publicKey: string; hasPrivateKey: boolean; bipPath: string }> =>
  sendMessageToBackground({
    publicKey,
    type: SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE,
  });

export const updateAccountName = (
  accountName: string,
): Promise<{ allAccounts: Array<Account> }> =>
  sendMessageToBackground({
    accountName,
    type: SERVICE_TYPES.UPDATE_ACCOUNT_NAME,
  });

export const loadAccount = (): Promise<{
  hasPrivateKey: boolean;
  publicKey: string;
  applicationState: APPLICATION_STATE;
  allAccounts: Array<Account>;
  bipPath: string;
}> =>
  sendMessageToBackground({
    type: SERVICE_TYPES.LOAD_ACCOUNT,
  });

export const getMnemonicPhrase = async (): Promise<{
  mnemonicPhrase: string;
}> => {
  let response = { mnemonicPhrase: "" };

  try {
    response = await sendMessageToBackground({
      type: SERVICE_TYPES.GET_MNEMONIC_PHRASE,
    });
  } catch (e) {
    console.error(e);
  }
  return response;
};

export const confirmMnemonicPhrase = async (
  mnemonicPhraseToConfirm: string,
): Promise<{
  isCorrectPhrase: boolean;
  applicationState: APPLICATION_STATE;
}> => {
  let response = {
    isCorrectPhrase: false,
    applicationState: APPLICATION_STATE.PASSWORD_CREATED,
  };

  try {
    response = await sendMessageToBackground({
      mnemonicPhraseToConfirm,
      type: SERVICE_TYPES.CONFIRM_MNEMONIC_PHRASE,
    });
  } catch (e) {
    console.error(e);
  }
  return response;
};

export const recoverAccount = async (
  password: string,
  recoverMnemonic: string,
): Promise<{
  publicKey: string;
  allAccounts: Array<Account>;
  hasPrivateKey: boolean;
}> => {
  let publicKey = "";
  let allAccounts = [] as Array<Account>;
  let hasPrivateKey = false;

  try {
    ({ allAccounts, publicKey, hasPrivateKey } = await sendMessageToBackground({
      password,
      recoverMnemonic,
      type: SERVICE_TYPES.RECOVER_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  return { allAccounts, publicKey, hasPrivateKey };
};

export const confirmPassword = async (
  password: string,
): Promise<{
  publicKey: string;
  hasPrivateKey: boolean;
  applicationState: APPLICATION_STATE;
  allAccounts: Array<Account>;
  bipPath: string;
}> => {
  let response = {
    publicKey: "",
    hasPrivateKey: false,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: [] as Array<Account>,
    bipPath: "",
  };
  try {
    response = await sendMessageToBackground({
      password,
      type: SERVICE_TYPES.CONFIRM_PASSWORD,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const getAccountBalances = async ({
  publicKey,
  networkDetails,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
}): Promise<AccountBalancesInterface> => {
  const { networkUrl, networkPassphrase } = networkDetails;

  const dataProvider = new DataProvider({
    serverUrl: networkUrl,
    accountOrKey: publicKey,
    networkPassphrase,
  });

  let balances: any = null;
  let isFunded = null;
  let subentryCount = 0;

  try {
    const resp = await dataProvider.fetchAccountDetails();
    balances = resp.balances;
    subentryCount = resp.subentryCount;

    for (let i = 0; i < Object.keys(resp.balances).length; i++) {
      const k = Object.keys(resp.balances)[i];
      const v: any = resp.balances[k];
      if (v.liquidity_pool_id) {
        const server = new StellarSdk.Server(networkUrl);
        const lp = await server
          .liquidityPools()
          .liquidityPoolId(v.liquidity_pool_id)
          .call();
        balances[k] = {
          ...balances[k],
          liquidityPoolId: v.liquidity_pool_id,
          reserves: lp.reserves,
        };
        delete balances[k].liquidity_pool_id;
      }
    }
    isFunded = true;
  } catch (e) {
    console.error(e);
    return {
      balances,
      isFunded: false,
      subentryCount,
    };
  }

  return {
    balances,
    isFunded,
    subentryCount,
  };
};

export const getAccountHistory = async ({
  publicKey,
  networkDetails,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
}): Promise<AccountHistoryInterface> => {
  const { networkUrl } = networkDetails;

  let operations = [] as Array<HorizonOperation>;

  try {
    const server = new StellarSdk.Server(networkUrl);
    const operationsData = await server
      .operations()
      .forAccount(publicKey)
      .order("desc")
      .join("transactions")
      .limit(TRANSACTIONS_LIMIT)
      .call();

    operations = operationsData.records || [];
  } catch (e) {
    console.error(e);
  }

  return {
    operations,
  };
};

export const getAssetIcons = async ({
  balances,
  networkDetails,
}: {
  balances: Balances;
  networkDetails: NetworkDetails;
}) => {
  const assetIcons = {} as { [code: string]: string };

  if (balances) {
    let icon = "";
    const balanceValues = Object.values(balances);
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < balanceValues.length; i++) {
      const { token } = balanceValues[i];
      if (token && "issuer" in token) {
        const {
          issuer: { key },
          code,
        } = token;
        // eslint-disable-next-line no-await-in-loop
        icon = await getIconUrlFromIssuer({ key, code, networkDetails });
        assetIcons[`${code}:${key}`] = icon;
      }
    }
  }
  return assetIcons;
};

export const retryAssetIcon = async ({
  key,
  code,
  assetIcons,
  networkDetails,
}: {
  key: string;
  code: string;
  assetIcons: { [code: string]: string };
  networkDetails: NetworkDetails;
}) => {
  const newAssetIcons = { ...assetIcons };
  try {
    await sendMessageToBackground({
      assetCanonical: `${code}:${key}`,
      iconUrl: null,
      type: SERVICE_TYPES.CACHE_ASSET_ICON,
    });
  } catch (e) {
    return assetIcons;
  }
  const icon = await getIconUrlFromIssuer({ key, code, networkDetails });
  newAssetIcons[`${code}:${key}`] = icon;
  return newAssetIcons;
};

export const rejectAccess = async (): Promise<void> => {
  try {
    await sendMessageToBackground({
      type: SERVICE_TYPES.REJECT_ACCESS,
    });
  } catch (e) {
    console.error(e);
  }
};

export const grantAccess = async (url: string): Promise<void> => {
  try {
    await sendMessageToBackground({
      url,
      type: SERVICE_TYPES.GRANT_ACCESS,
    });
  } catch (e) {
    console.error(e);
  }
};

export const handleSignedHwTransaction = async ({
  signedTransaction,
}: {
  signedTransaction: string;
}): Promise<void> => {
  try {
    await sendMessageToBackground({
      signedTransaction,
      type: SERVICE_TYPES.HANDLE_SIGNED_HW_TRANSACTION,
    });
  } catch (e) {
    console.error(e);
  }
};

export const signTransaction = async ({
  transaction,
}: {
  transaction: {};
}): Promise<void> => {
  try {
    await sendMessageToBackground({
      transaction,
      type: SERVICE_TYPES.SIGN_TRANSACTION,
    });
  } catch (e) {
    console.error(e);
  }
};

export const signFreighterTransaction = async ({
  transactionXDR,
  network,
}: {
  transactionXDR: string;
  network: string;
}): Promise<{ signedTransaction: string }> => {
  const { signedTransaction, error } = await sendMessageToBackground({
    transactionXDR,
    network,
    type: SERVICE_TYPES.SIGN_FREIGHTER_TRANSACTION,
  });

  if (error || !signedTransaction) {
    throw new Error(error);
  }

  return { signedTransaction };
};

export const submitFreighterTransaction = async ({
  signedXDR,
  networkDetails,
}: {
  signedXDR: string;
  networkDetails: NetworkDetails;
}) => {
  const tx = StellarSdk.TransactionBuilder.fromXDR(
    signedXDR,
    networkDetails.networkPassphrase,
  );
  const server = new StellarSdk.Server(networkDetails.networkUrl);
  return await server.submitTransaction(tx);
};

export const addRecentAddress = async ({
  publicKey,
}: {
  publicKey: string;
}): Promise<{ recentAddresses: Array<string> }> => {
  return await sendMessageToBackground({
    publicKey,
    type: SERVICE_TYPES.ADD_RECENT_ADDRESS,
  });
};

export const loadRecentAddresses = async (): Promise<{
  recentAddresses: Array<string>;
}> => {
  return await sendMessageToBackground({
    type: SERVICE_TYPES.LOAD_RECENT_ADDRESSES,
  });
};

export const signOut = async (): Promise<{
  publicKey: string;
  applicationState: APPLICATION_STATE;
}> => {
  let response = {
    publicKey: "",
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  };
  try {
    response = await sendMessageToBackground({
      type: SERVICE_TYPES.SIGN_OUT,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const showBackupPhrase = async (
  password: string,
): Promise<{ error: string }> => {
  let response = { error: "" };
  try {
    response = await sendMessageToBackground({
      password,
      type: SERVICE_TYPES.SHOW_BACKUP_PHRASE,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const saveSettings = async ({
  isDataSharingAllowed,
  isTestnet,
  isMemoValidationEnabled,
  isSafetyValidationEnabled,
}: {
  isDataSharingAllowed: boolean;
  isTestnet: boolean;
  isMemoValidationEnabled: boolean;
  isSafetyValidationEnabled: boolean;
}): Promise<Settings> => {
  let response = {
    isDataSharingAllowed: false,
    networkDetails: MAINNET_NETWORK_DETAILS,
    isMemoValidationEnabled: true,
    isSafetyValidationEnabled: true,
  };

  try {
    response = await sendMessageToBackground({
      isDataSharingAllowed,
      isTestnet,
      isMemoValidationEnabled,
      isSafetyValidationEnabled,
      type: SERVICE_TYPES.SAVE_SETTINGS,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const loadSettings = (): Promise<Settings> =>
  sendMessageToBackground({
    type: SERVICE_TYPES.LOAD_SETTINGS,
  });
