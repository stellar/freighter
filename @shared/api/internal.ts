import { captureException } from "@sentry/browser";
import {
  Address,
  SorobanRpc,
  Networks,
  Horizon,
  FeeBumpTransaction,
  Transaction,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";
import BigNumber from "bignumber.js";
import { INDEXER_URL } from "@shared/constants/mercury";
import { AssetsListItem, AssetsLists } from "@shared/constants/soroban/token";
import {
  getBalance,
  getDecimals,
  getName,
  getSymbol,
} from "@shared/helpers/soroban/token";
import {
  getSdk,
  isCustomNetwork,
  makeDisplayableBalances,
} from "@shared/helpers/stellar";
import {
  buildSorobanServer,
  getNewTxBuilder,
} from "@shared/helpers/soroban/server";
import {
  getContractSpec as getContractSpecHelper,
  getIsTokenSpec as getIsTokenSpecHelper,
} from "./helpers/soroban";
import {
  Account,
  AccountBalancesInterface,
  BalanceToMigrate,
  Balances,
  MigratableAccount,
  MigratedAccount,
  Settings,
  IndexerSettings,
  SettingsState,
  ExperimentalFeatures,
} from "./types";
import {
  MAINNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
  NetworkDetails,
  NETWORKS,
} from "../constants/stellar";
import { SERVICE_TYPES } from "../constants/services";
import { SorobanRpcNotSupportedError } from "../constants/errors";
import { APPLICATION_STATE } from "../constants/applicationState";
import { WalletType } from "../constants/hardwareWallet";
import { sendMessageToBackground } from "./helpers/extensionMessaging";
import { getIconUrlFromIssuer } from "./helpers/getIconUrlFromIssuer";
import { getDomainFromIssuer } from "./helpers/getDomainFromIssuer";
import { stellarSdkServer, submitTx } from "./helpers/stellarSdkServer";

const TRANSACTIONS_LIMIT = 100;

export const SendTxStatus: {
  [index: string]: SorobanRpc.Api.SendTransactionStatus;
} = {
  Pending: "PENDING",
  Duplicate: "DUPLICATE",
  Retry: "TRY_AGAIN_LATER",
  Error: "ERROR",
};

export const GetTxStatus: {
  [index: string]: SorobanRpc.Api.GetTransactionStatus;
} = {
  Success: SorobanRpc.Api.GetTransactionStatus.SUCCESS,
  NotFound: SorobanRpc.Api.GetTransactionStatus.NOT_FOUND,
  Failed: SorobanRpc.Api.GetTransactionStatus.FAILED,
};

export const createAccount = async (
  password: string,
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
      type: SERVICE_TYPES.CREATE_ACCOUNT,
    }));
  } catch (e) {
    console.error(e);
  }

  return { allAccounts, publicKey, hasPrivateKey };
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

