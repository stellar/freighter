import { Federation, Horizon, MuxedAccount } from "stellar-sdk";
import { BigNumber } from "bignumber.js";
import {
  Account,
  AssetIcons,
  AssetVisibility,
  HorizonOperation,
  IssuerKey,
  TokenBalances,
} from "@shared/api/types";
import { Balances, BalanceMap } from "@shared/api/types/backend-api";
import { AssetType } from "@shared/api/types/account-balance";
import { NetworkDetails } from "@shared/constants/stellar";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";
import {
  isNativeAssetId,
  isNativeBalance,
} from "@shared/helpers/assetIdentity";
export { isSorobanIssuer } from "@shared/helpers/stellar";

import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  isFederationAddress,
  isMainnet,
  isMuxedAccount,
  isTestnet,
} from "helpers/stellar";
import { getAttrsFromSorobanHorizonOp } from "./soroban";
import { isAssetVisible } from "./settings";
import {
  getRowDataByOpType,
  OperationDataRow,
  getOperationDependencies,
} from "popup/views/AccountHistory/hooks/useGetHistoryData";
import { TokenDetailsResponse } from "helpers/hooks/useTokenDetails";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";

export const LP_IDENTIFIER = ":lp";

export const sortBalances = (
  balances: Balances,
  sorobanBalances?: TokenBalances,
): AssetType[] => {
  const collection = [] as any[];
  const lpBalances = [] as any[];
  const _sorobanBalances = sorobanBalances || [];
  if (!balances) {
    return collection;
  }

  // put XLM at the top of the balance list, LP shares last
  Object.entries(balances).forEach(([k, v]) => {
    if (isNativeAssetId(k)) {
      collection.unshift(v);
    } else if (k.includes(LP_IDENTIFIER)) {
      lpBalances.push(v);
    } else {
      collection.push(v);
    }
  });
  return collection.concat(_sorobanBalances).concat(lpBalances);
};

export const getIsPayment = (type: Horizon.HorizonApi.OperationResponseType) =>
  [
    Horizon.HorizonApi.OperationResponseType.payment,
    Horizon.HorizonApi.OperationResponseType.pathPayment,
    Horizon.HorizonApi.OperationResponseType.pathPaymentStrictSend,
  ].includes(type);

export const getIsSupportedSorobanOp = (
  operation: HorizonOperation,
  networkDetails: NetworkDetails,
) => {
  const attrs = getAttrsFromSorobanHorizonOp(operation, networkDetails);
  return (
    !!attrs &&
    Object.values(SorobanTokenInterface).includes(
      attrs.fnName as SorobanTokenInterface,
    )
  );
};

export const getIsSwap = (operation: HorizonOperation) =>
  operation.type_i === 13 && operation.source_account === operation.to;

export const getIsDustPayment = (
  publicKey: string,
  operation: HorizonOperation,
) =>
  getIsPayment(operation.type) &&
  "asset_type" in operation &&
  isNativeAssetId(operation.asset_type) &&
  "to" in operation &&
  operation.to === publicKey &&
  "amount" in operation &&
  new BigNumber(operation.amount!).lte(new BigNumber(0.1));

export const getIsCreateClaimableBalanceSpam = (
  operation: HorizonOperation,
) => {
  const op = operation;
  if (op.type === "create_claimable_balance") {
    if (op?.transaction_attr?.operation_count > 50) {
      return true;
    }
  }

  return false;
};

interface SortOperationsByAsset {
  operations: HorizonOperation[];
  balances: AssetType[];
  networkDetails: NetworkDetails;
  publicKey: string;
  fetchTokenDetails: (args: {
    contractId: string;
    publicKey: string;
    networkDetails: NetworkDetails;
  }) => Promise<TokenDetailsResponse | Error>;
  icons: AssetIcons;
  homeDomains: { [assetIssuer: string]: string | null };
  cachedTokenLists: AssetListResponse[];
}

export interface AssetOperations {
  [key: string]: OperationDataRow[];
}

/**
 * True when `operation` moves the asset that `assetKey` identifies.
 *
 * The two sides identify assets in different spaces: `assetKey` is a canonical
 * identifier, while a Horizon operation carries an asset type alongside a
 * code/issuer pair. Each arm therefore tests in its own space rather than
 * comparing a code against a type.
 */
