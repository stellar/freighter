import { StrKey } from "stellar-sdk";

import { getAssetIcons } from "@shared/api/internal";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  isNativeAssetId,
  isNativeContract,
} from "@shared/helpers/assetIdentity";
import { getCanonicalFromAsset, splitCanonical } from "@shared/helpers/stellar";

/**
 * The Blend catalog identifies every asset by contract address and reports a
 * classic asset's canonical ("USDC:GA5ZSEJY…") in `name` — the only place an
 * issuer is available without resolving the SAC. Guarded on shape so an
 * unexpected `name` cannot produce a bogus canonical.
 */
export const getCatalogIssuer = (name?: string | null) => {
  const { code, issuer } = splitCanonical(name || "");
  return code && StrKey.isValidEd25519PublicKey(issuer) ? issuer : undefined;
};

/**
 * The key an asset's icon is cached under. Icons are keyed by canonical, so an
 * asset with no resolvable issuer has no key and cannot carry an icon.
 *
 * Native XLM is reported with a null symbol *and* a null name, so its contract
 * address is the only way to recognise it; its icon lives under "native".
 */
export const getCatalogIconKey = ({
  code,
  issuer,
  assetId,
  networkDetails,
}: {
  code: string;
  issuer?: string;
  assetId: string;
  networkDetails: NetworkDetails;
}) => {
  if (issuer && code) {
    return getCanonicalFromAsset(code, issuer);
  }
  if (isNativeContract(assetId, networkDetails.networkPassphrase)) {
    return "native";
  }
  return "";
};

/**
 * A catalog entry's display code, issuer and icon key.
 *
 * The code falls back through the reported symbol, the canonical's code half,
 * and finally "XLM" for the native SAC — which the catalog reports with a null
 * symbol and a null name, leaving its contract address as the only clue.
 */
export const getCatalogAssetIdentity = ({
  symbol,
  name,
  assetId,
  networkDetails,
}: {
  symbol?: string | null;
  name?: string | null;
  assetId: string;
  networkDetails: NetworkDetails;
}) => {
  const issuer = getCatalogIssuer(name);
  const isNative = isNativeContract(assetId, networkDetails.networkPassphrase);
  const code =
    symbol ||
    (issuer ? splitCanonical(name!).code : "") ||
    (isNative ? "XLM" : "");

  return {
    code,
    issuer,
    canonical: getCatalogIconKey({ code, issuer, assetId, networkDetails }),
    isNative,
  };
};

export interface EarnIconAsset {
  code: string;
  issuer?: string;
  assetId: string;
}

/**
 * Icons for catalog assets the account does not hold.
 *
 * `balances.icons` only covers held assets, so pool reserves and zero-balance
 * earn options resolve nothing there. This runs them through getAssetIcons'
 * `additionalAssetIds`, the path Swap uses for an unheld destination: the icon
 * cache, then the verified token lists, then the issuer's TOML, each keyed by
 * the canonical the picker reads. Bounded work: a pool has a handful of
 * reserves.
 *
 * Returns a canonical-keyed map, including the `null`s getAssetIcons records for
 * assets it checked and could not resolve.
 */
export const resolveEarnAssetIcons = async ({
  assets,
  networkDetails,
  cachedIcons,
  assetsListsData,
}: {
  assets: EarnIconAsset[];
  networkDetails: NetworkDetails;
  cachedIcons: Record<string, string | null>;
  assetsListsData: AssetListResponse[];
}) => {
  // Native's icon is bundled, and a keyless asset has nothing to look up.
  const additionalAssetIds = assets
    .map((asset) => getCatalogIconKey({ ...asset, networkDetails }))
    .filter((key) => key && !isNativeAssetId(key));

  if (!additionalAssetIds.length) {
    return {} as Record<string, string | null>;
  }

  return getAssetIcons({
    balances: null,
    networkDetails,
    assetsListsData,
    cachedIcons,
    additionalAssetIds,
  });
};
