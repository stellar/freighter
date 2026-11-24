import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";

import {
  FUNDED_ACCOUNTS_REFRESHED_AT_ID,
  FUNDED_ACCOUNTS_REFRESH_LEASE_ID,
} from "constants/localStorageTypes";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { DEFAULT_CACHE_STALE_MS } from "helpers/request";
import { isMainnet } from "helpers/stellar";
import {
  settingsDataSharingSelector,
  settingsNetworkDetailsSelector,
} from "popup/ducks/settings";
import { useGetWalletsData } from "popup/components/account/AccountSheet/hooks/useGetWalletsData";

// Start after the first paint and the critical-path fetches of the Account
// view, so the refresh never competes with them.
export const FUNDED_ACCOUNTS_REFRESH_DELAY_MS = 1000;

// One refresh at a time across all extension pages (popup, sidebar,
// fullscreen). A page takes the lease in localStorage before it fetches. The
// lease expires after this time, so a page that closes during a refresh does
// not block the next refresh for long.
export const FUNDED_ACCOUNTS_REFRESH_LEASE_MS = 60 * 1000;

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

/**
 * Takes the refresh lease if no other page holds it. Extension pages share
 * one main thread, and localStorage calls are synchronous, so the read and
 * the write cannot interleave with another page. Returns false when another
 * page holds the lease or storage fails.
 */
export const acquireRefreshLease = (now: number): boolean => {
  try {
    const leaseUntil =
      Number(localStorage.getItem(FUNDED_ACCOUNTS_REFRESH_LEASE_ID)) || 0;
    // A lease too far in the future (a clock change) does not block.
    if (
      leaseUntil > now &&
      leaseUntil - now <= FUNDED_ACCOUNTS_REFRESH_LEASE_MS
    ) {
      return false;
    }
    localStorage.setItem(
      FUNDED_ACCOUNTS_REFRESH_LEASE_ID,
      String(now + FUNDED_ACCOUNTS_REFRESH_LEASE_MS),
    );
    return true;
  } catch {
    return false;
  }
};

const releaseRefreshLease = () => {
  try {
    localStorage.removeItem(FUNDED_ACCOUNTS_REFRESH_LEASE_ID);
  } catch {
    // The lease expires by itself.
  }
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
  const isDataSharingAllowed = useSelector(settingsDataSharingSelector);
  const { fetchData } = useGetWalletsData();
  // fetchData reads the Redux caches of its render. The timer calls the
  // latest one, so data that the Account view caches during the delay is
  // reused, not fetched again.
  const fetchDataRef = useRef(fetchData);
  fetchDataRef.current = fetchData;

  useEffect(() => {
    // Without data sharing, nothing sends funded_account_count, so the
    // refresh would make requests for no use. When the user allows data
    // sharing, the effect runs again and the refresh starts.
    if (!isMainnet(networkDetails) || !isDataSharingAllowed) {
      return undefined;
    }

    const timer = setTimeout(async () => {
      const now = Date.now();
      if (!shouldRefreshFundedAccounts(now) || !acquireRefreshLease(now)) {
        return;
      }
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
        releaseRefreshLease();
      }
    }, FUNDED_ACCOUNTS_REFRESH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [networkDetails, isDataSharingAllowed]);
};
