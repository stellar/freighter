import { renderHook } from "@testing-library/react";
import { useSelector } from "react-redux";

import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import {
  FUNDED_ACCOUNTS_REFRESHED_AT_ID,
  FUNDED_ACCOUNTS_REFRESH_LEASE_ID,
} from "constants/localStorageTypes";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { DEFAULT_CACHE_STALE_MS } from "helpers/request";
import { settingsDataSharingSelector } from "popup/ducks/settings";
import { useGetWalletsData } from "popup/components/account/AccountSheet/hooks/useGetWalletsData";
import {
  FUNDED_ACCOUNTS_REFRESH_DELAY_MS,
  FUNDED_ACCOUNTS_REFRESH_LEASE_MS,
  acquireRefreshLease,
  shouldRefreshFundedAccounts,
  useFundedAccountsRefresh,
} from "popup/helpers/useFundedAccountsRefresh";

jest.mock("react-redux", () => ({
  ...jest.requireActual("react-redux"),
  useSelector: jest.fn(),
}));
jest.mock(
  "popup/components/account/AccountSheet/hooks/useGetWalletsData",
  () => ({ useGetWalletsData: jest.fn() }),
);

const fetchData = jest.fn();

let mockNetworkDetails: unknown = MAINNET_NETWORK_DETAILS;
let mockIsDataSharingAllowed = true;
// Each selector gets its own value.
const mockSelectors = () =>
  (useSelector as unknown as jest.Mock).mockImplementation((selector) =>
    selector === settingsDataSharingSelector
      ? mockIsDataSharingAllowed
      : mockNetworkDetails,
  );

const flush = async () => {
  await jest.advanceTimersByTimeAsync(FUNDED_ACCOUNTS_REFRESH_DELAY_MS);
};