export const operationMatchesAssetKey = (
  assetKey: string,
  operation: HorizonOperation,
): boolean => {
  const asset = getAssetFromCanonical(assetKey);
  const isNativeKey = isNativeAssetId(assetKey);

  const matchesAsset = isNativeKey
    ? "asset_type" in operation && isNativeAssetId(operation.asset_type)
    : "asset_code" in operation &&
      "asset_issuer" in operation &&
      operation.asset_code === asset.code &&
      operation.asset_issuer === asset.issuer;

  if (matchesAsset) {
    return true;
  }

  if (
    !("source_asset_type" in operation) &&
    !("source_asset_code" in operation)
  ) {
    return false;
  }

  return isNativeKey
    ? "source_asset_type" in operation &&
        isNativeAssetId(operation.source_asset_type)
    : "source_asset_issuer" in operation &&
        operation.source_asset_code === asset.code &&
        operation.source_asset_issuer === asset.issuer;
};

export const sortOperationsByAsset = async ({
  balances,
  operations,
  networkDetails,
  publicKey,
  fetchTokenDetails,
  icons,
  homeDomains,
  cachedTokenLists,
}: SortOperationsByAsset) => {
  const assetOperationMap = {} as AssetOperations;

  balances.forEach((bal) => {
    if ("token" in bal) {
      const issuer =
        bal.token !== undefined && "issuer" in bal.token
          ? bal.token.issuer.key
          : "";
      const code =
        bal.token !== undefined && "code" in bal.token ? bal.token.code : "";
      assetOperationMap[getCanonicalFromAsset(code, issuer)] = [];
    }
    if ("contractId" in bal && "symbol" in bal) {
      assetOperationMap[
        getCanonicalFromAsset(bal.symbol, bal.contractId || "")
      ] = [];
    }
  });

  /* 
    To prevent multiple requests for home domains as we build each row, 
    we iterate through the operations and collect the asset issuers that need home domains in a single request.
    Also collect and fetch needed collectible contracts.
  */
  const { homeDomains: fetchedHomeDomains, collectibleLookup } =
    await getOperationDependencies(
      operations,
      networkDetails,
      publicKey,
      homeDomains,
    );

  for (const op of operations) {
    const isPayment = getIsPayment(op.type);
    const isSwap = getIsSwap(op);
    const isCreateExternalAccount =
      op.type === Horizon.HorizonApi.OperationResponseType.createAccount &&
      op.account !== publicKey;
    const isDustPayment = getIsDustPayment(publicKey, op);

    const parsedOperation = {
      ...op,
      isPayment,
      isSwap,
      isDustPayment,
      isCreateExternalAccount,
    };

    const opRowData = await getRowDataByOpType(
      publicKey,
      balances,
      parsedOperation,
      networkDetails,
      icons,
      fetchTokenDetails,
      fetchedHomeDomains,
      collectibleLookup,
      cachedTokenLists,
    );
    if (getIsPayment(op.type)) {
      Object.keys(assetOperationMap).forEach((assetKey) => {
        if (operationMatchesAssetKey(assetKey, op)) {
          assetOperationMap[assetKey].push(opRowData);
        }
      });
    }

    if (getIsSupportedSorobanOp(op, networkDetails)) {
      Object.keys(assetOperationMap).forEach((assetKey) => {
        const asset = getAssetFromCanonical(assetKey);
        const attrs = getAttrsFromSorobanHorizonOp(op, networkDetails);
        if (
          attrs &&
          op.source_account === publicKey &&
          asset.issuer === attrs.contractId
        ) {
          assetOperationMap[assetKey].push(opRowData);
        }
      });
    }
  }

  return assetOperationMap;
};

export const getStellarExpertUrl = (networkDetails: NetworkDetails) =>
  `https://stellar.expert/explorer/${
    isTestnet(networkDetails) ? "testnet" : "public"
  }`;

/**
 * stellar.expert serves only the public and test networks — there is no
 * Futurenet or standalone explorer.
 *
 * Gate every stellar.expert link on this. `getStellarExpertUrl` falls through
 * to `/public` for anything that isn't testnet, so on Futurenet an ungated
 * link renders a *mainnet* lookup for a non-mainnet account: wrong data, and
 * silent about it.
 */
