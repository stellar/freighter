import omitBy from "lodash/omitBy";
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

export const makeAccountActive = (
  publicKey: string,
): Promise<{ publicKey: string; hasPrivateKey: boolean }> =>
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
}> => {
  let response = {
    publicKey: "",
    hasPrivateKey: false,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: [] as Array<Account>,
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

  let balances = null;
  let isFunded = null;
  let subentryCount = 0;

  try {
    ({ balances, subentryCount } = await dataProvider.fetchAccountDetails());
    // let's filter out liquidity pool shares until freighter and wallet-sdk support
    balances = omitBy(balances, (b: any) => b.liquidity_pool_id) as Balances;
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
        assetIcons[code] = icon;
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
      assetCode: code,
      iconUrl: null,
      type: SERVICE_TYPES.CACHE_ASSET_ICON,
    });
  } catch (e) {
    return assetIcons;
  }
  const icon = await getIconUrlFromIssuer({ key, code, networkDetails });
  newAssetIcons[code] = icon;
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
  networkUrl,
}: {
  signedXDR: string;
  networkUrl: string;
}) => {
  const server = new StellarSdk.Server(networkUrl);
  return await server.submitTransaction(signedXDR);
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
