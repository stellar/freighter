import { AssetType } from "@shared/api/types/account-balance";
import { NetworkDetails } from "@shared/constants/stellar";
import { isAssetSac, isContractId } from "popup/helpers/soroban";

/**
 * Whether a held balance matches the swap-from ("Swap from") search term.
 * Matches by token code, classic issuer, or Soroban contractId; and — when the
 * term is itself a contract id — by the held classic/native token's derived SAC
 * address, so a pasted SAC resolves to the token it wraps without an API call
 * (§ task 2). The destination picker gets the equivalent SAC match back from
 * stellar.expert; this keeps the source picker symmetric.
 */
export const matchesSwapFromSearch = ({
  balance,
  searchTerm,
  networkDetails,
}: {
  balance: AssetType;
  searchTerm: string;
  networkDetails: NetworkDetails;
}): boolean => {
  const term = searchTerm.toLowerCase();
  const trimmed = searchTerm.trim();

  if ("token" in balance && balance.token.code.toLowerCase().includes(term)) {
    return true;
  }
  if (
    "token" in balance &&
    "issuer" in balance.token &&
    balance.token.issuer.key.toLowerCase().includes(term)
  ) {
    return true;
  }
  if (
    "contractId" in balance &&
    balance.contractId.toLowerCase().includes(term)
  ) {
    return true;
  }
  // SAC: derive the held token's SAC address (no API) and compare to a pasted
  // contract id. Gated on the term being a contract id so the derivation only
  // runs for that case.
  if (
    isContractId(trimmed) &&
    "token" in balance &&
    isAssetSac({
      asset: {
        code: balance.token.code,
        issuer:
          "issuer" in balance.token ? balance.token.issuer.key : undefined,
        contract: trimmed,
      },
      networkDetails,
    })
  ) {
    return true;
  }
  return false;
};
