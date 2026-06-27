import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import { NetworkDetails } from "@shared/constants/stellar";
import { isMainnet } from "helpers/stellar";
import { AppDispatch } from "popup/App";
import { savePopularTokens } from "popup/ducks/cache";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { fetchTrendingAssets } from "popup/helpers/trendingAssets";
import {
  getPersistedPopularTokens,
  setPersistedPopularTokens,
} from "popup/helpers/swapPopularTokensCache";

// Defer the pre-warm past the account screen's first paint + critical-path
// data fetches so it never competes for the main render.
const PREWARM_DELAY_MS = 1000;

/**
 * Best-effort top-tokens pre-warm (§5.7). Mainnet-only (trending is meaningless
 * on testnet); skips the network when the persisted cache is still fresh, so it
 * costs at most one trending request per staleness window. On a fresh fetch it
 * updates both the Redux cache and the disk cache. All errors are swallowed —
 * the Swap pipeline fetches on open if this didn't run.
 */
export const prewarmTopTokens = async ({
  networkDetails,
  dispatch,
  signal,
}: {
  networkDetails: NetworkDetails;
  dispatch: AppDispatch;
  signal?: AbortSignal;
}): Promise<void> => {
  if (!isMainnet(networkDetails)) {
    return;
  }
  try {
    const persisted = await getPersistedPopularTokens(networkDetails.network);
    if (persisted || signal?.aborted) {
      return;
    }
    const tokens = await fetchTrendingAssets({ networkDetails, signal });
    if (signal?.aborted || !tokens.length) {
      return;
    }
    dispatch(savePopularTokens({ networkDetails, tokens }));
    await setPersistedPopularTokens(networkDetails.network, tokens);
  } catch (e) {
    // Best-effort: the Swap pipeline retries on open.
  }
};

/**
 * Mounts the top-tokens pre-warm on the account/home screen so the first Swap
 * entry can paint Popular instantly. Runs once per mount, deferred past first
 * paint, and aborts on unmount.
 */
export const useSwapTopTokensPrewarm = () => {
  const dispatch = useDispatch<AppDispatch>();
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void prewarmTopTokens({
        networkDetails,
        dispatch,
        signal: controller.signal,
      });
    }, PREWARM_DELAY_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [networkDetails, dispatch]);
};
