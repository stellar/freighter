import { Networks } from "stellar-sdk";

import { NetworkDetails } from "@shared/constants/stellar";
import { getTokenDetails } from "@shared/api/internal";
import {
  isNativeAssetId,
  isNativeContract,
} from "@shared/helpers/assetIdentity";
import { isSacContract } from "@shared/helpers/soroban/token";
import { getCanonicalFromAsset, splitCanonical } from "@shared/helpers/stellar";
import { DestinationTokenDetails } from "popup/ducks/transactionSubmission";
import { CLASSIC_ASSET_DECIMALS, isContractId } from "popup/helpers/soroban";

import { EarnTokenOption } from "../hooks/useGetEarnTokensData";

/**
 * Resolves the canonical (`CODE:ISSUER`) and destination descriptor for a token
 * the user is about to swap into.
 *
 * A classic issuer, taken from the balance or the catalog's canonical, names
 * the asset outright. Without one — no issuer, or a contract as issuer — the
 * contract is asked: for a SAC, its own `name()` returns exactly the canonical
 * form (`USDC:GA5ZSEJY…`, or `native` for XLM), which is what `isSacContract`
 * already relies on to match a SAC to its classic asset. A contract token's
 * name is no canonical, so it is declined: Swap buys classic assets only.
 *
 * Returns null when the lookup fails, or when the asset found is not the one
 * the pool takes, so callers can decline to start a swap rather than send the
 * user somewhere with a half-filled or different destination.
 */
export const resolveSwapDestination = async ({
  option,
  publicKey,
  networkDetails,
}: {
  option: EarnTokenOption;
  publicKey: string;
  networkDetails: NetworkDetails;
}): Promise<{
  canonical: string;
  details: DestinationTokenDetails;
} | null> => {
  // Only a classic issuer names the asset a swap can buy. A contract issuer
  // is what a contract token gets, but also a SAC the catalog reported
  // without its canonical, so the contract is asked instead.
  const classicIssuer =
    option.issuer && !isContractId(option.issuer) ? option.issuer : undefined;
  let canonical = classicIssuer
    ? getCanonicalFromAsset(option.code, classicIssuer)
    : "";
  let issuer = classicIssuer;

  if (!canonical) {
    const tokenDetails = await getTokenDetails({
      contractId: option.assetId,
      publicKey,
      networkDetails,
    });

    if (!tokenDetails?.name) {
      return null;
    }

    canonical = tokenDetails.name;
    // "native" has no issuer half; everything else is CODE:ISSUER.
    issuer = splitCanonical(canonical).issuer || undefined;
  }

  // The swap has to buy the token the pool takes. A SAC's address is derived
  // from its asset, so the asset found is that token only when its contract is
  // the one the pool lists; anything else is some other asset.
  const isPoolAsset = isNativeAssetId(canonical)
    ? isNativeContract(option.assetId, networkDetails.networkPassphrase)
    : isSacContract(
        canonical,
        option.assetId,
        networkDetails.networkPassphrase as Networks,
      );
  if (!isPoolAsset) {
    return null;
  }

  return {
    canonical,
    details: {
      tokenCode: option.code,
      // The account holds none of it, so if it is a classic asset there is no
      // trustline yet — Swap bundles the changeTrust when this is true.
      requiresTrustline: !isNativeAssetId(canonical),
      // `??`, matching the picker: `||` would rewrite a genuine 0-decimal
      // token to 7.
      decimals: option.decimals ?? CLASSIC_ASSET_DECIMALS,
      issuer,
      // Carry the row's icon across: the swap screens read the destination's
      // logo from here precisely because a non-held token is absent from the
      // balances icon map, and without it the receive pill, the review row and
      // the terminal summary all fall back to a placeholder.
      iconUrl: option.iconUrl || undefined,
    },
  };
};
