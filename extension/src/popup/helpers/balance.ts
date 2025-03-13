import { Asset } from "stellar-sdk";
import { captureException } from "@sentry/browser";

import {
  AssetToken,
  AssetType,
  Balance,
  SorobanBalance,
} from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { isContractId } from "./soroban";

export function isSorobanBalance(
  balance: AssetType,
): balance is SorobanBalance {
  return (balance as SorobanBalance).decimals !== undefined;
}

export const getBalanceByIssuer = (issuer: string, balances: AssetType[]) =>
  (balances as Balance[]).find((balance) => {
    if (issuer === "native") {
      return balance.token.type === "native";
    }
    if (isContractId(issuer)) {
      return balance.contractId === issuer;
    }

    // G address issuer
    return (balance.token as AssetToken).issuer.key === issuer;
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
    const matchesIssuer = contractId === balance.contractId;

    try {
      // if xlm, check for a SAC match
      if (balance.token && balance.token.code === "XLM") {
        const matchesSac =
          Asset.native().contractId(networkDetails.networkPassphrase) ===
          contractId;
        return matchesSac;
      }

      // if issuer is a G address, check for a SAC match
      if (
        balance.token &&
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
      captureException(
        `Error checking for SAC match with code ${balance.token?.code}. Error: ${e}`,
      );
    }
    return matchesIssuer;
  });
  return key;
};
