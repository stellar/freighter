import BigNumber from "bignumber.js";
import * as StellarSdk from "stellar-sdk";
import * as StellarSdkNext from "stellar-sdk-next";

import { AssetBalance, BlockAidScanAssetResult } from "@shared/api/types";
import { BalanceMap } from "@shared/api/types/backend-api";
import {
  BASE_RESERVE,
  BASE_RESERVE_MIN_COUNT,
  NetworkDetails,
} from "@shared/constants/stellar";
import { INDEXER_URL } from "@shared/constants/mercury";

export const CUSTOM_NETWORK = "STANDALONE";
export const LP_ISSUER_KEY = "lp";

export const isNextSdk = (networkPassphrase: string) =>
  [""].includes(networkPassphrase);

export const getSdk = (networkPassphrase: string) =>
  isNextSdk(networkPassphrase) ? StellarSdkNext : StellarSdk;

export const isCustomNetwork = (networkDetails: NetworkDetails) => {
  const { network } = networkDetails;

  return network === CUSTOM_NETWORK;
};

export function getBalanceIdentifier(
  balance: StellarSdk.Horizon.HorizonApi.BalanceLine
): string {
  if ("asset_issuer" in balance && !balance.asset_issuer) {
    return "native";
  }
  switch (balance.asset_type) {
    case "credit_alphanum4":
    case "credit_alphanum12":
      return `${balance.asset_code}:${balance.asset_issuer}`;

    case "liquidity_pool_shares":
      return `${balance.liquidity_pool_id}:${LP_ISSUER_KEY}`;

    default:
      return "native";
  }
}

export const defaultBlockaidScanAssetResult: BlockAidScanAssetResult = {
  address: "",
  chain: "stellar",
  attack_types: {},
  fees: {},
  malicious_score: "0.0",
  metadata: {},
  financial_stats: {},
  trading_limits: {},
  result_type: "Benign",
  features: [{ description: "", feature_id: "METADATA", type: "Benign" }],
};

export const makeDisplayableBalances = async (
  accountDetails: StellarSdk.Horizon.ServerApi.AccountRecord,
  isMainnet: boolean
) => {
  const { balances, subentry_count, num_sponsored, num_sponsoring } =
    accountDetails;

  const displayableBalances = {} as BalanceMap;

  let blockaidScanResults: { [key: string]: BlockAidScanAssetResult } = {};

  if (isMainnet) {
    const url = new URL(`${INDEXER_URL}/scan-asset-bulk`);
    for (const balance of balances) {
      const balanceId = getBalanceIdentifier(balance);
      if (balanceId !== "native" && !balanceId.includes(":lp")) {
        url.searchParams.append("asset_ids", balanceId.replace(":", "-"));
      }
    }

    try {
      const response = await fetch(url.href);
      const data = await response.json();
      blockaidScanResults = data.data.results;
    } catch (e) {
      console.error(e);
    }
  }

  for (let i = 0; i < balances.length; i++) {
    const balance = balances[i];
    const identifier = getBalanceIdentifier(balance);
    const total = new BigNumber(balance.balance);

    let sellingLiabilities = "0";
    let buyingLiabilities = "0";
    let available = new BigNumber("0");

    if ("selling_liabilities" in balance) {
      sellingLiabilities = new BigNumber(
        balance.selling_liabilities
      ).toString();
      available = total.minus(sellingLiabilities);
    }

    if ("buying_liabilities" in balance) {
      buyingLiabilities = new BigNumber(balance.buying_liabilities).toString();
    }

    if (identifier === "native") {
      // define the native balance line later

      displayableBalances.native = {
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
        blockaidData: defaultBlockaidScanAssetResult,
      };
      continue;
    }

    const liquidityPoolBalance =
      balance as StellarSdk.Horizon.HorizonApi.BalanceLineLiquidityPool;
    if (identifier.includes(":lp")) {
      displayableBalances[identifier] = {
        liquidityPoolId: liquidityPoolBalance.liquidity_pool_id,
        total,
        limit: new BigNumber(liquidityPoolBalance.limit),
      } as AssetBalance;
      continue;
    }

    const assetBalance =
      balance as StellarSdk.Horizon.HorizonApi.BalanceLineAsset;
    const assetSponsor = assetBalance.sponsor
      ? { sponsor: assetBalance.sponsor }
      : {};

    displayableBalances[identifier] = {
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
      blockaidData:
        blockaidScanResults[identifier.replace(":", "-")] ||
        defaultBlockaidScanAssetResult,
      ...assetSponsor,
    };

    continue;
  }

  return displayableBalances;
};

export const isSorobanIssuer = (issuer: string) => !issuer.startsWith("G");

export const getAssetFromCanonical = (canonical: string) => {
  if (canonical === "native") {
    return StellarSdk.Asset.native();
  }
  if (canonical.includes(":")) {
    const [code, issuer] = canonical.split(":");

    if (isSorobanIssuer(issuer)) {
      return {
        code,
        issuer,
      };
    }
    return new StellarSdk.Asset(code, issuer);
  }

  throw new Error(`invalid asset canonical id: ${canonical}`);
};

export const xlmToStroop = (lumens: BigNumber | string): BigNumber => {
  if (lumens instanceof BigNumber) {
    return lumens.times(1e7);
  }
  // round to nearest stroop
  return new BigNumber(Math.round(Number(lumens) * 1e7));
};
