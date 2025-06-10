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
  XdrLargeInt,
} from "stellar-sdk";
import BigNumber from "bignumber.js";
import { INDEXER_URL, INDEXER_V2_URL } from "@shared/constants/mercury";
import {
  AssetListResponse,
  AssetsListItem,
  AssetsLists,
} from "@shared/constants/soroban/asset-list";
import {
  getBalance,
  getDecimals,
  getName,
  getSymbol,
  transfer,
} from "@shared/helpers/soroban/token";
import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  getSdk,
  isCustomNetwork,
  makeDisplayableBalances,
  xlmToStroop,
} from "@shared/helpers/stellar";
import {
  buildSorobanServer,
  getNewTxBuilder,
} from "@shared/helpers/soroban/server";
import {
  getContractSpec as getContractSpecHelper,
  getIsTokenSpec as getIsTokenSpecHelper,
  isContractId,
} from "./helpers/soroban";
import {
  Account,
  AllowList,
  BalanceToMigrate,
  MigratableAccount,
  MigratedAccount,
  Settings,
  IndexerSettings,
  SettingsState,
  ExperimentalFeatures,
  IssuerKey,
  AssetVisibility,
  ApiTokenPrices,
} from "./types";
import {
  AccountBalancesInterface,
  BalanceMap,
  Balances,
} from "./types/backend-api";
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
import { getIconFromTokenLists } from "./helpers/getIconFromTokenList";

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

export const DEFAULT_ALLOW_LIST: AllowList = {
  [NETWORKS.PUBLIC]: {},
  [NETWORKS.TESTNET]: {},
  [NETWORKS.FUTURENET]: {},
};

export const createAccount = async ({
  password,
  isOverwritingAccount = false,
}: {
  password: string;
  isOverwritingAccount: boolean;
}): Promise<{
  publicKey: string;
  allAccounts: Array<Account>;
  hasPrivateKey: boolean;
}> => {
  let publicKey = "";
  let allAccounts = [] as Array<Account>;
  let hasPrivateKey = false;
  let error = "";

  try {
    ({ allAccounts, publicKey, hasPrivateKey, error } =
      await sendMessageToBackground({
        activePublicKey: null,
        password,
        isOverwritingAccount,
        type: SERVICE_TYPES.CREATE_ACCOUNT,
      }));
  } catch (e) {
    console.error(e);
  }

  if (error) {
    throw new Error(error);
  }

  return { allAccounts, publicKey, hasPrivateKey };
};

export const fundAccount = async ({
  activePublicKey,
  publicKey,
}: {
  activePublicKey: string;
  publicKey: string;
}): Promise<void> => {
  try {
    await sendMessageToBackground({
      activePublicKey,
      publicKey,
      type: SERVICE_TYPES.FUND_ACCOUNT,
    });
  } catch (e) {
    console.error(e);
  }
};

