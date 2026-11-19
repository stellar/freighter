import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

import { FUNDED_ACCOUNTS_REFRESHED_AT_ID } from "constants/localStorageTypes";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { DEFAULT_CACHE_STALE_MS } from "helpers/request";
import { isMainnet } from "helpers/stellar";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { useGetWalletsData } from "popup/components/account/AccountSheet/hooks/useGetWalletsData";

// Start after the first paint and the critical-path fetches of the Account
// view, so the refresh never competes with them.
export const FUNDED_ACCOUNTS_REFRESH_DELAY_MS = 1000;

// One refresh at a time in this popup, also when the Account view mounts
// again while a refresh runs.
let isRefreshInFlight = false;

/** The time of the last successful refresh, or 0 when none is stored. */
const getLastRefreshedAt = (): number => {
  try {
    return Number(localStorage.getItem(FUNDED_ACCOUNTS_REFRESHED_AT_ID)) || 0;
  } catch {
    return 0;
  }
};

const setLastRefreshedAt = (time: number) => {
  try {
    localStorage.setItem(FUNDED_ACCOUNTS_REFRESHED_AT_ID, String(time));
  } catch {
    // Storage write failed. The next app open refreshes again.
  }
};

/**
 * Whether the app-open refresh can run. The Redux caches start empty at each
 * popup open, so the check uses a time in localStorage, which persists
 * across popup opens. A stored time in the future (a clock change) does not
 * block the refresh.
 */
export const shouldRefreshFundedAccounts = (now: number): boolean => {
  const last = getLastRefreshedAt();
  return last > now || now - last >= DEFAULT_CACHE_STALE_MS;
};

/** For tests only. */
export const resetFundedAccountsRefreshState = () => {
  isRefreshInFlight = false;
};

/**
 * Starts the all-accounts fetch in the background when the Account view
 * opens on mainnet. Each result updates the funding record of its account
 * (see useGetWalletsData), which feeds the funded_account_count user
 * property. The fetch writes to the Redux caches that the account sheet
 * reads. No view shows its request state. Errors are ignored: the next app
 * open tries again.
 */
export const useFundedAccountsRefresh = () => {
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const { fetchData } = useGetWalletsData();
  // fetchData reads the Redux caches of its render. The timer calls the
  // latest one, so data that the Account view caches during the delay is
  // reused, not fetched again.
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    if (!isMainnet(networkDetails)) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      if (isRefreshInFlight || !shouldRefreshFundedAccounts(Date.now())) {
        return;
      }
      isRefreshInFlight = true;
      try {
        // fetchData catches its own errors and returns them.
        const result = (await fetchDataRef.current(true)) as {
          type?: unknown;
          hasAccountErrors?: boolean;
        } | null;
        // Store the time only when every account gave a result. After an
        // error, the next app open tries again.
        if (result?.type === AppDataType.RESOLVED && !result.hasAccountErrors) {
          setLastRefreshedAt(Date.now());
        }
      } catch {
        // Best effort. The next app open tries again.
      } finally {
        isRefreshInFlight = false;
      }
    }, FUNDED_ACCOUNTS_REFRESH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [networkDetails]);
};
