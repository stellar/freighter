import BigNumber from "bignumber.js";

import { AssetIcons, ProtocolEntry } from "@shared/api/types";
import { AssetType } from "@shared/api/types/account-balance";
import { SwapRoute } from "@shared/api/types/backend-api";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { findTokenListIcon } from "@shared/api/helpers/getIconFromTokenList";
import { getCanonicalFromAsset, splitCanonical } from "@shared/helpers/stellar";
import { isNativeAssetPair } from "@shared/helpers/assetIdentity";
import { truncateString } from "helpers/stellar";
import { isContractId } from "popup/helpers/soroban";
import StellarLogo from "popup/assets/stellar-logo.png";

export const MAX_PATH_VENUE_ICONS = 3;

export interface RouteToken {
  code: string;
  /** "" for XLM, a G… issuer, or a C… contract ID. */
  issuer: string;
  canonical: string;
  icon: string | null;
}

export interface RouteVenue {
  name: string;
  /** null when /protocols doesn't list the venue: render the generic icon. */
  icon: string | null;
}

export interface RoutePathView {
  /** "32%"; null for a share that isn't positive (no pill). */
  share: string | null;
  /** One per hop, in order. */
  venues: RouteVenue[];
  /** hops + 1 tokens; venues[i] sits between tokens[i] and tokens[i + 1]. */
  tokens: RouteToken[];
  /** null on classic routes, which don't report pools. */
  poolCount: number | null;
}

export interface RouteView {
  from: RouteToken;
  to: RouteToken;
  paths: RoutePathView[];
  providers: RouteVenue[];
  /** Horizon routes: no pool on any hop. */
  isClassic: boolean;
}

export interface RouteTokenContext {
  /** Tokens the screen already shows, keyed by backend asset ID. */
  known: Record<string, RouteToken>;
  icons: AssetIcons;
  balances: AssetType[];
  tokenLists: AssetListResponse[];
}

export const formatShare = (share: string): string | null => {
  const pct = new BigNumber(share).multipliedBy(100);
  if (!pct.isFinite() || pct.lte(0)) {
    return null;
  }
  if (pct.lt(1)) {
    return "<1%";
  }
  return `${pct.integerValue(BigNumber.ROUND_HALF_UP).toFixed()}%`;
};

const findHeldContractCode = (balances: AssetType[], contractId: string) => {
  for (const balance of balances) {
    if (
      "contractId" in balance &&
      balance.contractId === contractId &&
      balance.token.code
    ) {
      return balance.token.code;
    }
  }
  return undefined;
};

const findListedContract = (
  tokenLists: AssetListResponse[],
  contractId: string,
) => {
  for (const list of tokenLists) {
    const record = list.assets?.find((a) => a.contract === contractId);
    if (record) {
      return record;
    }
  }
  return undefined;
};

export const resolveRouteToken = (
  assetId: string,
  { known, icons, balances, tokenLists }: RouteTokenContext,
): RouteToken => {
  if (known[assetId]) {
    return known[assetId];
  }
  const { code, issuer } = splitCanonical(assetId);
  if (isNativeAssetPair(code, issuer)) {
    return { code, issuer: "", canonical: "native", icon: null };
  }
  if (isContractId(assetId)) {
    const listed = findListedContract(tokenLists, assetId);
    const contractCode =
      findHeldContractCode(balances, assetId) ||
      listed?.code ||
      truncateString(assetId);
    const canonical = getCanonicalFromAsset(contractCode, assetId);
    return {
      code: contractCode,
      issuer: assetId,
      canonical,
      icon: icons[canonical] || listed?.icon || null,
    };
  }
  const canonical = getCanonicalFromAsset(code, issuer);
  return {
    code,
    issuer,
    canonical,
    icon:
      icons[canonical] ||
      findTokenListIcon({ issuerId: issuer, code, assetsListsData: tokenLists })
        .icon ||
      null,
  };
};

// Backend venue strings and /protocols names compare like mobile's venueKey.
const venueKey = (name: string) => name.trim().toLowerCase();

export const resolveVenue = (
  venue: string,
  protocols: ProtocolEntry[],
): RouteVenue => {
  const key = venueKey(venue);
  // Not in /protocols: it would show up in Discover.
  if (key === "stellar-dex") {
    return { name: "Stellar DEX", icon: StellarLogo };
  }
  const match = protocols.find((p) => venueKey(p.name) === key);
  return match
    ? { name: match.name, icon: match.iconUrl || null }
    : { name: venue, icon: null };
};

/** null when the route has nothing to show. */
export const buildRouteView = ({
  route,
  tokenContext,
  protocols,
}: {
  route: SwapRoute | null | undefined;
  tokenContext: RouteTokenContext;
  protocols: ProtocolEntry[];
}): RouteView | null => {
  const paths = (route?.paths ?? []).filter((p) => p.hops?.length);
  if (!paths.length) {
    return null;
  }
  const isClassic = paths.every((p) => p.hops.every((h) => !h.pool));
  const providers = new Map<string, RouteVenue>();

  const pathViews = paths.map((path) => {
    const venues = path.hops.map((hop) => {
      const resolved = resolveVenue(hop.venue, protocols);
      const key = resolved.name.toLowerCase();
      if (!providers.has(key)) {
        providers.set(key, resolved);
      }
      return resolved;
    });
    const tokens = [
      resolveRouteToken(path.hops[0].from, tokenContext),
      ...path.hops.map((hop) => resolveRouteToken(hop.to, tokenContext)),
    ];
    const pools = path.hops.filter((h) => h.pool).length;
    return {
      share: formatShare(path.share),
      venues,
      tokens,
      poolCount: pools > 0 ? pools : null,
    };
  });

  return {
    from: pathViews[0].tokens[0],
    to: pathViews[0].tokens[pathViews[0].tokens.length - 1],
    paths: pathViews,
    providers: [...providers.values()],
    isClassic,
  };
};
