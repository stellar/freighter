import BigNumber from "bignumber.js";
import * as StellarSdk from "stellar-sdk";
import * as StellarSdkNext from "stellar-sdk-next";

import { BalanceMap } from "@shared/api/types";
import {
  BASE_RESERVE,
  BASE_RESERVE_MIN_COUNT,
  NetworkDetails,
} from "@shared/constants/stellar";

export const CUSTOM_NETWORK = "STANDALONE";

export const isNextSdk = (networkPassphrase: string) =>
  [""].includes(networkPassphrase);

export const getSdk = (networkPassphrase: string) =>
  isNextSdk(networkPassphrase) ? StellarSdkNext : StellarSdk;

export const isCustomNetwork = (networkDetails: NetworkDetails) => {
  const { network } = networkDetails;

  return network === CUSTOM_NETWORK;
};

export function getBalanceIdentifier(
  balance: StellarSdk.Horizon.HorizonApi.BalanceLine,
): string {
  if ("asset_issuer" in balance && !balance.asset_issuer) {
    return "native";
  }
  switch (balance.asset_type) {
    case "credit_alphanum4":
    case "credit_alphanum12":
      return `${balance.asset_code}:${balance.asset_issuer}`;

    case "liquidity_pool_shares":
      return `${balance.liquidity_pool_id}:lp`;

    default:
      return "native";
  }
}

export function makeDisplayableBalances(
  accountDetails: StellarSdk.Horizon.ServerApi.AccountRecord,
): BalanceMap {
  const { balances, subentry_count, num_sponsored, num_sponsoring } =
    accountDetails;

  const displayableBalances = Object.values(balances).reduce(
    (memo, balance) => {
      const identifier = getBalanceIdentifier(balance);
      const total = new BigNumber(balance.balance);

      let sellingLiabilities = new BigNumber(0);
      let buyingLiabilities = new BigNumber(0);
      let available;

      if ("selling_liabilities" in balance) {
        sellingLiabilities = new BigNumber(balance.selling_liabilities);
        available = total.minus(sellingLiabilities);
      }

      if ("buying_liabilities" in balance) {
        buyingLiabilities = new BigNumber(balance.buying_liabilities);
      }

      if (identifier === "native") {
        // define the native balance line later
        return {
          ...memo,
          native: {
            token: {
              type: "native",
              code: "XLM",
            },
            total,
            available,
            sellingLiabilities,
            buyingLiabilities,
            minimumBalance: new BigNumber(BASE_RESERVE_MIN_COUNT)
              .plus(subentry_count)
              .plus(num_sponsoring)
              .minus(num_sponsored)
              .times(BASE_RESERVE)
              .plus(sellingLiabilities),
          },
        };
      }

      const liquidityPoolBalance =
        balance as StellarSdk.Horizon.HorizonApi.BalanceLineLiquidityPool;
      if (identifier.includes(":lp")) {
        return {
          ...memo,
          [identifier]: {
            liquidity_pool_id: liquidityPoolBalance.liquidity_pool_id,
            total,
            limit: new BigNumber(liquidityPoolBalance.limit),
          },
        };
      }

      const assetBalance =
        balance as StellarSdk.Horizon.HorizonApi.BalanceLineAsset;
      const assetSponsor = assetBalance.sponsor
        ? { sponsor: assetBalance.sponsor }
        : {};

      return {
        ...memo,
        [identifier]: {
          token: {
            type: assetBalance.asset_type,
            code: assetBalance.asset_code,
            issuer: {
              key: assetBalance.asset_issuer,
            },
          },
          sellingLiabilities,
          buyingLiabilities,
          total,
          limit: new BigNumber(assetBalance.limit),
          available: total.minus(sellingLiabilities),
          ...assetSponsor,
        },
      };
    },
    {},
  );

  return displayableBalances as BalanceMap;
}
