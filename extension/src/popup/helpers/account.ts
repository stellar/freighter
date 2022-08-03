import { Horizon } from "stellar-sdk";
import { Types } from "@stellar/wallet-sdk";
import { BigNumber } from "bignumber.js";
import {
  AccountBalancesInterface,
  Balances,
  HorizonOperation,
} from "@shared/api/types";

export const sortBalances = (balances: Balances) => {
  const collection = [] as Array<any>;
  if (!balances) return collection;

  // put XLM at the top of the balance list
  Object.entries(balances).forEach(([k, v]) => {
    if (k === "native") {
      collection.unshift(v);
    } else if (!k.includes(":lp")) {
      collection.push(v);
    }
  });

  return collection;
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
    const key = bal.token.type === "native" ? bal.token.type : bal.token.code;
    assetOperationMap[key] = [];
  });

  operations.forEach((op) => {
    if (getIsPayment(op.type)) {
      Object.keys(assetOperationMap).forEach((asset) => {
        if (op.asset_code === asset || op.asset_type === asset) {
          assetOperationMap[asset].push(op);
        } else if ("source_asset_type" in op || "source_asset_code" in op) {
          if (
            op.source_asset_type === asset ||
            op.source_asset_code === asset
          ) {
            assetOperationMap[asset].push(op);
          }
        }
      });
    }
  });

  return assetOperationMap;
};

export const getStellarExpertUrl = (isTestnet: boolean) =>
  `https://stellar.expert/explorer/${isTestnet ? "testnet" : "public"}`;

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
