import React, { useEffect, useReducer } from "react";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";
import { useDispatch, useStore } from "react-redux";
import { captureException } from "@sentry/browser";
import { Icon } from "@stellar/design-system";

import { getTokenStats } from "@shared/api/internal";
import { ApiTokenStats } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import {
  beginCacheWrite,
  canWriteCache,
  tokenStatsCacheKey,
} from "helpers/cacheWrites";
import { initialState, isCacheValid, reducer } from "helpers/request";
import { RequestState } from "constants/request";
import {
  TOKEN_STATS_STALE_MS,
  saveTokenStats,
  tokenStatsSelector,
} from "popup/ducks/cache";
import { AppDispatch, AppState } from "popup/App";
import { InfoRow, InfoRowCard } from "popup/components/account/InfoRowCard";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

interface TokenStatsProps {
  /** The balance's canonical token id — opaque, passed through verbatim. */
  token: string;
  networkDetails: NetworkDetails;
}

/**
 * Renders only the rows the response carries, and hides the whole section when
 * none are present or the fetch fails. Callers gate to mainnet + flag.
 */
export const TokenStats = ({ token, networkDetails }: TokenStatsProps) => {
  const { t } = useTranslation();
  const reduxDispatch = useDispatch<AppDispatch>();
  const store = useStore<AppState>();
  const [state, dispatch] = useReducer(
    reducer<ApiTokenStats | null, unknown>,
    initialState,
  );

  useEffect(() => {
    let isActive = true;
    const fetchStats = async () => {
      dispatch({ type: "FETCH_DATA_START" });

      // Read the popup-session cache at call time. AssetDetail remounts this
      // card on every open of a token's detail view, and these fields move on
      // the order of hours — a repeat open inside the window costs nothing.
      const cached = (tokenStatsSelector(store.getState()) || {})[
        networkDetails.networkPassphrase
      ]?.[token];
      if (isCacheValid(cached, TOKEN_STATS_STALE_MS)) {
        const { updatedAt: _updatedAt, ...cachedStats } = cached!;
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: cachedStats });
        return;
      }

      // Claimed immediately before the request goes out. `isActive` is local
      // to this effect run, so it cannot order a close/reopen: the old card's
      // in-flight request would still write, overwriting the reopened card's
      // response and re-stamping it fresh for the full five minutes.
      const cacheKey = tokenStatsCacheKey({
        networkPassphrase: networkDetails.networkPassphrase,
        token,
      });
      const writeClaim = beginCacheWrite(cacheKey);

      let stats: ApiTokenStats | null = null;
      try {
        stats = await getTokenStats({ token, networkDetails });
      } catch (e) {
        // The Error itself, not an interpolated string — see the note in
        // useGetTokenPriceHistory.
        captureException(e, {
          tags: { operation: "getTokenStats" },
          extra: { token, network: networkDetails.network },
        });
        stats = null;
      }
      if (stats && canWriteCache(cacheKey, writeClaim)) {
        reduxDispatch(saveTokenStats({ networkDetails, token, stats }));
      }
      if (isActive) {
        dispatch({ type: "FETCH_DATA_SUCCESS", payload: stats });
      }
    };
    fetchStats();
    return () => {
      isActive = false;
    };
    // `networkDetails` comes from a memoized settings selector and `store` /
    // `reduxDispatch` are stable react-redux handles, so this effect runs on a
    // real change of token or network — not on every render.
  }, [token, networkDetails, store, reduxDispatch]);

  if (state.state !== RequestState.SUCCESS || !state.data) {
    return null;
  }

  const stats = state.data;
  const rows: InfoRow[] = [];
  if (stats.supplyOnStellar !== undefined) {
    rows.push({
      label: t("Supply on Stellar"),
      // toFormat, not formatAmount: the latter narrows through Number and
      // rewrites digits above 2^53, which Soroban supplies can exceed.
      value: new BigNumber(stats.supplyOnStellar).toFormat(
        0,
        BigNumber.ROUND_DOWN,
      ),
      testId: "TokenStats__supply",
    });
  }
  if (stats.holders !== undefined) {
    rows.push({
      label: t("Holders"),
      value: new BigNumber(stats.holders).toFormat(0, BigNumber.ROUND_DOWN),
      testId: "TokenStats__holders",
    });
  }

  if (!rows.length) {
    return null;
  }

  return (
    <InfoRowCard
      testId="TokenStats"
      icon={<Icon.Coins01 />}
      title={t("Token Stats")}
      rows={rows}
    />
  );
};
