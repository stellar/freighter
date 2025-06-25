import { Asset, Networks } from "stellar-sdk";
import { captureException } from "@sentry/browser";
import BigNumber from "bignumber.js";

import {
  getAssetFromCanonical,
  getCanonicalFromAsset,
  isAsset,
} from "helpers/stellar";
import { ApiTokenPrices, AssetToken } from "@shared/api/types";
import {
  AssetType,
  ClassicAsset,
  LiquidityPoolShareAsset,
  SorobanAsset,
} from "@shared/api/types/account-balance";
import { NetworkDetails } from "@shared/constants/stellar";
import { getAssetSacAddress } from "@shared/helpers/soroban/token";
import { isContractId } from "./soroban";

export const isClassicBalance = (balance: AssetType): balance is ClassicAsset =>
  "token" in balance && "issuer" in balance.token;

export const isSorobanBalance = (balance: AssetType): balance is SorobanAsset =>
  "contractId" in balance;

export const findAssetBalance = (
  balances: AssetType[],
  asset: Asset | { issuer: string; code: string },
) => {
  if (isAsset(asset) && asset.isNative()) {
    return balances.find(
      (balance) =>
        "token" in balance &&
        "type" in balance.token &&
        balance.token.type === "native",
    ) as Exclude<AssetType, SorobanAsset | LiquidityPoolShareAsset> | undefined;
  }
  return balances.find((balance) => {
    const balanceIssuer =
      "token" in balance && "issuer" in balance.token
        ? balance.token.issuer.key
        : "";
    const balanceCode =
      "token" in balance && "code" in balance.token ? balance.token.code : "";
    return balanceIssuer === asset.issuer && balanceCode === asset.code;
  }) as Exclude<AssetType, LiquidityPoolShareAsset> | undefined;
};

export const getBalanceByAsset = (
  asset: Asset | { issuer: string; code: string },
  balances: AssetType[],
) => {
  const code = asset.code;
  const issuer = asset.issuer;

  return balances.find((balance) => {
    if ("token" in balance && "type" in balance.token && !issuer) {
      return balance.token.type === "native";
    }
    if (isContractId(issuer)) {
      return "contractId" in balance && balance.contractId === issuer;
    }

    // G address issuer
    return (
      "token" in balance &&
      "issuer" in balance.token &&
      balance.token.issuer.key === issuer &&
      balance.token.code === code
    );
  });
};

/*
  Attempts to match a balance to a related contract ID, expects a token or SAC contract ID.
*/
export const getBalanceByKey = (
  contractId: string,
  balances: AssetType[],
  networkDetails: NetworkDetails,
) => {
  const key = balances.find((balance) => {
    const matchesIssuer =
      "contractId" in balance && contractId === balance.contractId;

    try {
      // if xlm, check for a SAC match
      if ("token" in balance && balance.token.code === "XLM") {
        const matchesSac =
          Asset.native().contractId(networkDetails.networkPassphrase) ===
          contractId;
        return matchesSac;
      }

      // if issuer is a G address, check for a SAC match
      if (
        "token" in balance &&
        "issuer" in balance.token &&
        !isContractId(balance.token.issuer.key)
      ) {
        const assetToken = balance.token as AssetToken;
        const canonicalName = getCanonicalFromAsset(
          balance.token.code,
          assetToken.issuer.key,
        );
        const sacAddress = getAssetSacAddress(
          canonicalName,
          networkDetails.networkPassphrase as Networks,
        );
        const matchesSac = contractId === sacAddress;
        return matchesSac;
      }
    } catch (e) {
      console.error(e);
      const id =
        "token" in balance ? balance.token.code : balance.liquidityPoolId;
      captureException(
        `Error checking for SAC match with id ${id}. Error: ${e}`,
      );
    }
    return matchesIssuer;
  });
  return key;
};

export const findAddressBalance = (
  balances: AssetType[],
  address: string,
  network: Networks,
) => {
  if (address === "native") {
    return balances.find(
      (balance) =>
        "token" in balance &&
        "type" in balance.token &&
        balance.token.type === "native",
    );
  }
  if (isContractId(address)) {
    // first check for contract ID match, then check for SAC match
    return balances.find((balance) => {
      if ("contractId" in balance) {
        return address === balance.contractId;
      }
      if ("token" in balance && "issuer" in balance.token) {
        const canonical = getCanonicalFromAsset(
          balance.token.code,
          balance.token.issuer.key,
        );
        const sacAddress = getAssetSacAddress(canonical, network);
        return sacAddress === address;
      }
      return false;
    });
  }

  return balances.find((balance) => {
    const balanceIssuer =
      "token" in balance && "issuer" in balance.token
        ? balance.token.issuer.key
        : "";
    return balanceIssuer === address;
  });
};

export const getPriceDeltaColor = (delta: BigNumber) => {
  if (delta.isZero()) {
    return "";
  }

  if (delta.isNegative()) {
    return "negative";
  }
  if (delta.isPositive()) {
    return "positive";
  }
  return "";
};

export const getTotalUsd = (prices: ApiTokenPrices, balances: AssetType[]) => {
  return Object.keys(prices).reduce((prev, curr) => {
    const asset = getAssetFromCanonical(curr);
    const priceBalance = getBalanceByAsset(asset, balances);
    if (!priceBalance) {
      return prev;
    }
    const currentAssetBalance = priceBalance.total;
    const currentPrice = prices[curr] ? prices[curr].currentPrice : "0";
    const currentUsdBalance = new BigNumber(currentPrice).multipliedBy(
      currentAssetBalance,
    );
    return currentUsdBalance.plus(prev);
  }, new BigNumber(0));
};