export const addAccount = async ({
  activePublicKey,
  password,
}: {
  activePublicKey: string;
  password: string;
}): Promise<{
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
        activePublicKey,
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

export const importAccount = async ({
  password,
  privateKey,
  activePublicKey,
}: {
  password: string;
  privateKey: string;
  activePublicKey: string;
}): Promise<{
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
        activePublicKey,
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

export const importHardwareWallet = async ({
  activePublicKey,
  publicKey,
  hardwareWalletType,
  bipPath,
}: {
  activePublicKey: string;
  publicKey: string;
  hardwareWalletType: WalletType;
  bipPath: string;
}) => {
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
      activePublicKey,
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

export const makeAccountActive = ({
  activePublicKey,
  publicKey,
}: {
  activePublicKey: string;
  publicKey: string;
}): Promise<{ publicKey: string; hasPrivateKey: boolean; bipPath: string }> =>
  sendMessageToBackground({
    activePublicKey,
    publicKey,
    type: SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE,
  });

export const updateAccountName = ({
  activePublicKey,
  accountName,
}: {
  activePublicKey: string;
  accountName: string;
}): Promise<{ allAccounts: Array<Account> }> =>
  sendMessageToBackground({
    activePublicKey,
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
    activePublicKey: null,
    type: SERVICE_TYPES.LOAD_ACCOUNT,
  });

export const getMnemonicPhrase = async (): Promise<{
  mnemonicPhrase: string;
}> => {
  let response = { mnemonicPhrase: "" };

  try {
    response = await sendMessageToBackground({
      activePublicKey: null,
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
      activePublicKey: null,
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
      activePublicKey: null,
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
      activePublicKey: null,
      mnemonicPhraseToConfirm,
      type: SERVICE_TYPES.CONFIRM_MIGRATED_MNEMONIC_PHRASE,
    });
  } catch (e) {
    console.error(e);
  }
  return response;
};

export const recoverAccount = async ({
  password,
  recoverMnemonic,
  isOverwritingAccount = false,
}: {
  password: string;
  recoverMnemonic: string;
  isOverwritingAccount: boolean;
}): Promise<{
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
        activePublicKey: null,
        password,
        recoverMnemonic,
        isOverwritingAccount,
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
      activePublicKey: null,
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
      activePublicKey: null,
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
        activePublicKey: null,
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

export const getAccountIndexerBalances = async ({
  publicKey,
  networkDetails,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
}): Promise<AccountBalancesInterface> => {
  const contractIds = await getTokenIds({
    activePublicKey: publicKey,
    network: networkDetails.network as NETWORKS,
  });
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

export const getTokenPrices = async (tokens: string[]) => {
  // NOTE: API does not accept LP IDs or custom tokens
  const filteredTokens = tokens.filter((tokenId) => {
    const asset = getAssetFromCanonical(tokenId);
    return !tokenId.includes(":lp") && !isContractId(asset.issuer);
  });
  const url = new URL(`${INDEXER_URL}/token-prices`);
  const options = {
    method: "POST",
    headers: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ tokens: filteredTokens }),
  };
  const response = await fetch(url.href, options);
  const parsedResponse = (await response.json()) as { data: ApiTokenPrices };

  if (!response.ok) {
    const _err = JSON.stringify(parsedResponse);
    captureException(
      `Failed to fetch token prices - ${response.status}: ${response.statusText}`,
    );
    throw new Error(_err);
  }

  return parsedResponse.data;
};

export const getDiscoverData = async () => {
  const url = new URL(`${INDEXER_V2_URL}/protocols`);
  const response = await fetch(url.href);
  const parsedResponse = (await response.json()) as {
    data: {
      protocols: {
        description: string;
        icon_url: string;
        name: string;
        website_url: string;
        tags: string[];
        is_blacklisted: boolean;
      }[];
    };
  };

  if (!response.ok || !parsedResponse.data) {
    const _err = JSON.stringify(parsedResponse);
    captureException(
      `Failed to fetch discover entries - ${response.status}: ${response.statusText}`,
    );
    throw new Error(_err);
  }

  return parsedResponse.data.protocols.map((entry) => ({
    description: entry.description,
    iconUrl: entry.icon_url,
    name: entry.name,
    websiteUrl: entry.website_url,
    tags: entry.tags,
    isBlacklisted: entry.is_blacklisted,
  }));
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

  let balances = {} as BalanceMap;
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

    for (let i = 0; i < Object.keys(resp.balances).length; i++) {
      const k = Object.keys(resp.balances)[i];
      const v = resp.balances[k];
      if (v.liquidityPoolId) {
        const server = stellarSdkServer(networkUrl, networkPassphrase);

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
    } as AccountBalancesInterface;
  }

  // Get token balances to combine with classic balances
  const tokenIdList = await getTokenIds({
    activePublicKey: publicKey,
    network: network as NETWORKS,
  });

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
  } as AccountBalancesInterface;
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
      .includeFailed(true)
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
      `${INDEXER_URL}/account-history/${publicKey}?network=${networkDetails.network}&is_failed_included=true`,
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

export const getAccountBalances = async (
  publicKey: string,
  networkDetails: NetworkDetails,
  isMainnet: boolean,
) => {
  if (isCustomNetwork(networkDetails)) {
    return await getAccountBalancesStandalone({
      publicKey,
      networkDetails,
      isMainnet,
    });
  }
  return await getAccountIndexerBalances({ publicKey, networkDetails });
};

export const getTokenDetails = async ({
  contractId,
  publicKey,
  networkDetails,
  shouldFetchBalance,
}: {
  contractId: string;
  publicKey: string;
  networkDetails: NetworkDetails;
  shouldFetchBalance?: boolean;
}): Promise<{
  name: string;
  decimals: number;
  symbol: string;
  balance?: string;
} | null> => {
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

      let balance;
      if (shouldFetchBalance) {
        balance = await getBalance(
          contractId,
          [new Address(publicKey).toScVal()],
          server,
          await getNewTxBuilder(publicKey, networkDetails, server),
        );
      }

      return {
        name,
        symbol,
        decimals,
        ...(balance ? { balance: balance.toString() } : {}),
      };
    }

    const response = await fetch(
      `${INDEXER_URL}/token-details/${contractId}?pub_key=${publicKey}&network=${
        networkDetails.network
      }${shouldFetchBalance ? "&should_fetch_balance=true" : ""}`,
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
  assetsListsData,
  cachedIcons,
}: {
  balances: Balances;
  networkDetails: NetworkDetails;
  assetsListsData: AssetListResponse[];
  cachedIcons: Record<string, string>;
}) => {
  const assetIcons = {} as { [code: string]: string };

  if (balances) {
    let icon = "";
    const balanceValues = Object.values(balances);

    for (let i = 0; i < balanceValues.length; i++) {
      const { token, contractId } = balanceValues[i];
      if (token && "issuer" in token) {
        const {
          issuer: { key },
          code,
        } = token;

        let canonical = getCanonicalFromAsset(code, key);
        const cachedIcon = cachedIcons[canonical];
        if (cachedIcon) {
          assetIcons[canonical] = cachedIcon;
          continue;
        }

        icon = await getIconUrlFromIssuer({ key, code, networkDetails });
        if (!icon) {
          const tokenListIcon = await getIconFromTokenLists({
            networkDetails,
            issuerId: key,
            contractId,
            code,
            assetsListsData,
          });
          if (tokenListIcon.icon && tokenListIcon.canonicalAsset) {
            icon = tokenListIcon.icon;
            canonical = tokenListIcon.canonicalAsset;
          }
        }
        assetIcons[canonical] = icon;
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
  activePublicKey,
}: {
  key: string;
  code: string;
  assetIcons: { [code: string]: string };
  networkDetails: NetworkDetails;
  activePublicKey: string | null;
}) => {
  const newAssetIcons = { ...assetIcons };
  try {
    await sendMessageToBackground({
      activePublicKey,
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

    for (let i = 0; i < balanceValues.length; i++) {
      const { token } = balanceValues[i];
      if (token && "issuer" in token) {
        const {
          issuer: { key },
          code,
        } = token;

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
      activePublicKey: null,
      type: SERVICE_TYPES.REJECT_ACCESS,
    });
  } catch (e) {
    console.error(e);
  }
};

export const grantAccess = async (url: string): Promise<void> => {
  try {
    await sendMessageToBackground({
      activePublicKey: null,
      url,
      type: SERVICE_TYPES.GRANT_ACCESS,
    });
  } catch (e) {
    console.error(e);
  }
};

export const handleSignedHwPayload = async ({
  signedPayload,
}: {
  signedPayload: string | Buffer;
}): Promise<void> => {
  try {
    await sendMessageToBackground({
      activePublicKey: null,
      signedPayload,
      type: SERVICE_TYPES.HANDLE_SIGNED_HW_PAYLOAD,
    });
  } catch (e) {
    console.error(e);
  }
};

export const addToken = async ({
  activePublicKey,
}: {
  activePublicKey: string;
}): Promise<void> => {
  try {
    await sendMessageToBackground({
      activePublicKey,
      type: SERVICE_TYPES.ADD_TOKEN,
    });
  } catch (e) {
    console.error(e);
  }
};

export const signTransaction = async ({
  activePublicKey,
}: {
  activePublicKey: string;
}): Promise<void> => {
  try {
    await sendMessageToBackground({
      activePublicKey,
      type: SERVICE_TYPES.SIGN_TRANSACTION,
    });
  } catch (e) {
    console.error(e);
  }
};

export const signBlob = async ({
  activePublicKey,
}: {
  activePublicKey: string;
}): Promise<void> => {
  try {
    await sendMessageToBackground({
      activePublicKey,
      type: SERVICE_TYPES.SIGN_BLOB,
    });
  } catch (e) {
    console.error(e);
  }
};

export const signAuthEntry = async ({
  activePublicKey,
}: {
  activePublicKey: string;
}): Promise<void> => {
  try {
    await sendMessageToBackground({
      activePublicKey,
      type: SERVICE_TYPES.SIGN_AUTH_ENTRY,
    });
  } catch (e) {
    console.error(e);
  }
};

export const signFreighterTransaction = async ({
  transactionXDR,
  network,
  activePublicKey,
}: {
  transactionXDR: string;
  network: string;
  activePublicKey: string;
}): Promise<{ signedTransaction: string }> => {
  const { signedTransaction, error } = await sendMessageToBackground({
    transactionXDR,
    network,
    activePublicKey,
    type: SERVICE_TYPES.SIGN_FREIGHTER_TRANSACTION,
  });

  if (error || !signedTransaction) {
    throw new Error(error);
  }

  return { signedTransaction };
};

export const signFreighterSorobanTransaction = async ({
  activePublicKey,
  transactionXDR,
  network,
}: {
  activePublicKey: string;
  transactionXDR: string;
  network: string;
}): Promise<{ signedTransaction: string }> => {
  const { signedTransaction, error } = await sendMessageToBackground({
    activePublicKey,
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

      txResponse = await server.getTransaction(response.hash);
      // Wait a second

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return response;
  } else {
    throw new Error(
      `Unabled to submit transaction, status: ${response.status}`,
    );
  }
};

export const addRecentAddress = async ({
  activePublicKey,
  address,
}: {
  activePublicKey: string;
  address: string;
}): Promise<{ recentAddresses: Array<string> }> => {
  return await sendMessageToBackground({
    activePublicKey,
    address,
    type: SERVICE_TYPES.ADD_RECENT_ADDRESS,
  });
};

export const loadRecentAddresses = async ({
  activePublicKey,
}: {
  activePublicKey: string;
}): Promise<{
  recentAddresses: Array<string>;
}> => {
  return await sendMessageToBackground({
    activePublicKey,
    type: SERVICE_TYPES.LOAD_RECENT_ADDRESSES,
  });
};

export const loadLastUsedAccount = async (): Promise<{
  lastUsedAccount: string;
}> => {
  return await sendMessageToBackground({
    activePublicKey: null,
    type: SERVICE_TYPES.LOAD_LAST_USED_ACCOUNT,
  });
};

export const signOut = async ({
  activePublicKey,
}: {
  activePublicKey: string;
}): Promise<{
  publicKey: string;
  applicationState: APPLICATION_STATE;
}> => {
  let response = {
    publicKey: "",
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  };
  try {
    response = await sendMessageToBackground({
      activePublicKey,
      type: SERVICE_TYPES.SIGN_OUT,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const showBackupPhrase = async ({
  activePublicKey,
  password,
}: {
  activePublicKey: string | null;
  password: string;
}): Promise<{ mnemonicPhrase: string; error: string }> => {
  let response = { mnemonicPhrase: "", error: "" };
  try {
    response = await sendMessageToBackground({
      activePublicKey,
      password,
      type: SERVICE_TYPES.SHOW_BACKUP_PHRASE,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const saveAllowList = async ({
  activePublicKey,
  domain,
  networkName,
}: {
  activePublicKey: string;
  domain: string;
  networkName: string;
}): Promise<{ allowList: AllowList }> => {
  let response = {
    allowList: DEFAULT_ALLOW_LIST,
  };

  try {
    response = await sendMessageToBackground({
      activePublicKey,
      domain,
      networkName,
      type: SERVICE_TYPES.SAVE_ALLOWLIST,
    });
  } catch (e) {
    console.error(e);
  }

  return response;
};

export const saveSettings = async ({
  activePublicKey,
  isDataSharingAllowed,
  isMemoValidationEnabled,
  isHideDustEnabled,
}: {
  activePublicKey: string;
  isDataSharingAllowed: boolean;
  isMemoValidationEnabled: boolean;
  isHideDustEnabled: boolean;
}): Promise<Settings & IndexerSettings> => {
  let response = {
    allowList: DEFAULT_ALLOW_LIST,
    isDataSharingAllowed: false,
    networkDetails: MAINNET_NETWORK_DETAILS,
    networksList: DEFAULT_NETWORKS,
    isMemoValidationEnabled: true,
    isRpcHealthy: false,
    userNotification: { enabled: false, message: "" },
    settingsState: SettingsState.IDLE,
    isSorobanPublicEnabled: false,
    isNonSSLEnabled: false,
    isHideDustEnabled: true,
    error: "",
    hiddenAssets: {},
  };

  try {
    response = await sendMessageToBackground({
      activePublicKey,
      isDataSharingAllowed,
      isMemoValidationEnabled,
      isHideDustEnabled,
      type: SERVICE_TYPES.SAVE_SETTINGS,
    });
  } catch (e) {
    console.error(e);
  }

  if (response.error) {
    throw new Error(response.error);
  }

  return response;
};

export const saveExperimentalFeatures = async ({
  activePublicKey,
  isExperimentalModeEnabled,
  isHashSigningEnabled,
  isNonSSLEnabled,
}: {
  activePublicKey: string;
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
      activePublicKey,
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

export const changeNetwork = async ({
  activePublicKey,
  networkName,
}: {
  activePublicKey: string;
  networkName: string;
}): Promise<{ networkDetails: NetworkDetails; isRpcHealthy: boolean }> => {
  let networkDetails = MAINNET_NETWORK_DETAILS;
  let isRpcHealthy = false;
  let error = "";

  try {
    ({ networkDetails, isRpcHealthy, error } = await sendMessageToBackground({
      activePublicKey,
      networkName,
      type: SERVICE_TYPES.CHANGE_NETWORK,
    }));
  } catch (e) {
    console.error(e);
  }

  if (error) {
    throw new Error(error);
  }

  return { networkDetails, isRpcHealthy };
};

export const addCustomNetwork = async ({
  activePublicKey,
  networkDetails,
}: {
  activePublicKey: string;
  networkDetails: NetworkDetails;
}): Promise<{
  networksList: NetworkDetails[];
}> => {
  let response = {
    error: "",
    networksList: [] as NetworkDetails[],
  };

  try {
    response = await sendMessageToBackground({
      activePublicKey,
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

export const removeCustomNetwork = async ({
  activePublicKey,
  networkName,
}: {
  activePublicKey: string;
  networkName: string;
}) => {
  let response = {
    networkDetails: MAINNET_NETWORK_DETAILS,
    networksList: [] as NetworkDetails[],
    error: "",
  };

  try {
    response = await sendMessageToBackground({
      activePublicKey,
      networkName,
      type: SERVICE_TYPES.REMOVE_CUSTOM_NETWORK,
    });
  } catch (e) {
    console.error(e);
  }

  if (response.error) {
    throw new Error(response.error);
  }

  return response;
};

export const editCustomNetwork = async ({
  activePublicKey,
  networkDetails,
  networkIndex,
}: {
  activePublicKey: string;
  networkDetails: NetworkDetails;
  networkIndex: number;
}) => {
  let response = {
    networkDetails: MAINNET_NETWORK_DETAILS,
    networksList: [] as NetworkDetails[],
    error: "",
  };

  try {
    response = await sendMessageToBackground({
      activePublicKey,
      networkDetails,
      networkIndex,
      type: SERVICE_TYPES.EDIT_CUSTOM_NETWORK,
    });
  } catch (e) {
    console.error(e);
  }

  if (response.error) {
    throw new Error(response.error);
  }

  return response;
};

export const loadSettings = (): Promise<
  Settings &
    IndexerSettings &
    ExperimentalFeatures & { assetsLists: AssetsLists }
> =>
  sendMessageToBackground({
    activePublicKey: null,
    type: SERVICE_TYPES.LOAD_SETTINGS,
  });

export const getMemoRequiredAccounts = async ({
  activePublicKey,
}: {
  activePublicKey: string;
}) => {
  const resp = await sendMessageToBackground({
    activePublicKey,
    type: SERVICE_TYPES.GET_MEMO_REQUIRED_ACCOUNTS,
  });
  return resp;
};

export const addTokenId = async ({
  activePublicKey,
  publicKey,
  tokenId,
  network,
}: {
  activePublicKey: string;
  publicKey: string;
  tokenId: string;
  network: Networks;
}): Promise<{
  tokenIdList: string[];
}> => {
  let error = "";
  let tokenIdList = [] as string[];

  try {
    ({ tokenIdList, error } = await sendMessageToBackground({
      activePublicKey,
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

export const getTokenIds = async ({
  activePublicKey,
  network,
}: {
  activePublicKey: string;
  network: NETWORKS;
}): Promise<string[]> => {
  const { tokenIdList, error } = await sendMessageToBackground({
    activePublicKey,
    type: SERVICE_TYPES.GET_TOKEN_IDS,
    network,
  });

  if (error) {
    return [];
  }

  return tokenIdList;
};

export const removeTokenId = async ({
  activePublicKey,
  contractId,
  network,
}: {
  activePublicKey: string;
  contractId: string;
  network: NETWORKS;
}): Promise<string[]> => {
  const resp = await sendMessageToBackground({
    type: SERVICE_TYPES.REMOVE_TOKEN_ID,
    contractId,
    network,
    activePublicKey,
  });
  return resp.tokenIdList;
};

export const addAssetsList = async ({
  activePublicKey,
  assetsList,
  network,
}: {
  activePublicKey: string;
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
    activePublicKey,
  });

  return { assetsLists: response.assetsLists, error: response.error };
};

export const modifyAssetsList = async ({
  activePublicKey,
  assetsList,
  network,
  isDeleteAssetsList,
}: {
  activePublicKey: string;
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
    activePublicKey,
  });

  return { assetsLists: response.assetsLists, error: response.error };
};

export const simulateTokenTransfer = async (args: {
  address: string;
  publicKey: string;
  memo?: string;
  params: {
    publicKey: string;
    destination: string;
    amount: number;
  };
  networkDetails: NetworkDetails;
  transactionFee: string;
}): Promise<{
  ok: boolean;
  response: {
    preparedTransaction: string;
    simulationResponse: SorobanRpc.Api.SimulateTransactionSuccessResponse;
  };
}> => {
  const { address, publicKey, memo, params, networkDetails, transactionFee } =
    args;

  if (isCustomNetwork(networkDetails)) {
    if (!networkDetails.sorobanRpcUrl) {
      throw new SorobanRpcNotSupportedError();
    }
    const server = buildSorobanServer(
      networkDetails.sorobanRpcUrl,
      networkDetails.networkPassphrase,
    );
    const builder = await getNewTxBuilder(
      publicKey,
      networkDetails,
      server,
      xlmToStroop(transactionFee).toFixed(),
    );

    const transferParams = [
      new Address(publicKey).toScVal(), // from
      new Address(address).toScVal(), // to
      new XdrLargeInt("i128", params.amount).toI128(), // amount
    ];
    const transaction = transfer(address, transferParams, memo, builder);
    // TODO: type narrow instead of cast
    const simulationResponse = (await server.simulateTransaction(
      transaction,
    )) as SorobanRpc.Api.SimulateTransactionSuccessResponse;

    const preparedTransaction = SorobanRpc.assembleTransaction(
      transaction,
      simulationResponse,
    )
      .build()
      .toXDR();

    return {
      ok: true,
      response: {
        simulationResponse,
        preparedTransaction,
      },
    };
  }

  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      address,

      pub_key: publicKey,
      memo,
      params,

      network_url: networkDetails.sorobanRpcUrl,

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

export const simulateTransaction = async (args: {
  xdr: string;
  networkDetails: NetworkDetails;
}) => {
  const { xdr, networkDetails } = args;
  const options = {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      xdr,

      network_url: networkDetails.sorobanRpcUrl,

      network_passphrase: networkDetails.networkPassphrase,
    }),
  };
  const res = await fetch(`${INDEXER_URL}/simulate-tx`, options);
  const response = await res.json();
  return {
    ok: res.ok,
    response,
  };
};

export const getIsAccountMismatch = async ({
  activePublicKey,
}: {
  activePublicKey: string;
}) => {
  let response = {
    error: "",
    isAccountMismatch: false,
  };

  response = await sendMessageToBackground({
    type: SERVICE_TYPES.GET_IS_ACCOUNT_MISMATCH,
    activePublicKey,
  });

  if (response.error) {
    throw new Error(response.error);
  }

  return {
    isAccountMismatch: response.isAccountMismatch,
    error: response.error,
  };
};

export const getHiddenAssets = async ({
  activePublicKey,
}: {
  activePublicKey: string;
}) => {
  let response = {
    error: "",
    hiddenAssets: {} as Record<IssuerKey, AssetVisibility>,
  };

  response = await sendMessageToBackground({
    type: SERVICE_TYPES.GET_HIDDEN_ASSETS,
    activePublicKey,
  });

  return { hiddenAssets: response.hiddenAssets, error: response.error };
};

export const changeAssetVisibility = async ({
  assetIssuer,
  assetVisibility,
  activePublicKey,
}: {
  assetIssuer: IssuerKey;
  assetVisibility: AssetVisibility;
  activePublicKey: string;
}) => {
  let response = {
    error: "",
    hiddenAssets: {} as Record<IssuerKey, AssetVisibility>,
  };

  response = await sendMessageToBackground({
    type: SERVICE_TYPES.CHANGE_ASSET_VISIBILITY,
    assetVisibility: {
      issuer: assetIssuer,
      visibility: assetVisibility,
    },
    activePublicKey,
  });

  return { hiddenAssets: response.hiddenAssets, error: response.error };
};
