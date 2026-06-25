import { useReducer, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { captureException } from "@sentry/browser";

import { NetworkDetails } from "@shared/constants/stellar";
import { BlockAidScanAssetResult } from "@shared/api/types";
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
import { isContractId, isAssetSac } from "popup/helpers/soroban";
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
  saveAssetScanResults,
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
  fiatValue?: string;
  percentChange24h?: string;
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
): SwapTokenRecord | null => {
  if (!("token" in balance) || !balance.token) {
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
  return {
    code,
    issuer,
    domain: null,
    canonical,
    // Held tokens carry no icon URL of their own — pull it from the account's
    // icons map (keyed by canonical) so "Your tokens" rows show real logos.
    image: icons[canonical] || undefined,
    isHeld: true,
    isContract: false,
    requiresTrustline: false,
  };
};

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
  networkDetails,
  popular = [],
  verifiedAssets = [],
  unverifiedAssets = [],
  searchResults = [],
  isFallback = false,
  icons = {},
}: {
  searchTerm: string;
  balances: AssetType[];
  networkDetails: NetworkDetails;
  popular?: TrendingAsset[];
  verifiedAssets?: ManageAssetCurrency[];
  unverifiedAssets?: ManageAssetCurrency[];
  searchResults?: ManageAssetCurrency[];
  isFallback?: boolean;
  icons?: Record<string, string | null>;
}): SwapTokenLookupResult => {
  const term = searchTerm.trim().toLowerCase();
  const isSearch = term.length > 0;

  const heldRecords = balances
    .map((b) => heldToRecord(b, icons))
    .filter((r): r is SwapTokenRecord => r !== null);
  const heldCanonicals = new Set(heldRecords.map((r) => r.canonical));

  // Classic-only filter: drop any Soroban (non-SAC) contract record.
  // Side-effect: sets hadSorobanMatches when a Soroban record is encountered.
  let hadSorobanMatches = false;
  const isClassic = (asset: ManageAssetCurrency): boolean => {
    // Check via explicit contract field
    if (asset.contract && isContractId(asset.contract)) {
      const sac = isAssetSac({
        asset: {
          code: asset.code || "",
          issuer: asset.issuer,
          contract: asset.contract,
        },
        networkDetails,
      });
      if (!sac) {
        hadSorobanMatches = true;
        return false;
      }
    }
    // Also catch assets whose issuer itself is a contract address (Soroban token)
    if (asset.issuer && isContractId(asset.issuer)) {
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
    };
  }
  return {
    code: record.asset.split("-")[0],
    issuer: record.asset.split("-")[1],
    domain: record.domain ?? null,
    image: record.tomlInfo?.image,
  };
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
  }: {
    searchTerm: string;
    balances: AssetType[];
    publicKey: string;
    networkDetails: NetworkDetails;
    icons?: Record<string, string | null>;
  }): Promise<void> => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;
    const { signal } = controller;

    dispatch({ type: "FETCH_DATA_START" });

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
            reduxDispatch(
              saveAssetScanResults({ networkDetails, results: scanResults }),
            );
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
    } catch (e) {
      if (signal.aborted) {
        // Cancelled — silently ignore (another call is already in flight)
        return;
      }
      // Graceful fallback: stellar.expert or Blockaid unreachable → held-only
      captureException(`useSwapTokenLookup fallback - ${JSON.stringify(e)}`);
      dispatch({
        type: "FETCH_DATA_SUCCESS",
        payload: buildSwapSections({
          searchTerm,
          balances,
          networkDetails,
          icons,
          isFallback: true,
        }),
      });
    }
  };

  return { fetchData, state };
};
