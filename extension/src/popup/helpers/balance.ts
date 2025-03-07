import { Asset } from "stellar-sdk";
import { captureException } from "@sentry/browser";

import { AssetToken, AssetType } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { isContractId } from "./soroban";

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

    // if issuer is a G address or xlm, check for a SAC match
    // TODO: check for correctness of the AssetType issuer
    if (
      (balance.token &&
        "issuer" in balance.token &&
        !isContractId(balance.token.issuer.key)) ||
      (balance.token && balance.token.code === "XLM")
    ) {
      const assetToken = balance.token as AssetToken;
      try {
        const sacAddress = new Asset(
          balance.token.code,
          assetToken.issuer.key,
        ).contractId(networkDetails.networkPassphrase);
        const matchesSac = contractId === sacAddress;
        return matchesSac;
      } catch (e) {
        console.error(e);
        captureException(
          `Error checking for SAC match with code ${balance.token.code} and issuer ${assetToken.issuer.key}. Error: ${e}`,
        );
      }
    }
    return matchesIssuer;
  });
  return key;
};
