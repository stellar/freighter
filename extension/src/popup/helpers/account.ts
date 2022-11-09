import StellarSdk, { Horizon } from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";
import { BigNumber } from "bignumber.js";
import {
  AccountBalancesInterface,
  Balances,
  HorizonOperation,
} from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";

import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  isTestnet,
} from "helpers/stellar";

export const LP_IDENTIFIER = ":lp";

export const sortBalances = (balances: Balances) => {
  const collection = [] as Array<any>;
  const lpBalances = [] as Array<any>;
  if (!balances) return collection;

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

  return collection.concat(lpBalances);
};

export const getIsPayment = (type: Horizon.OperationResponseType) =>
  [
    Horizon.OperationResponseType.payment,
    Horizon.OperationResponseType.pathPayment,
    Horizon.OperationResponseType.pathPaymentStrictSend,
  ].includes(type);

export const getIsSwap = (operation: HorizonOperation) =>
  operation.type_i === 13 && operation.source_account === operation.to;

interface SortOperationsByAsset {
  operations: Array<HorizonOperation>;
  balances: Array<Types.AssetBalance | Types.NativeBalance>;
}

export interface AssetOperations {
  [key: string]: Array<HorizonOperation>;
}

export const sortOperationsByAsset = ({
  balances,
  operations,
}: SortOperationsByAsset) => {
  const assetOperationMap = {} as AssetOperations;

  balances.forEach((bal) => {
    if (bal.token) {
      const issuer = "issuer" in bal.token ? bal.token.issuer.key : "";
      assetOperationMap[getCanonicalFromAsset(bal.token.code, issuer)] = [];
    }
  });

  operations.forEach((op) => {
    if (getIsPayment(op.type)) {
      Object.keys(assetOperationMap).forEach((assetKey) => {
        const asset = getAssetFromCanonical(assetKey);
        const assetCode = asset.code === "XLM" ? "native" : asset.code;
        const assetIssuer = asset.issuer;

        if (
          (op.asset_code === assetCode && op.asset_issuer === assetIssuer) ||
          op.asset_type === assetCode
        ) {
          assetOperationMap[asset].push(op);
        } else if ("source_asset_type" in op || "source_asset_code" in op) {
          if (
            op.source_asset_type === assetCode ||
            (op.source_asset_code === assetCode &&
              op.source_asset_issuer === assetIssuer)
          ) {
            assetOperationMap[asset].push(op);
          }
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
  accountBalances: AccountBalancesInterface;
  selectedAsset: string;
  recommendedFee?: string;
}

export const getAvailableBalance = ({
  accountBalances,
  selectedAsset,
  recommendedFee,
}: GetAvailableBalance) => {
  let availBalance = "0";
  if (accountBalances.balances) {
    if (!accountBalances.balances[selectedAsset]) {
      return availBalance;
    }
    if (selectedAsset === "native") {
      // take base reserve into account for XLM payments
      const baseReserve = (2 + accountBalances.subentryCount) * 0.5;

      // needed for different wallet-sdk bignumber.js version
      const currentBal = new BigNumber(
        accountBalances.balances[selectedAsset].total.toFixed(),
      );
      let newBalance = currentBal.minus(new BigNumber(baseReserve));

      if (recommendedFee) {
        newBalance = newBalance.minus(new BigNumber(Number(recommendedFee)));
      }

      availBalance = newBalance.toFixed();
    } else {
      availBalance = accountBalances.balances[selectedAsset].total.toFixed();
    }
  }

  return availBalance;
};

export const isNetworkUrlValid = (
  networkUrl: string,
  isHttpAllowed: boolean,
) => {
  let isValid = true;

  try {
    // eslint-disable-next-line no-new
    new StellarSdk.Server(networkUrl, { allowHttp: isHttpAllowed });
  } catch (e) {
    console.error(e);
    isValid = false;
  }
  return isValid;
};