export const addAccount = async (): Promise<{
  publicKey: string;
  allAccounts: Array<Account>;
  hasPrivateKey: boolean;
}> => {
  let error = "";
  let publicKey = "";
  let allAccounts = [] as Array<Account>;
  let hasPrivateKey = false;

  try {
    ({ allAccounts, error, publicKey, hasPrivateKey } =
      await sendMessageToBackground({
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
    ({ allAccounts, publicKey, error, hasPrivateKey } =
      await sendMessageToBackground({
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

export const getMigratedMnemonicPhrase = async (): Promise<{
  mnemonicPhrase: string;
}> => {
  let response = { mnemonicPhrase: "" };

  try {
    response = await sendMessageToBackground({
      type: SERVICE_TYPES.GET_MIGRATED_MNEMONIC_PHRASE,
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

export const confirmMigratedMnemonicPhrase = async (
  mnemonicPhraseToConfirm: string,
): Promise<{
  isCorrectPhrase: boolean;
}> => {
  let response = {
    isCorrectPhrase: false,
  };

  try {
    response = await sendMessageToBackground({
      mnemonicPhraseToConfirm,
      type: SERVICE_TYPES.CONFIRM_MIGRATED_MNEMONIC_PHRASE,
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
    ({ allAccounts, publicKey, hasPrivateKey, error } =
      await sendMessageToBackground({
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

export const getAccountInfo = async ({
  publicKey,
  networkDetails,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
}) => {
  const { networkUrl } = networkDetails;

  const server = new Horizon.Server(networkUrl);

  let account;
  let signerArr = { records: [] as Horizon.ServerApi.AccountRecord[] };

  try {
    account = await server.loadAccount(publicKey);
    signerArr = await server.accounts().forSigner(publicKey).call();
  } catch (e) {
    console.error(e);
  }

  return {
    account,
    isSigner: signerArr.records.length > 1,
  };
};

export const getMigratableAccounts = async () => {
  let migratableAccounts: MigratableAccount[] = [];

  try {
    ({ migratableAccounts } = await sendMessageToBackground({
      type: SERVICE_TYPES.GET_MIGRATABLE_ACCOUNTS,
    }));
  } catch (e) {
    console.error(e);
  }

  return { migratableAccounts };
};

export const migrateAccounts = async ({
  balancesToMigrate,
  isMergeSelected,
  recommendedFee,
}: {
  balancesToMigrate: BalanceToMigrate[];
  isMergeSelected: boolean;
  recommendedFee: string;
}): Promise<{
  publicKey: string;
  migratedAccounts: Array<MigratedAccount>;
  allAccounts: Array<Account>;
  hasPrivateKey: boolean;
  error: string;
}> => {
  let publicKey = "";
  let migratedAccounts = [] as Array<MigratedAccount>;
  let allAccounts = [] as Array<Account>;
  let hasPrivateKey = false;
  let error = "";

  try {
    ({ migratedAccounts, allAccounts, publicKey, hasPrivateKey, error } =
      await sendMessageToBackground({
        balancesToMigrate,
        isMergeSelected,
        recommendedFee,
        type: SERVICE_TYPES.MIGRATE_ACCOUNTS,
      }));
  } catch (e) {
    console.error(e);
  }

  return { migratedAccounts, allAccounts, publicKey, hasPrivateKey, error };
};

export const getAccountIndexerBalances = async (
  publicKey: string,
  networkDetails: NetworkDetails,
): Promise<AccountBalancesInterface> => {
  const contractIds = await getTokenIds(networkDetails.network as NETWORKS);
  const url = new URL(`${INDEXER_URL}/account-balances/${publicKey}`);
  url.searchParams.append("network", networkDetails.network);
  for (const id of contractIds) {
    url.searchParams.append("contract_ids", id);
  }
  const response = await fetch(url.href);
  const data = (await response.json()) as AccountBalancesInterface;
  if (!response.ok) {
    const _err = JSON.stringify(data);
    captureException(
      `Failed to fetch account balances - ${response.status}: ${response.statusText}`,
    );
    throw new Error(_err);
  }

  if ("error" in data && (data?.error?.horizon || data?.error?.soroban)) {
    captureException(
      `Failed to fetch account balances - ${response.status}: ${response.statusText}`,
    );
  }

  const formattedBalances = {} as NonNullable<
    AccountBalancesInterface["balances"]
  >;
  const balanceIds = [] as string[];
  for (const balanceKey of Object.keys(data.balances || {})) {
    const balance = data.balances![balanceKey];
    formattedBalances[balanceKey] = {
      ...balance,
      available: new BigNumber(balance.available),
      total: new BigNumber(balance.total),
    };
    // track token IDs that come back from the server in order to get
    // the difference between contractIds set in the client and balances returned from server.
    const [_, assetId] = balanceKey.split(":");
    if (contractIds.includes(assetId)) {
      balanceIds.push(assetId);
    }
  }
  return {
    ...data,
    balances: formattedBalances,
  };
};

export const getSorobanTokenBalance = async (
  server: SorobanRpc.Server,
  contractId: string,
  txBuilders: {
    // need a builder per operation, Soroban currently has single op transactions
    balance: TransactionBuilder;
    name: TransactionBuilder;
    decimals: TransactionBuilder;
    symbol: TransactionBuilder;
  },
  balanceParams: xdr.ScVal[],
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

export const getAccountBalancesStandalone = async ({
  publicKey,
  networkDetails,
  isMainnet,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
  isMainnet: boolean;
}) => {
  const { network, networkUrl, networkPassphrase } = networkDetails;

  let balances = null;
  let isFunded = null;
  let subentryCount = 0;

  try {
    const server = stellarSdkServer(networkUrl, networkPassphrase);
    const accountSummary = await server.accounts().accountId(publicKey).call();

    const displayableBalances = await makeDisplayableBalances(
      accountSummary,
      isMainnet,
    );
    const sponsor = accountSummary.sponsor
      ? { sponsor: accountSummary.sponsor }
      : {};
    const resp = {
      ...sponsor,
      id: accountSummary.id,
      subentryCount: accountSummary.subentry_count,
      sponsoredCount: accountSummary.num_sponsored,
      sponsoringCount: accountSummary.num_sponsoring,
      inflationDestination: accountSummary.inflation_destination,
      thresholds: accountSummary.thresholds,
      signers: accountSummary.signers,
      flags: accountSummary.flags,
      sequenceNumber: accountSummary.sequence,
      balances: displayableBalances,
    };

    balances = resp.balances;
    subentryCount = resp.subentryCount;

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < Object.keys(resp.balances).length; i++) {
      const k = Object.keys(resp.balances)[i];
      const v = resp.balances[k];
      if (v.liquidityPoolId) {
        const server = stellarSdkServer(networkUrl, networkPassphrase);
        // eslint-disable-next-line no-await-in-loop
        const lp = await server
          .liquidityPools()
          .liquidityPoolId(v.liquidityPoolId)
          .call();
        balances[k] = {
          ...balances[k],
          liquidityPoolId: v.liquidityPoolId,
          reserves: lp.reserves,
        };
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

  // Get token balances to combine with classic balances
  const tokenIdList = await getTokenIds(network as NETWORKS);

  const tokenBalances = {} as any;

  if (tokenIdList.length) {
    if (!networkDetails.sorobanRpcUrl) {
      throw new SorobanRpcNotSupportedError();
    }

    const server = buildSorobanServer(
      networkDetails.sorobanRpcUrl,
      networkDetails.networkPassphrase,
    );

    const params = [new Address(publicKey).toScVal()];

    for (let i = 0; i < tokenIdList.length; i += 1) {
      const tokenId = tokenIdList[i];
      /*
        Right now, Soroban transactions only support 1 operation per tx
        so we need a builder per value from the contract,
        once/if multi-op transactions are supported this can send
        1 tx with an operation for each value.
      */
      try {
        /* eslint-disable no-await-in-loop */
        const { balance, symbol, ...rest } = await getSorobanTokenBalance(
          server,
          tokenId,
          {
            balance: await getNewTxBuilder(publicKey, networkDetails, server),
            name: await getNewTxBuilder(publicKey, networkDetails, server),
            decimals: await getNewTxBuilder(publicKey, networkDetails, server),
            symbol: await getNewTxBuilder(publicKey, networkDetails, server),
          },
          params,
        );
        /* eslint-enable no-await-in-loop */

        const total = new BigNumber(balance);

        tokenBalances[`${symbol}:${tokenId}`] = {
          token: { issuer: { key: tokenId }, code: symbol },
          contractId: tokenId,
          total,
          symbol,
          ...rest,
        };
      } catch (e) {
        console.error(`Token "${tokenId}" missing data on RPC server`);
      }
    }
  }

  return {
    balances: { ...balances, ...tokenBalances },
    isFunded,
    subentryCount,
  };
};

export const getAccountHistoryStandalone = async ({
  publicKey,
  networkDetails,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
}): Promise<Horizon.ServerApi.OperationRecord[]> => {
  const { networkUrl, networkPassphrase } = networkDetails;

  let operations = [] as Horizon.ServerApi.OperationRecord[];

  try {
    const server = stellarSdkServer(networkUrl, networkPassphrase);

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

  return operations;
};

export const getIndexerAccountHistory = async ({
  publicKey,
  networkDetails,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
}): Promise<Horizon.ServerApi.OperationRecord[]> => {
  try {
    const url = new URL(
      `${INDEXER_URL}/account-history/${publicKey}?network=${networkDetails.network}`,
    );
    const response = await fetch(url.href);

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data);
    }

    return data;
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const getContractSpec = async ({
  contractId,
  networkDetails,
}: {
  contractId: string;
  networkDetails: NetworkDetails;
}): Promise<Record<string, any>> => {
  if (isCustomNetwork(networkDetails)) {
    const data = await getContractSpecHelper(
      contractId,
      networkDetails.networkUrl,
    );
    return data;
  }
  const url = new URL(
    `${INDEXER_URL}/contract-spec/${contractId}?network=${networkDetails.network}`,
  );
  const response = await fetch(url.href);
  const { data, error } = await response.json();
  if (!response.ok) {
    throw new Error(error);
  }

  return data;
};

export const getIsTokenSpec = async ({
  contractId,
  networkDetails,
}: {
  contractId: string;
  networkDetails: NetworkDetails;
}): Promise<boolean> => {
  if (isCustomNetwork(networkDetails)) {
    const data = await getIsTokenSpecHelper(
      contractId,
      networkDetails.networkUrl,
    );
    return data;
  }
  const url = new URL(
    `${INDEXER_URL}/token-spec/${contractId}?network=${networkDetails.network}`,
  );
  const response = await fetch(url.href);
  const { data, error } = await response.json();
  if (!response.ok) {
    throw new Error(error);
  }

  return data;
};

export const getAccountHistory = async (
  publicKey: string,
  networkDetails: NetworkDetails,
) => {
  if (isCustomNetwork(networkDetails)) {
    return await getAccountHistoryStandalone({
      publicKey,
      networkDetails,
    });
  }
  return await getIndexerAccountHistory({
    publicKey,
    networkDetails,
  });
};

export const getTokenDetails = async ({
  contractId,
  publicKey,
  networkDetails,
}: {
  contractId: string;
  publicKey: string;
  networkDetails: NetworkDetails;
}): Promise<{ name: string; decimals: number; symbol: string } | null> => {
  try {
    if (isCustomNetwork(networkDetails)) {
      if (!networkDetails.sorobanRpcUrl) {
        throw new SorobanRpcNotSupportedError();
      }

      // You need one Tx Builder per call in Soroban right now
      const server = buildSorobanServer(
        networkDetails.sorobanRpcUrl,
        networkDetails.networkPassphrase,
      );
      const name = await getName(
        contractId,
        server,
        await getNewTxBuilder(publicKey, networkDetails, server),
      );
      const symbol = await getSymbol(
        contractId,
        server,
        await getNewTxBuilder(publicKey, networkDetails, server),
      );
      const decimals = await getDecimals(
        contractId,
        server,
        await getNewTxBuilder(publicKey, networkDetails, server),
      );

      return {
        name,
        symbol,
        decimals,
      };
    }

    const response = await fetch(
      `${INDEXER_URL}/token-details/${contractId}?pub_key=${publicKey}&network=${networkDetails.network}`,
    );
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data);
    }
    return data;
  } catch (error) {
    console.error(error);
    captureException(
      `Failed to fetch token details - ${JSON.stringify(
        error,
      )} - ${contractId} - ${networkDetails.network}`,
    );
    return null;
  }
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
  const Sdk = getSdk(networkDetails.networkPassphrase);
  const tx = Sdk.TransactionBuilder.fromXDR(
    signedXDR,
    networkDetails.networkPassphrase,
  );
  const server = stellarSdkServer(
    networkDetails.networkUrl,
    networkDetails.networkPassphrase,
  );

  return submitTx({ server, tx });
};

export const submitFreighterSorobanTransaction = async ({
  signedXDR,
  networkDetails,
}: {
  signedXDR: string;
  networkDetails: NetworkDetails;
}) => {
  let tx = {} as Transaction | FeeBumpTransaction;
  const Sdk = getSdk(networkDetails.networkPassphrase);
  try {
    tx = Sdk.TransactionBuilder.fromXDR(
      signedXDR,
      networkDetails.networkPassphrase,
    );
  } catch (e) {
    console.error(e);
  }

  if (!networkDetails.sorobanRpcUrl) {
    throw new SorobanRpcNotSupportedError();
  }

  const serverUrl = networkDetails.sorobanRpcUrl || "";

  const server = new Sdk.SorobanRpc.Server(serverUrl, {
    allowHttp: !serverUrl.startsWith("https"),
  });

  const response = await server.sendTransaction(tx);

  if (response.errorResult) {
    throw new Error(response.errorResult.result().toString());
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
  isHideDustEnabled,
}: {
  isDataSharingAllowed: boolean;
  isMemoValidationEnabled: boolean;
  isHideDustEnabled: boolean;
}): Promise<Settings & IndexerSettings> => {
  let response = {
    allowList: [""],
    isDataSharingAllowed: false,
    networkDetails: MAINNET_NETWORK_DETAILS,
    networksList: DEFAULT_NETWORKS,
    isMemoValidationEnabled: true,
    isRpcHealthy: false,
    userNotification: { enabled: false, message: "" },
    settingsState: SettingsState.IDLE,
    isSorobanPublicEnabled: false,
    isNonSSLEnabled: false,
    isBlockaidAnnounced: false,
    isHideDustEnabled: true,
    error: "",
  };

  try {
    response = await sendMessageToBackground({
      isDataSharingAllowed,
      isMemoValidationEnabled,
      isHideDustEnabled,
      type: SERVICE_TYPES.SAVE_SETTINGS,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const saveExperimentalFeatures = async ({
  isExperimentalModeEnabled,
  isHashSigningEnabled,
  isNonSSLEnabled,
}: {
  isExperimentalModeEnabled: boolean;
  isHashSigningEnabled: boolean;
  isNonSSLEnabled: boolean;
}): Promise<ExperimentalFeatures> => {
  let response = {
    isExperimentalModeEnabled: false,
    isHashSigningEnabled: false,
    isNonSSLEnabled: false,
    networkDetails: MAINNET_NETWORK_DETAILS,
    networksList: DEFAULT_NETWORKS,
    experimentalFeaturesState: SettingsState.IDLE,
    error: "",
  };

  try {
    response = await sendMessageToBackground({
      isExperimentalModeEnabled,
      isHashSigningEnabled,
      isNonSSLEnabled,
      type: SERVICE_TYPES.SAVE_EXPERIMENTAL_FEATURES,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const changeNetwork = async (
  networkName: string,
): Promise<{ networkDetails: NetworkDetails; isRpcHealthy: boolean }> => {
  let networkDetails = MAINNET_NETWORK_DETAILS;
  let isRpcHealthy = false;

  try {
    ({ networkDetails, isRpcHealthy } = await sendMessageToBackground({
      networkName,
      type: SERVICE_TYPES.CHANGE_NETWORK,
    }));
  } catch (e) {
    console.error(e);
  }

  return { networkDetails, isRpcHealthy };
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

export const loadSettings = (): Promise<
  Settings &
    IndexerSettings &
    ExperimentalFeatures & { assetsLists: AssetsLists }
> =>
  sendMessageToBackground({
    type: SERVICE_TYPES.LOAD_SETTINGS,
  });

export const getMemoRequiredAccounts = async () => {
  const resp = await sendMessageToBackground({
    type: SERVICE_TYPES.GET_MEMO_REQUIRED_ACCOUNTS,
  });
  return resp;
};

export const addTokenId = async (
  publicKey: string,
  tokenId: string,
  network: Networks,
): Promise<{
  tokenIdList: string[];
}> => {
  let error = "";
  let tokenIdList = [] as string[];

  try {
    ({ tokenIdList, error } = await sendMessageToBackground({
      publicKey,
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

export const getTokenIds = async (network: NETWORKS): Promise<string[]> => {
  const resp = await sendMessageToBackground({
    type: SERVICE_TYPES.GET_TOKEN_IDS,
    network,
  });
  return resp.tokenIdList;
};

export const removeTokenId = async ({
  contractId,
  network,
}: {
  contractId: string;
  network: NETWORKS;
}): Promise<string[]> => {
  const resp = await sendMessageToBackground({
    type: SERVICE_TYPES.REMOVE_TOKEN_ID,
    contractId,
    network,
  });
  return resp.tokenIdList;
};

export const addAssetsList = async ({
  assetsList,
  network,
}: {
  assetsList: AssetsListItem;
  network: NETWORKS;
}) => {
  let response = {
    error: "",
    assetsLists: {} as AssetsLists,
  };

  response = await sendMessageToBackground({
    type: SERVICE_TYPES.ADD_ASSETS_LIST,
    assetsList,
    network,
  });

  return { assetsLists: response.assetsLists, error: response.error };
};

export const modifyAssetsList = async ({
  assetsList,
  network,
  isDeleteAssetsList,
}: {
  assetsList: AssetsListItem;
  network: NETWORKS;
  isDeleteAssetsList: boolean;
}) => {
  let response = {
    error: "",
    assetsLists: {} as AssetsLists,
  };

  response = await sendMessageToBackground({
    type: SERVICE_TYPES.MODIFY_ASSETS_LIST,
    assetsList,
    network,
    isDeleteAssetsList,
  });

  return { assetsLists: response.assetsLists, error: response.error };
};

export const simulateTokenTransfer = async (args: {
  address: string;
  publicKey: string;
  memo: string;
  params: {
    publicKey: string;
    destination: string;
    amount: number;
  };
  networkDetails: NetworkDetails;
  transactionFee: string;
}) => {
  const { address, publicKey, memo, params, networkDetails } = args;
  const options = {
    method: "POST",
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      pub_key: publicKey,
      memo,
      params,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      network_url: networkDetails.sorobanRpcUrl,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      network_passphrase: networkDetails.networkPassphrase,
    }),
  };
  const res = await fetch(`${INDEXER_URL}/simulate-token-transfer`, options);
  const response = await res.json();
  return {
    ok: res.ok,
    response,
  };
};

export const saveIsBlockaidAnnounced = async ({
  isBlockaidAnnounced,
}: {
  isBlockaidAnnounced: boolean;
}) => {
  let response = {
    error: "",
    isBlockaidAnnounced: false,
  };

  response = await sendMessageToBackground({
    type: SERVICE_TYPES.SAVE_IS_BLOCKAID_ANNOUNCED,
    isBlockaidAnnounced,
  });

  return {
    isBlockaidAnnounced: response.isBlockaidAnnounced,
    error: response.error,
  };
};
