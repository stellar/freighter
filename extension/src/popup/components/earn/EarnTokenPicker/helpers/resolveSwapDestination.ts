import { NetworkDetails } from "@shared/constants/stellar";
import { getTokenDetails } from "@shared/api/internal";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";
import { DestinationTokenDetails } from "popup/ducks/transactionSubmission";
import { CLASSIC_ASSET_DECIMALS } from "popup/helpers/soroban";

import { EarnTokenOption } from "../hooks/useGetEarnTokensData";

/**
 * Resolves the canonical (`CODE:ISSUER`) and destination descriptor for a token
 * the user is about to swap into.
 *
 * A held token already carries its issuer, taken from the balance. A token the
 * account holds none of does not — the earn catalog identifies assets only by
 * contract address. For a SAC, the contract's own `name()` returns exactly the
 * canonical form (`USDC:GA5ZSEJY…`, or `native` for XLM), which is what
 * `isSacContract` already relies on to match a SAC to its classic asset.
 *
 * Returns null when the lookup fails, so callers can decline to start a swap
 * rather than send the user somewhere with a half-filled destination.
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
  let canonical = option.issuer
    ? getCanonicalFromAsset(option.code, option.issuer)
    : "";
  let issuer = option.issuer;

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
    issuer = canonical.includes(":") ? canonical.split(":")[1] : undefined;
  }

  return {
    canonical,
    details: {
      tokenCode: option.code,
      // The account holds none of it, so if it is a classic asset there is no
      // trustline yet — Swap bundles the changeTrust when this is true.
      requiresTrustline: canonical !== "native",
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
