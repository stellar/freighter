import { useReducer, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { captureException } from "@sentry/browser";
import BigNumber from "bignumber.js";

import { NetworkDetails } from "@shared/constants/stellar";
import { ApiTokenPrices, BlockAidScanAssetResult } from "@shared/api/types";
import { AssetListResponse } from "@shared/constants/soroban/asset-list";
import { getCombinedAssetListData } from "@shared/api/helpers/token-list";
import { AssetType } from "@shared/api/types/account-balance";

import { initialState, reducer } from "helpers/request";
import { RequestState } from "constants/request";
import { isMainnet, getCanonicalFromAsset } from "helpers/stellar";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { SecurityLevel } from "popup/constants/blockaid";
import { searchAsset } from "popup/helpers/searchAsset";
import { splitVerifiedAssetCurrency } from "popup/helpers/assetList";
import { isContractId } from "popup/helpers/soroban";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";
import { sortBalancesByValue } from "popup/helpers/balance";
import {
  scanAssetBulk,
  isAssetMalicious,
  isAssetSuspicious,
  shouldTreatAssetAsUnableToScan,
  isBlockaidEnabled,
} from "popup/helpers/blockaid";
import { settingsSelector } from "popup/ducks/settings";
import {
  tokensListsSelector,
  saveTokenLists,
  popularTokensSelector,
  savePopularTokens,
  POPULAR_TOKENS_STALE_MS,
} from "popup/ducks/cache";
import { AppDispatch, store } from "popup/App";
import {
  fetchTrendingAssets,
  TrendingAsset,
} from "popup/helpers/trendingAssets";

// Re-export RequestState for consumers
export { RequestState };

const MAX_ASSETS_TO_SCAN = 10;

export interface SwapTokenRecord extends ManageAssetCurrency {
  canonical: string;
  isHeld: boolean;
  isContract: boolean;
  requiresTrustline: boolean;
  securityLevel?: SecurityLevel;
  /** Formatted held-token balance (held rows only). */
  tokenAmount?: string;
  fiatValue?: string;
  percentChange24h?: string;
  /** USD spot price from the stellar.expert search result (non-held tokens),
   * used as a fallback when /token-prices has no entry. No 24h % available. */
  spotPrice?: number;
}

export interface SwapTokenLookupResult {
  sections: {
    yourTokens: SwapTokenRecord[];
    popular: SwapTokenRecord[];
    verified: SwapTokenRecord[];
    unverified: SwapTokenRecord[];
  };
  isSearch: boolean;
  hadSorobanMatches: boolean;
  isFallback: boolean;
}

export const EMPTY_RESULT: SwapTokenLookupResult = {
  sections: { yourTokens: [], popular: [], verified: [], unverified: [] },
  isSearch: false,
  hadSorobanMatches: false,
  isFallback: false,
};

// ---- pure helpers (exported for unit tests) ----

/**
 * Converts a held balance entry (AssetType) into a SwapTokenRecord.
 * Returns null for LiquidityPoolShareAsset entries (no code/issuer).
 */
const heldToRecord = (
  balance: AssetType,
  icons: Record<string, string | null> = {},
  tokenPrices: ApiTokenPrices = {},
): SwapTokenRecord | null => {
  // Classic-only: swaps run over the Classic path, so the "Your tokens" list
  // shows native + classic assets only. Exclude liquidity-pool shares (no token)
  // and custom Soroban contract tokens (carry a contractId).
  if (!("token" in balance) || !balance.token || "contractId" in balance) {
    return null;
  }
  const token = balance.token as {
    code: string;
    type?: string;
    issuer?: { key: string };
  };
  const isNative =
    token.type === "native" || (token.code === "XLM" && !token.issuer);
  const code = isNative ? "XLM" : token.code;
  const issuer = isNative ? "" : token.issuer?.key || "";
  const canonical = isNative ? "native" : getCanonicalFromAsset(code, issuer);

  // Held-token balance, fiat value and 24h delta (mirrors the account-home row).
  const total = new BigNumber(
    (balance as { total?: BigNumber.Value }).total ?? 0,
  );
  const tokenAmount = formatAmount(total.toFixed());
  const price = tokenPrices[canonical];
  const fiatValue = price?.currentPrice
    ? `$${formatAmount(
        roundUsdValue(
          new BigNumber(price.currentPrice).multipliedBy(total).toString(),
        ),
      )}`
    : undefined;
  const percentChange24h = price?.percentagePriceChange24h || undefined;

  return {
    code,
    issuer,
    domain: null,
    canonical,
    // Held tokens carry no icon URL of their own — pull it from the account's
    // icons map (keyed by canonical) so "Your tokens" rows show real logos.
    image: icons[canonical] || undefined,
    tokenAmount,
    fiatValue,
    percentChange24h,
    isHeld: true,
    isContract: false,
    requiresTrustline: false,
  };
};

/**
 * Maps an account's held balances into SwapTokenRecords for the "Your tokens"
 * list. Used directly by the Swap source picker (which shows held tokens only)
 * and indirectly via buildSwapSections for the destination picker.
 */
export const balancesToHeldRecords = ({
  balances,
  icons = {},
  tokenPrices = {},
}: {
  balances: AssetType[];
  icons?: Record<string, string | null>;
  tokenPrices?: ApiTokenPrices;
}): SwapTokenRecord[] =>
  // Sort by descending fiat value, matching the account-home balances list.
  sortBalancesByValue(balances, tokenPrices)
    .map((b) => heldToRecord(b, icons, tokenPrices))
    .filter((r): r is SwapTokenRecord => r !== null);

/**
 * Converts a ManageAssetCurrency (search/popular result) into a SwapTokenRecord.
 */
const currencyToRecord = (
  asset: ManageAssetCurrency,
  isHeld: boolean,
): SwapTokenRecord => {
  const isNative = asset.code === "XLM" && !asset.issuer;
  const canonical = isNative
    ? "native"
    : getCanonicalFromAsset(asset.code || "", asset.issuer || "");
  const isContract = !!(asset.contract && isContractId(asset.contract));
  return {
    ...asset,
    canonical,
    isHeld,
    isContract,
    requiresTrustline: !isHeld && !isNative,
    spotPrice: asset.price,
  };
};

/**
 * Builds the section data for the swap destination picker.
 *
 * Idle (no searchTerm):  yourTokens + popular (volume7d ∩ verified, held filtered out)
 * Search (searchTerm):   yourTokens + verified + unverified (mutually exclusive, deduped)
 * Fallback:              yourTokens only (held-in-memory filter), popular/verified/unverified empty
 *
 * Classic-only: any non-SAC Soroban contract is stripped and sets hadSorobanMatches = true.
 */
export const buildSwapSections = ({
  searchTerm,
  balances,
  popular = [],
  verifiedAssets = [],
  unverifiedAssets = [],
  searchResults = [],
  isFallback = false,
  icons = {},
  tokenPrices = {},
}: {
  searchTerm: string;
  balances: AssetType[];
  // Accepted for call-site symmetry with the lookup context; the record filter
  // no longer needs the network (it keys purely on contract-id shape).
  networkDetails: NetworkDetails;
  popular?: TrendingAsset[];
  verifiedAssets?: ManageAssetCurrency[];
  unverifiedAssets?: ManageAssetCurrency[];
  searchResults?: ManageAssetCurrency[];
  isFallback?: boolean;
  icons?: Record<string, string | null>;
  tokenPrices?: ApiTokenPrices;
}): SwapTokenLookupResult => {
  const term = searchTerm.trim().toLowerCase();
  const isSearch = term.length > 0;

  const heldRecords = balancesToHeldRecords({ balances, icons, tokenPrices });
  const heldCanonicals = new Set(heldRecords.map((r) => r.canonical));

  // Classic-only filter, mirroring mobile's isSorobanRecord
  // (isContractId(record.asset)): drop any record whose issuer or contract is a
  // contract id — i.e. a custom Soroban token. Classic CODE-ISSUER records are
  // kept, including SAC-backed assets, which stellar.expert returns in their
  // classic form (a bare SAC contract id has no classic representation to swap).
  // Side-effect: sets hadSorobanMatches so the picker can show the "try a
  // Classic token" empty state.
  let hadSorobanMatches = false;
  const isClassic = (asset: ManageAssetCurrency): boolean => {
    const isSorobanContract =
      (asset.contract && isContractId(asset.contract)) ||
      (asset.issuer && isContractId(asset.issuer));
    if (isSorobanContract) {
      hadSorobanMatches = true;
      return false;
    }
    return true;
  };

  if (!isSearch) {
    // IDLE mode
    const verifiedKeys = new Set(
      verifiedAssets.map((a) =>
        getCanonicalFromAsset(a.code || "", a.issuer || ""),
      ),
    );
    const popularRecords = popular
      .map(
        (p): ManageAssetCurrency => ({
          code: p.code,
          issuer: p.issuer,
          contract: p.contract,
          domain: p.domain,
          image: p.icon,
        }),
      )
      .filter(isClassic)
      .map((a) => currencyToRecord(a, false))
      .filter(
        (r) =>
          !heldCanonicals.has(r.canonical) && verifiedKeys.has(r.canonical),
      );

    return {
      sections: {
        yourTokens: heldRecords,
        popular: isFallback ? [] : popularRecords,
        verified: [],
        unverified: [],
      },
      isSearch: false,
      hadSorobanMatches,
      isFallback,
    };
  }

  // SEARCH mode
  const matchesTerm = (r: SwapTokenRecord): boolean =>
    (r.code || "").toLowerCase().includes(term) ||
    (r.issuer || "").toLowerCase().includes(term) ||
    (r.domain || "").toLowerCase().includes(term);

  const yourTokens = heldRecords.filter(matchesTerm);

  if (isFallback) {
    return {
      sections: { yourTokens, popular: [], verified: [], unverified: [] },
      isSearch: true,
      hadSorobanMatches: false,
      isFallback: true,
    };
  }

  const heldSearchKeys = new Set(yourTokens.map((r) => r.canonical));

  // Dedupe by canonical, exclude held (already in yourTokens)
  const dedupe = (assets: ManageAssetCurrency[]): SwapTokenRecord[] => {
    const seen = new Set<string>();
    return assets
      .filter(isClassic)
      .map((a) => currencyToRecord(a, false))
      .filter((r) => {
        if (heldSearchKeys.has(r.canonical) || seen.has(r.canonical)) {
          return false;
        }
        seen.add(r.canonical);
        return true;
      });
  };

  // Scan searchResults for Soroban entries to ensure hadSorobanMatches is set
  // even when the split already stripped them from verifiedAssets/unverifiedAssets.
  searchResults.forEach((a) => isClassic(a));

  return {
    sections: {
      yourTokens,
      popular: [],
      verified: dedupe(verifiedAssets),
      unverified: dedupe(unverifiedAssets),
    },
    isSearch: true,
    hadSorobanMatches,
    isFallback: false,
  };
};

/**
 * Stamps a securityLevel onto each SwapTokenRecord based on the bulk-scan result map.
 * The map is keyed by "CODE-ISSUER" (matching how scanAssetBulk IDs are built).
 * Native XLM (no issuer) is always trusted and left unmodified.
 */
export const mergeScanResults = ({
  rows,
  scanResults,
  networkDetails,
}: {
  rows: SwapTokenRecord[];
  scanResults: Record<string, BlockAidScanAssetResult>;
  networkDetails: NetworkDetails;
}): SwapTokenRecord[] =>
  rows.map((row) => {
    if (!row.issuer) {
      // Native XLM — always trusted
      return row;
    }
    const scan = scanResults[`${row.code}-${row.issuer}`];
    let securityLevel: SecurityLevel;
    if (shouldTreatAssetAsUnableToScan(scan, null, networkDetails)) {
      securityLevel = SecurityLevel.UNABLE_TO_SCAN;
    } else if (isAssetMalicious(scan)) {
      securityLevel = SecurityLevel.MALICIOUS;
    } else if (isAssetSuspicious(scan)) {
      securityLevel = SecurityLevel.SUSPICIOUS;
    } else {
      securityLevel = SecurityLevel.SAFE;
    }
    return { ...row, securityLevel };
  });

// ---- helper to convert a Stellar Expert search record to ManageAssetCurrency ----

interface AssetSearchRecord {
  asset: string;
  domain?: string;
  code?: string;
  token_name?: string;
  decimals?: number;
  /** USD spot price (stellar.expert). */
  price?: number;
  tomlInfo?: {
    image?: string;
    code?: string;
    issuer?: string;
    name?: string;
  };
}

const recordFromSearchResult = (
  record: AssetSearchRecord,
): ManageAssetCurrency => {
  if (isContractId(record.asset)) {
    return {
      code: record.code || record.tomlInfo?.code || "",
      issuer: record.asset,
      contract: record.asset,
      domain: record.domain ?? null,
      image: record.tomlInfo?.image,
      price: record.price,
    };
  }
  return {
    code: record.asset.split("-")[0],
    issuer: record.asset.split("-")[1],
    domain: record.domain ?? null,
    image: record.tomlInfo?.image,
    price: record.price,
  };
};

// Module-scoped cache of the last successful IDLE (no search term) lookup per
// network. It survives component remounts within a popup session, so
// re-entering the picker repaints instantly instead of flashing a spinner
// (§1.10), and it's served as a fallback when a fresh idle fetch fails (§5.4)
// rather than dropping Popular to held-only. In-memory only — it dies on popup
// close; cross-session disk persistence (§5.3) is a separate concern.
const swapIdleResultCacheByNetwork = new Map<string, SwapTokenLookupResult>();

/** Test-only: clear the module-scoped idle cache between tests. */
export const resetSwapIdleCacheForTests = () => {
  swapIdleResultCacheByNetwork.clear();
};

// ---- the hook ----

export const useSwapTokenLookup = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const reduxDispatch = useDispatch<AppDispatch>();
  const { assetsLists } = useSelector(settingsSelector);

  const [state, dispatch] = useReducer(
    reducer<SwapTokenLookupResult, unknown>,
    initialState,
  );

  const fetchData = async ({
    searchTerm,
    balances,
    publicKey: _publicKey,
    networkDetails,
    icons = {},
    tokenPrices = {},
  }: {
    searchTerm: string;
    balances: AssetType[];
    publicKey: string;
    networkDetails: NetworkDetails;
    icons?: Record<string, string | null>;
    tokenPrices?: ApiTokenPrices;
  }): Promise<void> => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    // On idle re-entry, repaint instantly from the last cached result and
    // revalidate silently (no spinner). Search has no such cache — show the
    // spinner while it loads (§1.10).
    const isIdle = !searchTerm.trim();
    const cachedIdleResult = isIdle
      ? swapIdleResultCacheByNetwork.get(networkDetails.network)
      : undefined;
    if (cachedIdleResult) {
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: cachedIdleResult });
    } else {
      dispatch({ type: "FETCH_DATA_START" });
    }

    // Token discovery (Popular + search) only exists on Mainnet / Testnet.
    // Custom / Futurenet networks degrade to held-only (permanent fallback).
    const supportsDiscovery =
      isMainnet(networkDetails) || networkDetails.network === "TESTNET";

    if (!supportsDiscovery) {
      dispatch({
        type: "FETCH_DATA_SUCCESS",
        payload: buildSwapSections({
          searchTerm,
          balances,
          networkDetails,
          icons,
          tokenPrices,
          isFallback: true,
        }),
      });
      return;
    }

    // Read the verified token-list cache from the Redux store (mirrors useAssetLookup).
    let assetsListsData: AssetListResponse[] = tokensListsSelector(
      store.getState(),
    );
    if (!assetsListsData?.length) {
      assetsListsData = await getCombinedAssetListData({
        networkDetails,
        assetsLists,
        cachedAssetLists: [],
      });
      if (assetsListsData.length) {
        reduxDispatch(saveTokenLists(assetsListsData));
      }
    }

    try {
      let verifiedAssets: ManageAssetCurrency[] = [];
      let unverifiedAssets: ManageAssetCurrency[] = [];
      let popular: TrendingAsset[] = [];
      let searchResults: ManageAssetCurrency[] = [];

      if (searchTerm.trim()) {
        // SEARCH path: fetch Stellar Expert results and split verified / unverified
        const resJson = await searchAsset({
          asset: searchTerm.trim(),
          networkDetails,
          signal,
        });
        searchResults = (
          (resJson?._embedded?.records as AssetSearchRecord[]) ?? []
        ).map(recordFromSearchResult);

        const split = await splitVerifiedAssetCurrency({
          networkDetails,
          assets: searchResults,
          assetsListsDetails: assetsLists,
          cachedAssetLists: assetsListsData,
        });
        verifiedAssets = split.verifiedAssets;
        unverifiedAssets = split.unverifiedAssets;
      } else {
        // IDLE path: popular tokens (cached or fresh from stellar.expert)
        const cachedByNetwork = popularTokensSelector(store.getState());
        const cached = cachedByNetwork[networkDetails.network];
        const isFresh =
          cached && Date.now() - cached.updatedAt < POPULAR_TOKENS_STALE_MS;

        popular = isFresh
          ? cached.tokens
          : await fetchTrendingAssets({ networkDetails, signal });

        if (!isFresh && popular.length) {
          reduxDispatch(savePopularTokens({ networkDetails, tokens: popular }));
        }

        // Intersect popular with verified lists to compute the verified canonical set.
        // We only need the verified set here — the intersection happens inside
        // buildSwapSections which checks verifiedKeys by canonical.
        const popularAsCurrency: ManageAssetCurrency[] = popular.map((p) => ({
          code: p.code,
          issuer: p.issuer,
          domain: p.domain,
        }));
        const split = await splitVerifiedAssetCurrency({
          networkDetails,
          assets: popularAsCurrency,
          assetsListsDetails: assetsLists,
          cachedAssetLists: assetsListsData,
        });
        verifiedAssets = split.verifiedAssets;
      }

      let payload = buildSwapSections({
        searchTerm,
        balances,
        networkDetails,
        icons,
        tokenPrices,
        popular,
        verifiedAssets,
        unverifiedAssets,
        searchResults,
      });

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });

      // Bulk Blockaid scan of non-held candidates (mainnet only; testnet = unable-to-scan)
      if (isBlockaidEnabled(networkDetails)) {
        const nonHeld = [
          ...payload.sections.popular,
          ...payload.sections.verified,
          ...payload.sections.unverified,
        ].filter((r) => r.issuer && !isContractId(r.issuer));

        if (nonHeld.length) {
          const scanResults: Record<string, BlockAidScanAssetResult> = {};
          for (let i = 0; i < nonHeld.length; i += MAX_ASSETS_TO_SCAN) {
            const chunk = nonHeld.slice(i, i + MAX_ASSETS_TO_SCAN);
            const ids = chunk.map((r) => `${r.code}-${r.issuer}`);
            const bulk = await scanAssetBulk(ids, networkDetails, signal);
            if (bulk?.results) {
              Object.assign(scanResults, bulk.results);
            }
          }
          if (Object.keys(scanResults).length) {
            payload = {
              ...payload,
              sections: {
                yourTokens: payload.sections.yourTokens,
                popular: mergeScanResults({
                  rows: payload.sections.popular,
                  scanResults,
                  networkDetails,
                }),
                verified: mergeScanResults({
                  rows: payload.sections.verified,
                  scanResults,
                  networkDetails,
                }),
                unverified: mergeScanResults({
                  rows: payload.sections.unverified,
                  scanResults,
                  networkDetails,
                }),
              },
            };
            dispatch({ type: "FETCH_DATA_SUCCESS", payload });
          }
        }
      }

      // Cache the fully-decorated idle result for instant repaint + stale-serve.
      if (isIdle) {
        swapIdleResultCacheByNetwork.set(networkDetails.network, payload);
      }
    } catch (e) {
      if (signal.aborted) {
        // Cancelled — silently ignore (another call is already in flight)
        return;
      }
      captureException(`useSwapTokenLookup fallback - ${JSON.stringify(e)}`);
      // Serve the last good idle result on a transient failure instead of
      // dropping Popular to held-only (§5.4); fall back to held-only only when
      // there's nothing cached.
      if (cachedIdleResult) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: cachedIdleResult });
        return;
      }
      // Graceful fallback: stellar.expert or Blockaid unreachable → held-only
      dispatch({
        type: "FETCH_DATA_SUCCESS",
        payload: buildSwapSections({
          searchTerm,
          balances,
          networkDetails,
          icons,
          tokenPrices,
          isFallback: true,
        }),
      });
    }
  };

  return { fetchData, state };
};
