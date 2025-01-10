import { Asset } from "stellar-sdk";
import { captureException } from "@sentry/browser";

import { BalanceMap } from "@shared/api/types";
import { LP_ISSUER_KEY } from "@shared/helpers/stellar";
import { NetworkDetails } from "@shared/constants/stellar";
import { isContractId } from "./soroban";

/*
  Attempts to match a balance to a related contract ID, expects a token or SAC contract ID.

  BalanceMap keys can be one of two variants - 
  An asset balance - {code}:{issuer}
  A token - {symbol}:{contract id}
  An LP share - {LP ID}:lp
*/
export const getBalanceByKey = (
  contractId: string,
  balances: BalanceMap,
  networkDetails: NetworkDetails,
) => {
  const key = Object.keys(balances).find((balanceKey) => {
    const [code, issuer] =
      balanceKey === "native" ? ["XLM"] : balanceKey.split(":");
    const matchesIssuer = contractId === issuer;

    // if issuer is a G address or xlm, check for a SAC match
    if (
      (issuer && !isContractId(issuer) && issuer !== LP_ISSUER_KEY) ||
      code === "XLM"
    ) {
      try {
        const sacAddress = new Asset(code, issuer).contractId(
          networkDetails.networkPassphrase,
        );
        const matchesSac = contractId === sacAddress;
        return matchesSac;
      } catch (e) {
        console.error(e);
        captureException(
          `Error checking for SAC match with code ${code} and issuer ${issuer}. Error: ${e}`,
        );
      }
    }
    return matchesIssuer;
  });
  return key;
};
