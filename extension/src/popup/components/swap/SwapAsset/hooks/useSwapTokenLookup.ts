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
import { isMainnet, isTestnet, getCanonicalFromAsset } from "helpers/stellar";
import { ManageAssetCurrency } from "popup/components/manageAssets/ManageAssetRows";
import { BlockaidWarning, SecurityLevel } from "popup/constants/blockaid";
import { searchAsset } from "popup/helpers/searchAsset";
import {
  getPersistedPopularTokens,
  setPersistedPopularTokens,
} from "popup/helpers/swapPopularTokensCache";
import { splitVerifiedAssetCurrency } from "popup/helpers/assetList";
import { isContractId } from "popup/helpers/soroban";
import { formatAmount, roundUsdValue } from "popup/helpers/formatters";
import { sortBalancesByValue } from "popup/helpers/balance";
import {
  scanAssetBulk,
  MAX_ASSETS_TO_SCAN,
  isAssetMalicious,
  isAssetSuspicious,
  shouldTreatAssetAsUnableToScan,
  isBlockaidEnabled,
  extractAssetScanWarnings,
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

export interface SwapTokenRecord extends ManageAssetCurrency {
  canonical: string;
  isHeld: boolean;
  isContract: boolean;
  requiresTrustline: boolean;
  securityLevel?: SecurityLevel;
  /** Friendly per-feature Blockaid reasons from the token's asset scan, carried
   * to the review's "Do not proceed" pane. */
  securityWarnings?: BlockaidWarning[];
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
  // keys purely on contract-id shape and does not use the network value.
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

  // Classic-only filter: drop any record whose issuer or contract is a contract
  // id — i.e. a custom Soroban token. Classic CODE-ISSUER records are kept,
  // including SAC-backed assets, which stellar.expert returns in their classic
  // form (a bare SAC contract id has no classic representation to swap).
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
  skipUnscanned = false,
}: {
  rows: SwapTokenRecord[];
  scanResults: Record<string, BlockAidScanAssetResult>;
  networkDetails: NetworkDetails;
  // When true, rows without a scan entry are left UNDECORATED (securityLevel
  // stays undefined) instead of defaulting to SAFE/unable-to-scan. Used for the
  // first paint when only some verdicts are in the in-session cache, so
  // not-yet-scanned rows don't flash a premature badge.
  skipUnscanned?: boolean;
}): SwapTokenRecord[] =>
  rows.map((row) => {
    if (!row.issuer) {
      // Native XLM — always trusted
      return row;
    }
    const scan = scanResults[`${row.code}-${row.issuer}`];
    if (skipUnscanned && !scan) {
      return row;
    }
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
    // Keep the friendly per-feature reasons so the review can show them
    // alongside the transaction-scan reasons.
    const securityWarnings = extractAssetScanWarnings(scan);
    return {
      ...row,
      securityLevel,
      ...(securityWarnings.length ? { securityWarnings } : {}),
    };
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
// re-entering the picker repaints instantly instead of flashing a spinner, and
// is served as a fallback when a fresh idle fetch fails rather than dropping
// Popular to held-only. In-memory only — dies on popup close; disk persistence
// across sessions is a separate concern handled by swapPopularTokensCache.
const swapIdleResultCacheByNetwork = new Map<string, SwapTokenLookupResult>();

// Module-scoped cache of the last successful SEARCH result per network, keyed
// by the normalized search term. Same lifetime as the idle cache (in-memory,
// dies on popup close): re-running a search already performed this session
// repaints instantly and revalidates silently, instead of re-hitting
// stellar.expert + the Blockaid bulk scan from scratch.
const swapSearchResultCacheByNetwork = new Map<
  string,
  Map<string, SwapTokenLookupResult>
>();

const getCachedSearchResult = (network: string, term: string) =>
  swapSearchResultCacheByNetwork.get(network)?.get(term);

const setCachedSearchResult = (
  network: string,
  term: string,
  result: SwapTokenLookupResult,
) => {
  let byTerm = swapSearchResultCacheByNetwork.get(network);
  if (!byTerm) {
    byTerm = new Map();
    swapSearchResultCacheByNetwork.set(network, byTerm);
  }
  byTerm.set(term, result);
};

// In-session per-asset Blockaid scan cache, keyed by network -> "CODE-ISSUER".
// Bulk scans are slow (serial-ish network round-trips), so caching each asset's
// verdict means re-entering the picker, or overlapping searches ("usd" then
// "usdc"), reuse verdicts instead of re-scanning — badges then paint instantly
// on the first dispatch. It also lets a destination token picked before its
// scan finished resolve its verdict via getCachedAssetScan.
const swapAssetScanCacheByNetwork = new Map<
  string,
  Map<string, BlockAidScanAssetResult>
>();

const getAssetScanCacheForNetwork = (network: string) => {
  let byId = swapAssetScanCacheByNetwork.get(network);
  if (!byId) {
    byId = new Map();
    swapAssetScanCacheByNetwork.set(network, byId);
  }
  return byId;
};

/**
 * Look up a single asset's cached Blockaid scan (this session) by code+issuer.
 * Used so a destination token picked before the bulk scan finished can still
 * recover its verdict without a fresh network call when it's already cached.
 */
export const getCachedAssetScan = (
  network: string,
  code: string,
  issuer: string,
): BlockAidScanAssetResult | undefined =>
  swapAssetScanCacheByNetwork.get(network)?.get(`${code}-${issuer}`);

/** Test-only: clear the module-scoped idle + search + scan caches. */
export const resetSwapIdleCacheForTests = () => {
  swapIdleResultCacheByNetwork.clear();
  swapSearchResultCacheByNetwork.clear();
  swapAssetScanCacheByNetwork.clear();
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

    // On idle re-entry — or a repeated search the user already ran this session
    // — repaint instantly from the last cached result and revalidate silently
    // (no spinner); otherwise show the spinner while it loads.
    const isIdle = !searchTerm.trim();
    const normalizedTerm = searchTerm.trim().toLowerCase();
    const cachedIdleResult = isIdle
      ? swapIdleResultCacheByNetwork.get(networkDetails.network)
      : undefined;
    const cachedResult =
      cachedIdleResult ||
      (isIdle
        ? undefined
        : getCachedSearchResult(networkDetails.network, normalizedTerm));
    if (cachedResult) {
      dispatch({ type: "FETCH_DATA_SUCCESS", payload: cachedResult });
    } else {
      dispatch({ type: "FETCH_DATA_START" });
    }

    // Token discovery (Popular + search) only exists on Mainnet / Testnet.
    // Custom / Futurenet networks degrade to held-only (permanent fallback).
    const supportsDiscovery =
      isMainnet(networkDetails) || isTestnet(networkDetails);

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
        // IDLE path: popular tokens. Cache layering (fastest first):
        //   Redux (in-session) → chrome.storage.local (cross-session) →
        //   stellar.expert trending request.
        const cachedByNetwork = popularTokensSelector(store.getState());
        const cached = cachedByNetwork[networkDetails.network];
        const isFresh =
          cached && Date.now() - cached.updatedAt < POPULAR_TOKENS_STALE_MS;

        if (isFresh) {
          popular = cached.tokens;
        } else {
          // Disk-persisted trending survives popup close, avoiding the slow
          // trending request on reopen. Falls through to the network when the
          // persisted copy is absent or stale.
          const persisted = await getPersistedPopularTokens(
            networkDetails.network,
          );
          if (persisted) {
            popular = persisted;
          } else {
            popular = await fetchTrendingAssets({ networkDetails, signal });
            if (popular.length) {
              reduxDispatch(
                savePopularTokens({ networkDetails, tokens: popular }),
              );
              await setPersistedPopularTokens(networkDetails.network, popular);
            }
          }
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

      // A newer lookup (the user typed again or cleared the box) may have
      // superseded this one. Some awaits above don't honor the AbortSignal
      // (splitVerifiedAssetCurrency), so a superseded call can still reach here
      // and commit its stale sections over the current render — the "Your
      // tokens" flash. The guard below drops it before dispatch.
      // Non-held classic candidates to scan with Blockaid (mainnet only;
      // testnet has no Blockaid).
      const scanCandidates = isBlockaidEnabled(networkDetails)
        ? [
            ...payload.sections.popular,
            ...payload.sections.verified,
            ...payload.sections.unverified,
          ].filter((r) => r.issuer && !isContractId(r.issuer))
        : [];

      // Decorate the given payload's scannable sections from a scan map.
      const decorateSections = (
        p: SwapTokenLookupResult,
        scanResults: Record<string, BlockAidScanAssetResult>,
        skipUnscanned: boolean,
      ): SwapTokenLookupResult => ({
        ...p,
        sections: {
          yourTokens: p.sections.yourTokens,
          popular: mergeScanResults({
            rows: p.sections.popular,
            scanResults,
            networkDetails,
            skipUnscanned,
          }),
          verified: mergeScanResults({
            rows: p.sections.verified,
            scanResults,
            networkDetails,
            skipUnscanned,
          }),
          unverified: mergeScanResults({
            rows: p.sections.unverified,
            scanResults,
            networkDetails,
            skipUnscanned,
          }),
        },
      });

      const assetScanCache = getAssetScanCacheForNetwork(
        networkDetails.network,
      );

      // First paint: decorate from any already-cached verdicts so re-entry and
      // overlapping searches show badges immediately instead of flashing
      // undecorated. Only rows present in the cache are stamped (skipUnscanned).
      if (scanCandidates.length) {
        const cachedSeed: Record<string, BlockAidScanAssetResult> = {};
        for (const row of scanCandidates) {
          const cached = assetScanCache.get(`${row.code}-${row.issuer}`);
          if (cached) {
            cachedSeed[`${row.code}-${row.issuer}`] = cached;
          }
        }
        if (Object.keys(cachedSeed).length) {
          payload = decorateSections(payload, cachedSeed, true);
        }
      }

      if (signal.aborted) {
        return;
      }

      dispatch({ type: "FETCH_DATA_SUCCESS", payload });

      // Bulk-scan only the candidates not already cached this session, in
      // parallel chunks. Cached verdicts seed the result map so the full
      // decoration below is complete even when nothing needs re-scanning.
      if (scanCandidates.length) {
        const scanResults: Record<string, BlockAidScanAssetResult> = {};
        const toScan: SwapTokenRecord[] = [];
        for (const row of scanCandidates) {
          const id = `${row.code}-${row.issuer}`;
          const cached = assetScanCache.get(id);
          if (cached) {
            scanResults[id] = cached;
          } else {
            toScan.push(row);
          }
        }

        const chunks: SwapTokenRecord[][] = [];
        for (let i = 0; i < toScan.length; i += MAX_ASSETS_TO_SCAN) {
          chunks.push(toScan.slice(i, i + MAX_ASSETS_TO_SCAN));
        }
        const bulks = await Promise.all(
          chunks.map((chunk) =>
            scanAssetBulk(
              chunk.map((r) => `${r.code}-${r.issuer}`),
              networkDetails,
              signal,
            ),
          ),
        );
        for (const bulk of bulks) {
          if (bulk?.results) {
            Object.assign(scanResults, bulk.results);
            // Populate the per-asset cache for instant warm re-entry + pick-time
            // verdict recovery. Skip entries with no result_type (transiently
            // unscannable) so they're retried on re-entry rather than frozen.
            for (const [id, scan] of Object.entries(bulk.results)) {
              if (scan && "result_type" in scan && scan.result_type) {
                assetScanCache.set(id, scan);
              }
            }
          }
        }

        if (Object.keys(scanResults).length) {
          payload = decorateSections(payload, scanResults, false);
          // Same guard as the first dispatch: don't repaint a superseded
          // lookup's Blockaid-decorated sections over the current one.
          if (signal.aborted) {
            return;
          }
          dispatch({ type: "FETCH_DATA_SUCCESS", payload });
        }
      }

      // Cache the fully-decorated result for instant repaint + stale-serve:
      // idle keyed by network, search keyed by network + normalized term.
      if (isIdle) {
        swapIdleResultCacheByNetwork.set(networkDetails.network, payload);
      } else {
        setCachedSearchResult(networkDetails.network, normalizedTerm, payload);
      }
    } catch (e) {
      if (signal.aborted) {
        // Cancelled — silently ignore (another call is already in flight)
        return;
      }
      captureException(`useSwapTokenLookup fallback - ${JSON.stringify(e)}`);
      // Serve the last good cached result (idle or this search term) on a
      // transient failure instead of dropping Popular to held-only; fall back
      // to held-only only when there's nothing cached.
      if (cachedResult) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: cachedResult });
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
