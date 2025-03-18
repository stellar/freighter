import { Asset } from "stellar-sdk";
import { captureException } from "@sentry/browser";

import { AssetToken } from "@shared/api/types";
import { AssetType, SorobanAsset } from "@shared/api/types/account-balance";
import { NetworkDetails } from "@shared/constants/stellar";
import { isContractId } from "./soroban";

export const isSorobanBalance = (balance: AssetType): balance is SorobanAsset =>
  "contractId" in balance;

export const getBalanceByIssuer = (issuer: string, balances: AssetType[]) =>
  balances.find((balance) => {
    if ("token" in balance && "type" in balance.token) {
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
        const sacAddress = new Asset(
          balance.token.code,
          assetToken.issuer.key,
        ).contractId(networkDetails.networkPassphrase);
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
