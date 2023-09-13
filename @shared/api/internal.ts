import StellarSdk from "stellar-sdk";
import * as SorobanClient from "soroban-client";
import { DataProvider } from "@stellar/wallet-sdk";
import {
  getBalance,
  getDecimals,
  getName,
  getSymbol,
} from "@shared/helpers/soroban/token";
import {
  Account,
  AccountBalancesInterface,
  AccountHistoryInterface,
  Balances,
  HorizonOperation,
  Settings,
} from "./types";
import {
  MAINNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
  NetworkDetails,
  NETWORKS,
  SOROBAN_RPC_URLS
} from "../constants/stellar";
import { SERVICE_TYPES } from "../constants/services";
import { APPLICATION_STATE } from "../constants/applicationState";
import { WalletType } from "../constants/hardwareWallet";
import { sendMessageToBackground } from "./helpers/extensionMessaging";
import { getIconUrlFromIssuer } from "./helpers/getIconUrlFromIssuer";
import { getDomainFromIssuer } from "./helpers/getDomainFromIssuer";
import { stellarSdkServer } from "./helpers/stellarSdkServer";

const TRANSACTIONS_LIMIT = 100;

export const SendTxStatus: {
  [index: string]: SorobanClient.SorobanRpc.SendTransactionStatus;
} = {
  Pending: "PENDING",
  Duplicate: "DUPLICATE",
  Retry: "TRY_AGAIN_LATER",
  Error: "ERROR",
};