export const isStellarExpertSupported = (networkDetails: NetworkDetails) =>
  isMainnet(networkDetails) || isTestnet(networkDetails);

export const getApiStellarExpertUrl = (networkDetails: NetworkDetails) =>
  `https://api.stellar.expert/explorer/${
    isTestnet(networkDetails) ? "testnet" : "public"
  }`;

interface GetAvailableBalance {
  balance: AssetType;
  recommendedFee?: string;
  subentryCount: number;
}

export const getAvailableBalance = ({
  balance,
  recommendedFee,
  subentryCount,
}: GetAvailableBalance) => {
  let availBalance = "0";
  if (!balance) {
    return availBalance;
  }
  if (isNativeBalance(balance)) {
    // take base reserve into account for XLM payments
    const baseReserve = (2 + subentryCount) * 0.5;

    // needed for different wallet-sdk bignumber.js version
    const currentBal = new BigNumber(balance.total.toFixed());
    let newBalance = currentBal.minus(new BigNumber(baseReserve));

    if (recommendedFee) {
      newBalance = newBalance.minus(new BigNumber(Number(recommendedFee)));
    }

    availBalance = newBalance.toFixed();
  } else {
    availBalance = balance.total.toFixed();
  }

  return availBalance;
};

export const getIssuerFromBalance = (balance: AssetType) => {
  if ("token" in balance && "issuer" in balance.token) {
    return balance.token.issuer.key.toString();
  }

  return "";
};

export const isNetworkUrlValid = (
  networkUrl: string,
  isHttpAllowed: boolean,
) => {
  let isValid = true;

  try {
    new Horizon.Server(networkUrl, { allowHttp: isHttpAllowed });
  } catch (e) {
    console.error(e);
    isValid = false;
  }
  return isValid;
};

export const displaySorobanId = (
  fullStr: string,
  strLen: number,
  separator = "...",
) => {
  if (fullStr.length <= strLen) {
    return fullStr;
  }

  const sepLen = separator.length;
  const charsToShow = strLen - sepLen;
  const frontChars = Math.ceil(charsToShow / 2);
  const backChars = Math.floor(charsToShow / 2);

  return (
    fullStr.substring(0, frontChars) +
    separator +
    fullStr.substring(fullStr.length - backChars)
  );
};

export const filterHiddenBalances = (
  balances: BalanceMap,
  hiddenAssets: Record<IssuerKey, AssetVisibility>,
) => {
  const balanceKeys = Object.keys(balances);
  const hiddenKeys = balanceKeys.filter((key) => {
    if (isNativeAssetId(key)) {
      return false;
    }
    const [code, issuer] = key.split(":");
    if (!issuer) {
      return true;
    }
    return !isAssetVisible(hiddenAssets, getCanonicalFromAsset(code, issuer));
  });

  return Object.fromEntries(
    Object.entries(balances).filter(([key]) => !hiddenKeys.includes(key)),
  ) as BalanceMap;
};

export const getBaseAccount = async (address?: string) => {
  if (address && isMuxedAccount(address)) {
    const mAccount = MuxedAccount.fromAddress(address, "0");
    return mAccount.baseAccount().accountId();
  }
  if (address && isFederationAddress(address)) {
    const fedResp = await Federation.Server.resolve(address);
    return fedResp.account_id;
  }
  return address;
};

export const signFlowAccountSelector = ({
  allAccounts,
  publicKey,
  accountToSign,
  setActiveAccount,
}: {
  allAccounts: Account[];
  publicKey: string;
  accountToSign: string | undefined;
  setActiveAccount: (publicKey: string) => void;
}) => {
  let currentAccount = allAccounts.find(
    (account) => account.publicKey === publicKey,
  );

  allAccounts.forEach((account) => {
    if (accountToSign) {
      // does the user have the `accountToSign` somewhere in the accounts list?
      if (account.publicKey === accountToSign) {
        // if the `accountToSign` is found, but it isn't active, make it active
        if (publicKey !== account.publicKey) {
          setActiveAccount(account.publicKey);
        }

        // save the details of the `accountToSign`
        currentAccount = account;
      }
    }
  });
  return currentAccount;
};
