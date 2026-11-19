import { renderHook } from "@testing-library/react";
import { useSelector } from "react-redux";

import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { FUNDED_ACCOUNTS_REFRESHED_AT_ID } from "constants/localStorageTypes";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { DEFAULT_CACHE_STALE_MS } from "helpers/request";
import { useGetWalletsData } from "popup/components/account/AccountSheet/hooks/useGetWalletsData";
import {
  FUNDED_ACCOUNTS_REFRESH_DELAY_MS,
  resetFundedAccountsRefreshState,
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

const flush = async () => {
  await jest.advanceTimersByTimeAsync(FUNDED_ACCOUNTS_REFRESH_DELAY_MS);
};

describe("useFundedAccountsRefresh", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    resetFundedAccountsRefreshState();
    fetchData.mockReset();
    fetchData.mockResolvedValue({ type: AppDataType.RESOLVED });
    (useGetWalletsData as jest.Mock).mockReturnValue({
      fetchData,
      state: {},
    });
    (useSelector as unknown as jest.Mock).mockReturnValue(
      MAINNET_NETWORK_DETAILS,
    );
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
    resetFundedAccountsRefreshState();
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).toHaveBeenCalledTimes(1);

    // After the staleness window, the next open refreshes again.
    jest.setSystemTime(Date.now() + DEFAULT_CACHE_STALE_MS);
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).toHaveBeenCalledTimes(2);
  });

  it("does not run on testnet (VT-33)", async () => {
    (useSelector as unknown as jest.Mock).mockReturnValue(
      TESTNET_NETWORK_DETAILS,
    );
    renderHook(() => useFundedAccountsRefresh());
    await flush();
    expect(fetchData).not.toHaveBeenCalled();
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
