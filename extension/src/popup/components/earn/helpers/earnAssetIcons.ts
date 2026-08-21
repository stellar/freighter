import { Asset, StrKey } from "stellar-sdk";

import { getAssetIcons } from "@shared/api/internal";
import { Balances } from "@shared/api/types/backend-api";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { NetworkDetails } from "@shared/constants/stellar";
import { getCanonicalFromAsset } from "@shared/helpers/stellar";

/**
 * The Blend catalog identifies every asset by contract address and reports a
 * classic asset's canonical ("USDC:GA5ZSEJY…") in `name` — the only place an
 * issuer is available without resolving the SAC. Guarded on shape so an
 * unexpected `name` cannot produce a bogus canonical.
 */
export const getCatalogIssuer = (name?: string | null) => {
  const parts = name ? name.split(":") : [];
  return parts.length === 2 && StrKey.isValidEd25519PublicKey(parts[1])
    ? parts[1]
    : undefined;
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
  if (assetId === Asset.native().contractId(networkDetails.networkPassphrase)) {
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
  const isNative =
    assetId === Asset.native().contractId(networkDetails.networkPassphrase);
  const code =
    symbol || (issuer ? name!.split(":")[0] : "") || (isNative ? "XLM" : "");

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
 * earn options resolve nothing there. This runs them through the same path
 * balances use — the icon cache, then the verified token lists, then the
 * issuer's TOML — by handing getAssetIcons a balance-shaped record per asset.
 * Bounded work: a pool has a handful of reserves.
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
  const lookupBalances = assets.reduce((acc, asset) => {
    const key = getCatalogIconKey({ ...asset, networkDetails });
    if (!key || key === "native") {
      // Native's icon is bundled, and a keyless asset has nothing to look up.
      return acc;
    }
    return {
      ...acc,
      [key]: {
        token: { code: asset.code, issuer: { key: asset.issuer! } },
        contractId: asset.assetId,
      },
    };
  }, {});

  if (!Object.keys(lookupBalances).length) {
    return {} as Record<string, string | null>;
  }

  // getAssetIcons only reads each entry's `token` and `contractId`; BalanceMap's
  // required `native` key and its amount fields would be noise here.
  return getAssetIcons({
    balances: lookupBalances as unknown as Balances,
    networkDetails,
    assetsListsData,
    cachedIcons,
  });
};