describe("useFundedAccountsRefresh", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    fetchData.mockReset();
    fetchData.mockResolvedValue({ type: AppDataType.RESOLVED });
    (useGetWalletsData as jest.Mock).mockReturnValue({
      fetchData,
      state: {},
    });
    mockNetworkDetails = MAINNET_NETWORK_DETAILS;
    mockIsDataSharingAllowed = true;
    mockSelectors();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("starts the all-accounts fetch after the first paint, from the cache (VT-29)", async () => {
    renderHook(() => useFundedAccountsRefresh());
    // Nothing runs during the first render.
    expect(fetchData).not.toHaveBeenCalled();
    await flush();
    expect(fetchData).toHaveBeenCalledTimes(1);
    expect(fetchData).toHaveBeenCalledWith(true);
  });

  it("starts one refresh for two app opens within 3 minutes (VT-30)", async () => {
    const first = renderHook(() => useFundedAccountsRefresh());
    await flush();
    first.unmount();
    expect(fetchData).toHaveBeenCalledTimes(1);
    expect(
      Number(localStorage.getItem(FUNDED_ACCOUNTS_REFRESHED_AT_ID)),
    ).toBeGreaterThan(0);

    // A new popup open: the module state is new, the Redux caches are empty,
    // but the stored time persists.
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).toHaveBeenCalledTimes(1);

    // After the staleness window, the next open refreshes again.
    jest.setSystemTime(Date.now() + DEFAULT_CACHE_STALE_MS);
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).toHaveBeenCalledTimes(2);
  });

  it("starts one refresh when two pages open at the same time", async () => {
    // The first fetch does not finish while the second page opens.
    let finish: (value: unknown) => void = () => {};
    fetchData.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    // Two pages, for example the popup and the sidebar. Each page has its own
    // module state, so only localStorage is shared.
    renderHook(() => useFundedAccountsRefresh());
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).toHaveBeenCalledTimes(1);

    finish({ type: AppDataType.RESOLVED });
    await jest.advanceTimersByTimeAsync(0);
    // The refresh releases the lease when it ends.
    expect(localStorage.getItem(FUNDED_ACCOUNTS_REFRESH_LEASE_ID)).toBeNull();
  });

  it("does not refresh while another page holds the lease", async () => {
    // Another page (popup, sidebar or fullscreen) started a refresh. This page
    // has its own module state, so only the lease in localStorage stops it.
    localStorage.setItem(
      FUNDED_ACCOUNTS_REFRESH_LEASE_ID,
      String(Date.now() + FUNDED_ACCOUNTS_REFRESH_LEASE_MS),
    );
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).not.toHaveBeenCalled();
  });

  it("releases the lease after a failed refresh, so the next open retries", async () => {
    fetchData.mockRejectedValueOnce(new Error("boom"));
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(localStorage.getItem(FUNDED_ACCOUNTS_REFRESH_LEASE_ID)).toBeNull();

    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).toHaveBeenCalledTimes(2);
  });

  it("does not run on testnet (VT-33)", async () => {
    mockNetworkDetails = TESTNET_NETWORK_DETAILS;
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).not.toHaveBeenCalled();
  });

  it("does not run when data sharing is off", async () => {
    mockIsDataSharingAllowed = false;
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).not.toHaveBeenCalled();
    expect(localStorage.getItem(FUNDED_ACCOUNTS_REFRESHED_AT_ID)).toBeNull();
  });

  it("starts the refresh when the user allows data sharing", async () => {
    mockIsDataSharingAllowed = false;
    const { rerender } = renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).not.toHaveBeenCalled();

    mockIsDataSharingAllowed = true;
    rerender();
    await flush();
    expect(fetchData).toHaveBeenCalledTimes(1);
  });

  it("does not store a time when the fetch fails, so the next open retries (FR-31)", async () => {
    fetchData.mockResolvedValueOnce(new Error("boom"));
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(localStorage.getItem(FUNDED_ACCOUNTS_REFRESHED_AT_ID)).toBeNull();

    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).toHaveBeenCalledTimes(2);
  });

  it("does not store a time when an account had an error, so the next open retries (FR-31)", async () => {
    fetchData.mockResolvedValueOnce({
      type: AppDataType.RESOLVED,
      hasAccountErrors: true,
    });
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(localStorage.getItem(FUNDED_ACCOUNTS_REFRESHED_AT_ID)).toBeNull();

    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).toHaveBeenCalledTimes(2);
    expect(
      Number(localStorage.getItem(FUNDED_ACCOUNTS_REFRESHED_AT_ID)),
    ).toBeGreaterThan(0);
  });

  it("calls the latest fetchData when the delay ends", async () => {
    const latestFetchData = jest
      .fn()
      .mockResolvedValue({ type: AppDataType.RESOLVED });
    const { rerender } = renderHook(() => useFundedAccountsRefresh());
    // A render during the delay, for example after the Account view fills
    // the Redux caches, gives a new fetchData with the new cache snapshots.
    (useGetWalletsData as jest.Mock).mockReturnValue({
      fetchData: latestFetchData,
      state: {},
    });
    rerender();
    await flush();
    expect(fetchData).not.toHaveBeenCalled();
    expect(latestFetchData).toHaveBeenCalledTimes(1);
    expect(latestFetchData).toHaveBeenCalledWith(true);
  });

  it("does not start a second refresh while one runs", async () => {
    let resolve: (value: unknown) => void = () => {};
    fetchData.mockReturnValueOnce(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).toHaveBeenCalledTimes(1);
    resolve({ type: AppDataType.RESOLVED });
  });

  it("does not run when it unmounts before the delay ends", async () => {
    const { unmount } = renderHook(() => useFundedAccountsRefresh());
    unmount();
    await flush();
    expect(fetchData).not.toHaveBeenCalled();
  });
});

describe("shouldRefreshFundedAccounts", () => {
  beforeEach(() => localStorage.clear());

  it("refreshes when no time is stored", () => {
    expect(shouldRefreshFundedAccounts(Date.now())).toBe(true);
  });

  it("refreshes when the stored time is in the future", () => {
    const now = Date.now();
    localStorage.setItem(FUNDED_ACCOUNTS_REFRESHED_AT_ID, String(now + 60000));
    expect(shouldRefreshFundedAccounts(now)).toBe(true);
  });
});

describe("acquireRefreshLease", () => {
  beforeEach(() => localStorage.clear());

  it("gives the lease to one caller until it expires", () => {
    const now = 1_000_000;
    expect(acquireRefreshLease(now)).toBe(true);
    expect(acquireRefreshLease(now + 1)).toBe(false);
    // A page that closed during its refresh blocks only until the lease ends.
    expect(acquireRefreshLease(now + FUNDED_ACCOUNTS_REFRESH_LEASE_MS)).toBe(
      true,
    );
  });

  it("ignores a lease too far in the future (clock change)", () => {
    const now = 1_000_000;
    localStorage.setItem(
      FUNDED_ACCOUNTS_REFRESH_LEASE_ID,
      String(now + FUNDED_ACCOUNTS_REFRESH_LEASE_MS * 10),
    );
    expect(acquireRefreshLease(now)).toBe(true);
  });
});
