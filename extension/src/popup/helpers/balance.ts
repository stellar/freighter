import { Asset, Networks } from "stellar-sdk";
import { captureException } from "@sentry/browser";

import { getCanonicalFromAsset, isAsset } from "helpers/stellar";
import { AssetToken } from "@shared/api/types";
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
    return balanceIssuer === asset.issuer;
  }) as Exclude<AssetType, LiquidityPoolShareAsset> | undefined;
};

export const getBalanceByIssuer = (issuer: string, balances: AssetType[]) =>
  balances.find((balance) => {
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
      balance.token.issuer.key === issuer
    );
  });

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
