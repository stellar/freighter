import { Horizon } from "stellar-sdk";
import { BigNumber } from "bignumber.js";
import {
  AssetType,
  Balances,
  HorizonOperation,
  SorobanBalance,
  TokenBalances,
} from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";

import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  isTestnet,
} from "helpers/stellar";
import { getAttrsFromSorobanHorizonOp } from "./soroban";

export const LP_IDENTIFIER = ":lp";

export const sortBalances = (
  balances: Balances,
  sorobanBalances?: TokenBalances,
) => {
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
    if ("contractId" in bal) {
      assetOperationMap[getCanonicalFromAsset(bal.symbol, bal.contractId)] = [];
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
  accountBalances: AssetType[];
  selectedAsset: string;
  recommendedFee?: string;
  subentryCount: number;
}

export const getAvailableBalance = ({
  accountBalances,
  selectedAsset,
  recommendedFee,
  subentryCount,
}: GetAvailableBalance) => {
  let availBalance = "0";
  if (accountBalances.length) {
    const balance = getRawBalance(accountBalances, selectedAsset);
    if (!balance) {
      return availBalance;
    }
    if (selectedAsset === "native") {
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
  }

  return availBalance;
};

export const getRawBalance = (accountBalances: AssetType[], asset: string) =>
  accountBalances.find((balance) => {
    if ("token" in balance) {
      if (balance.token.type === "native") {
        return asset === balance.token.type;
      }

      if ("issuer" in balance.token) {
        return asset === `${balance.token.code}:${balance.token.issuer.key}`;
      }
    }
    throw new Error("Asset type not supported");
  });

export const getIssuerFromBalance = (balance: AssetType) => {
  if ("token" in balance && "issuer" in balance?.token) {
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
    // eslint-disable-next-line no-new
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

export const isSorobanIssuer = (issuer: string) =>
  issuer && issuer !== "native" && !issuer.startsWith("G");
