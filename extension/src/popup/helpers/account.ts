import { Federation, Horizon, MuxedAccount } from "stellar-sdk";
import { BigNumber } from "bignumber.js";
import {
  Account,
  AssetVisibility,
  HorizonOperation,
  IssuerKey,
  SorobanBalance,
  TokenBalances,
} from "@shared/api/types";
import { Balances, BalanceMap } from "@shared/api/types/backend-api";
import { AssetType } from "@shared/api/types/account-balance";
import { NetworkDetails } from "@shared/constants/stellar";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";
export { isSorobanIssuer } from "@shared/helpers/stellar";

import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  isFederationAddress,
  isMuxedAccount,
  isTestnet,
} from "helpers/stellar";
import { getAttrsFromSorobanHorizonOp } from "./soroban";
import { isAssetVisible } from "./settings";

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
    if (k === "native") {
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
  operation.asset_type === "native" &&
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
  balances: AssetType[] | SorobanBalance[];
  networkDetails: NetworkDetails;
  publicKey: string;
}

export interface AssetOperations {
  [key: string]: HorizonOperation[];
}

export const sortOperationsByAsset = ({
  balances,
  operations,
  networkDetails,
  publicKey,
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

  operations.forEach((op) => {
    if (getIsPayment(op.type)) {
      Object.keys(assetOperationMap).forEach((assetKey) => {
        const asset = getAssetFromCanonical(assetKey);
        const assetCode = asset.code === "XLM" ? "native" : asset.code;
        const assetIssuer = asset.issuer;

        if (
          ("asset_code" in op &&
            "asset_issuer" in op &&
            op.asset_code === assetCode &&
            op.asset_issuer === assetIssuer) ||
          ("asset_type" in op && op.asset_type === assetCode)
        ) {
          assetOperationMap[assetKey].push(op);
        } else if ("source_asset_type" in op || "source_asset_code" in op) {
          if (
            ("source_asset_type" in op && op.source_asset_type === assetCode) ||
            (op.source_asset_code === assetCode &&
              "source_asset_issuer" in op &&
              op.source_asset_issuer === assetIssuer)
          ) {
            assetOperationMap[assetKey].push(op);
          }
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
          assetOperationMap[assetKey].push(op);
        }
      });
    }
  });

  return assetOperationMap;
};

export const getStellarExpertUrl = (networkDetails: NetworkDetails) =>
  `https://stellar.expert/explorer/${
    isTestnet(networkDetails) ? "testnet" : "public"
  }`;

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
  if (
    "token" in balance &&
    "type" in balance.token &&
    balance.token.type === "native"
  ) {
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
    if (key === "native") {
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