export const GetTxStatus: {
  [index: string]: SorobanClient.SorobanRpc.GetTransactionStatus;
} = {
  Success: "SUCCESS",
  NotFound: "NOT_FOUND",
  Failed: "FAILED",
};

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
  tokenIdList: string[];
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
  error: string;
}> => {
  let publicKey = "";
  let allAccounts = [] as Array<Account>;
  let hasPrivateKey = false;
  let error = "";

  try {
    ({
      allAccounts,
      publicKey,
      hasPrivateKey,
      error,
    } = await sendMessageToBackground({
      password,
      recoverMnemonic,
      type: SERVICE_TYPES.RECOVER_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  return { allAccounts, publicKey, hasPrivateKey, error };
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
    metadata: {
      allowHttp: networkUrl.startsWith("http://"),
    },
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
        const server = stellarSdkServer(networkUrl);
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
    const server = stellarSdkServer(networkUrl);

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

export const getAssetDomains = async ({
  balances,
  networkDetails,
}: {
  balances: Balances;
  networkDetails: NetworkDetails;
}) => {
  const assetDomains = {} as { [code: string]: string };

  if (balances) {
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
        const domain = await getDomainFromIssuer({ key, code, networkDetails });
        assetDomains[`${code}:${key}`] = domain;
      }
    }
  }
  return assetDomains;
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

export const signTransaction = async (): Promise<void> => {
  try {
    await sendMessageToBackground({
      type: SERVICE_TYPES.SIGN_TRANSACTION,
    });
  } catch (e) {
    console.error(e);
  }
};

export const signBlob = async (): Promise<void> => {
  try {
    await sendMessageToBackground({
      type: SERVICE_TYPES.SIGN_BLOB,
    });
  } catch (e) {
    console.error(e);
  }
};

export const signAuthEntry = async (): Promise<void> => {
  try {
    await sendMessageToBackground({
      type: SERVICE_TYPES.SIGN_AUTH_ENTRY,
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

export const signFreighterSorobanTransaction = async ({
  transactionXDR,
  network,
}: {
  transactionXDR: string;
  network: string;
}): Promise<{ signedTransaction: string }> => {
  const { signedTransaction, error } = await sendMessageToBackground({
    transactionXDR,
    network,
    type: SERVICE_TYPES.SIGN_FREIGHTER_SOROBAN_TRANSACTION,
  });

  if (error || !signedTransaction) {
    throw new Error(error);
  }

  return { signedTransaction };
};

export const submitFreighterTransaction = ({
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
  const server = stellarSdkServer(networkDetails.networkUrl);
  const submitTx = async (): Promise<any> => {
    let submittedTx;

    try {
      submittedTx = await server.submitTransaction(tx);
    } catch (e) {
      if (e.response.status === 504) {
        // in case of 504, keep retrying this tx until submission succeeds or we get a different error
        // https://developers.stellar.org/api/errors/http-status-codes/horizon-specific/timeout
        // https://developers.stellar.org/docs/encyclopedia/error-handling
        return submitTx();
      }
      throw e;
    }

    return submittedTx;
  };

  return submitTx();
};

export const submitFreighterSorobanTransaction = async ({
  signedXDR,
  networkDetails,
}: {
  signedXDR: string;
  networkDetails: NetworkDetails;
}) => {
  let tx = {} as SorobanClient.Transaction | SorobanClient.FeeBumpTransaction;

  try {
    tx = SorobanClient.TransactionBuilder.fromXDR(
      signedXDR,
      networkDetails.networkPassphrase,
    );
  } catch (e) {
    console.error(e);
  }

  if (!networkDetails.sorobanRpcUrl && networkDetails.network !== NETWORKS.FUTURENET) {
    throw new Error("soroban rpc not supported")
  }

  // TODO: after enough time has passed to assume most clients have ran
  // the migrateSorobanRpcUrlNetworkDetails migration, remove and use networkDetails.sorobanRpcUrl
  const serverUrl = !networkDetails.sorobanRpcUrl
    ? SOROBAN_RPC_URLS[NETWORKS.FUTURENET]!
    : networkDetails.sorobanRpcUrl

  const server = new SorobanClient.Server(serverUrl, {
    allowHttp: true,
  });

  let response = await server.sendTransaction(tx);

  if (response.errorResultXdr) {
    throw new Error(response.errorResultXdr);
  }

  if (response.status === SendTxStatus.Pending) {
    let txResponse = await server.getTransaction(response.hash);

    // Poll this until the status is not "NOT_FOUND"
    while (txResponse.status === GetTxStatus.NotFound) {
      // See if the transaction is complete
      // eslint-disable-next-line no-await-in-loop
      txResponse = await server.getTransaction(response.hash);
      // Wait a second
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return response;
    // eslint-disable-next-line no-else-return
  } else {
    throw new Error(
      `Unabled to submit transaction, status: ${response.status}`,
    );
  }
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
): Promise<{ mnemonicPhrase: string; error: string }> => {
  let response = { mnemonicPhrase: "", error: "" };
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

export const saveAllowList = async ({
  allowList,
}: {
  allowList: string[];
}): Promise<{ allowList: string[] }> => {
  let response = {
    allowList: [""],
  };

  try {
    response = await sendMessageToBackground({
      allowList,
      type: SERVICE_TYPES.SAVE_ALLOWLIST,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const saveSettings = async ({
  isDataSharingAllowed,
  isMemoValidationEnabled,
  isSafetyValidationEnabled,
  isValidatingSafeAssetsEnabled,
  isExperimentalModeEnabled,
}: {
  isDataSharingAllowed: boolean;
  isMemoValidationEnabled: boolean;
  isSafetyValidationEnabled: boolean;
  isValidatingSafeAssetsEnabled: boolean;
  isExperimentalModeEnabled: boolean;
}): Promise<Settings> => {
  let response = {
    allowList: [""],
    isDataSharingAllowed: false,
    networkDetails: MAINNET_NETWORK_DETAILS,
    networksList: DEFAULT_NETWORKS,
    isMemoValidationEnabled: true,
    isSafetyValidationEnabled: true,
    isValidatingSafeAssetsEnabled: true,
    isExperimentalModeEnabled: false,
    error: "",
  };

  try {
    response = await sendMessageToBackground({
      isDataSharingAllowed,
      isMemoValidationEnabled,
      isSafetyValidationEnabled,
      isValidatingSafeAssetsEnabled,
      isExperimentalModeEnabled,
      type: SERVICE_TYPES.SAVE_SETTINGS,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const changeNetwork = async (
  networkName: string,
): Promise<NetworkDetails> => {
  let networkDetails = MAINNET_NETWORK_DETAILS;

  try {
    ({ networkDetails } = await sendMessageToBackground({
      networkName,
      type: SERVICE_TYPES.CHANGE_NETWORK,
    }));
  } catch (e) {
    console.error(e);
  }

  return networkDetails;
};

export const addCustomNetwork = async (
  networkDetails: NetworkDetails,
): Promise<{
  networksList: NetworkDetails[];
}> => {
  let response = {
    error: "",
    networksList: [] as NetworkDetails[],
  };

  try {
    response = await sendMessageToBackground({
      networkDetails,
      type: SERVICE_TYPES.ADD_CUSTOM_NETWORK,
    });
  } catch (e) {
    console.error(e);
  }

  if (response.error) {
    throw new Error(response.error);
  }

  return response;
};

export const removeCustomNetwork = async (
  networkName: string,
): Promise<{
  networkDetails: NetworkDetails;
  networksList: NetworkDetails[];
}> => {
  let response = {
    networkDetails: MAINNET_NETWORK_DETAILS,
    networksList: [] as NetworkDetails[],
  };

  try {
    response = await sendMessageToBackground({
      networkName,
      type: SERVICE_TYPES.REMOVE_CUSTOM_NETWORK,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const editCustomNetwork = async ({
  networkDetails,
  networkIndex,
}: {
  networkDetails: NetworkDetails;
  networkIndex: number;
}): Promise<{
  networkDetails: NetworkDetails;
  networksList: NetworkDetails[];
}> => {
  let response = {
    networkDetails: MAINNET_NETWORK_DETAILS,
    networksList: [] as NetworkDetails[],
  };

  try {
    response = await sendMessageToBackground({
      networkDetails,
      networkIndex,
      type: SERVICE_TYPES.EDIT_CUSTOM_NETWORK,
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

export const getBlockedDomains = async () => {
  const resp = await sendMessageToBackground({
    type: SERVICE_TYPES.GET_BLOCKED_DOMAINS,
  });
  return resp;
};

export const getBlockedAccounts = async () => {
  const resp = await sendMessageToBackground({
    type: SERVICE_TYPES.GET_BLOCKED_ACCOUNTS,
  });
  return resp;
};

export const getSorobanTokenBalance = async (
  server: SorobanClient.Server,
  contractId: string,
  txBuilders: {
    // need a builder per operation, Soroban currently has single op transactions
    balance: SorobanClient.TransactionBuilder;
    name: SorobanClient.TransactionBuilder;
    decimals: SorobanClient.TransactionBuilder;
    symbol: SorobanClient.TransactionBuilder;
  },
  balanceParams: SorobanClient.xdr.ScVal[],
) => {
  // Right now we can only have 1 operation per TX in Soroban
  // for now we need to do 4 tx simulations to show 1 user balance. :(
  // TODO: figure out how to fetch ledger keys to do this more efficiently
  const decimals = await getDecimals(contractId, server, txBuilders.decimals);
  const name = await getName(contractId, server, txBuilders.name);
  const symbol = await getSymbol(contractId, server, txBuilders.symbol);
  const balance = await getBalance(
    contractId,
    balanceParams,
    server,
    txBuilders.balance,
  );

  return {
    balance,
    decimals,
    name,
    symbol,
  };
};

export const addTokenId = async (
  tokenId: string,
  network: SorobanClient.Networks
): Promise<{
  tokenIdList: string[];
}> => {
  let error = "";
  let tokenIdList = [] as string[];

  try {
    ({ tokenIdList, error } = await sendMessageToBackground({
      tokenId,
      network,
      type: SERVICE_TYPES.ADD_TOKEN_ID,
    }));
  } catch (e) {
    console.error(e);
  }

  if (error) {
    throw new Error(error);
  }

  return { tokenIdList };
};

export const getTokenIds = async (network: SorobanClient.Networks): Promise<string[]> => {
  const resp = await sendMessageToBackground({
    type: SERVICE_TYPES.GET_TOKEN_IDS,
    network
  });
  return resp.tokenIdList;
};
