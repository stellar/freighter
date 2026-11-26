import React from "react";
import { Provider } from "react-redux";
import { renderHook, act, waitFor } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { AccountPositions } from "@shared/api/types/blend";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { NETWORKS } from "@shared/constants/stellar";
import {
  AwaitedDeposit,
  initialState as earnInitialState,
} from "popup/ducks/earn";
import { AWAITED_DEPOSIT_POLL_MS } from "popup/components/earn/helpers/awaitedDeposit";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { AccountBalances } from "helpers/hooks/useGetBalances";

import {
  makeDummyStore,
  TEST_PUBLIC_KEY,
  TEST_REMOTE_CONFIG,
} from "popup/__testHelpers__";

import * as GetAppDataHooks from "helpers/hooks/useGetAppData";
import * as GetBalancesHooks from "helpers/hooks/useGetBalances";
import * as GetCollectiblesHooks from "helpers/hooks/useGetCollectibles";
import * as GetPositionsHooks from "helpers/hooks/useGetPositions";
import * as GetTokenPricesHooks from "helpers/hooks/useGetTokenPrices";
import * as BlendHelpers from "@shared/api/helpers/blend";
import * as ApiInternal from "@shared/api/internal";

import { useGetAccountData } from "../useGetAccountData";

// The first (unscanned) balances read Home shows immediately; distinguished
// from the scanned read below by `icons`, a field neither read nor written
// anywhere else in this flow -- a plain, unambiguous marker of "which read
// survived to the end", standing in for what a real Blockaid flag does on
// `balances[].blockaidData`.
const UNSCANNED_BALANCES = {
  balances: [],
  isFunded: true,
  subentryCount: 1,
} as AccountBalances;

const SCANNED_BALANCES = {
  balances: [],
  isFunded: true,
  subentryCount: 1,
  icons: { scanned: "marker" },
} as AccountBalances;

const ZERO_POSITIONS: AccountPositions = {
  address: TEST_PUBLIC_KEY,
  totalValueUsd: null,
  netApy: null,
  positions: [],
  backstop: [],
};

jest.spyOn(GetAppDataHooks, "useGetAppData").mockReturnValue({
  state: {} as any,
  fetchData: () =>
    Promise.resolve({
      type: AppDataType.RESOLVED,
      account: {
        publicKey: TEST_PUBLIC_KEY,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      },
      settings: {
        networkDetails: MAINNET_NETWORK_DETAILS,
        allowList: {},
      },
    }) as any,
} as any);

// The 5th positional arg (`shouldSkipScan`) is exactly what separates Home's
// first, quick balances read from the later Blockaid-scanned one -- see
// `useGetAccountData.tsx`'s two `fetchBalances` call sites.
jest.spyOn(GetBalancesHooks, "useGetBalances").mockReturnValue({
  state: {} as any,
  fetchData: (
    _publicKey: string,
    _isMainnetNetwork: boolean,
    _networkDetails: unknown,
    _useCache?: boolean,
    shouldSkipScan?: boolean,
  ) => Promise.resolve(shouldSkipScan ? UNSCANNED_BALANCES : SCANNED_BALANCES),
} as any);

jest.spyOn(GetCollectiblesHooks, "useGetCollectibles").mockReturnValue({
  state: {} as any,
  fetchData: () => Promise.resolve({ collections: [] }),
} as any);

// Zero positions (not an error) is the exact population the regression
// affects: it is what makes `earnOptionsRequest` non-null, which is what
// lands a dispatch after the mainnet rescan block.
const mockFetchPositions = jest.fn(() => Promise.resolve(ZERO_POSITIONS));
jest.spyOn(GetPositionsHooks, "useGetPositions").mockReturnValue({
  state: {} as any,
  fetchData: mockFetchPositions,
} as any);

jest.spyOn(GetTokenPricesHooks, "useGetTokenPrices").mockReturnValue({
  state: {} as any,
  fetchData: () => Promise.resolve({ tokenPrices: {} }) as any,
} as any);

const getPoolsSpy = jest
  .spyOn(BlendHelpers, "getBlendPools")
  .mockResolvedValue([]);
const getEarnOptionsSpy = jest
  .spyOn(BlendHelpers, "getBlendEarnOptions")
  .mockResolvedValue([]);

jest.spyOn(ApiInternal, "loadBackendSettings").mockResolvedValue({
  isSorobanPublicEnabled: true,
  isRpcHealthy: true,
  userNotification: { enabled: false, message: "" },
} as any);

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider
    store={makeDummyStore({
      remoteConfig: { ...TEST_REMOTE_CONFIG, positions_enabled: true },
    })}
  >
    {children}
  </Provider>
);

const wrapperWithPositionsOff = ({
  children,
}: {
  children: React.ReactNode;
}) => (
  <Provider store={makeDummyStore({ remoteConfig: TEST_REMOTE_CONFIG })}>
    {children}
  </Provider>
);

const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;

/** The account holding `tokens` USDC (7 decimals) in the pool. */
const holding = (tokens: string): AccountPositions => ({
  ...ZERO_POSITIONS,
  positions: [
    {
      protocol: "blend",
      id: POOL_ID,
      name: "Fixed",
      netUsd: null,
      suppliedUsd: null,
      borrowedUsd: null,
      netApy: null,
      blend: {
        supply: [
          {
            assetId: "CUSDC",
            symbol: "USDC",
            name: null,
            decimals: 7,
            suppliedTokens: "0",
            collateralTokens: tokens,
            totalTokens: tokens,
            usdValue: null,
            apy: null,
            emissionsApr: null,
            interestEarned: "0",
            interestEarnedUsd: null,
            claimableBlnd: "0",
            claimableUsd: null,
            priceUsd: null,
          },
        ],
        borrow: [],
      },
    },
  ],
});

const AWAITED: AwaitedDeposit = {
  publicKey: TEST_PUBLIC_KEY,
  network: MAINNET_NETWORK_DETAILS.network,
  poolId: POOL_ID,
  assetId: "CUSDC",
  // 100 held before, 50 deposited: shows once the reserve holds 125+.
  minTokens: "125",
  expiresAt: Number.MAX_SAFE_INTEGER,
};

const storeAwaiting = (awaitedDeposit: AwaitedDeposit) =>
  makeDummyStore({
    remoteConfig: { ...TEST_REMOTE_CONFIG, positions_enabled: true },
    earn: { ...earnInitialState, awaitedDeposit },
  });

const renderAwaiting = (store: ReturnType<typeof storeAwaiting>) =>
  renderHook(
    () => useGetAccountData({ showHidden: false, includeIcons: false }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      ),
    },
  );

describe("useGetAccountData", () => {
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    // Back to zero positions: an override would leak into later tests.
    mockFetchPositions.mockReset();
    mockFetchPositions.mockImplementation(() =>
      Promise.resolve(ZERO_POSITIONS),
    );
  });

  describe("after a deposit", () => {
    // Home's load reads the cached, pre-deposit positions; the indexer
    // catches up a few seconds later.
    it("re-reads Positions until the deposit shows, then stops", async () => {
      jest.useFakeTimers();
      mockFetchPositions
        .mockResolvedValueOnce(holding("1000000000")) // load: 100, cached
        .mockResolvedValueOnce(holding("1000000000")) // not indexed yet
        .mockResolvedValueOnce(holding("1500000000")); // 150: it shows
      const store = storeAwaiting(AWAITED);
      const { result } = renderAwaiting(store);

      await act(async () => {
        await result.current.fetchData({ useAppDataCache: false });
      });
      await waitFor(() => expect(mockFetchPositions).toHaveBeenCalledTimes(2));

      await act(async () => {
        await jest.advanceTimersByTimeAsync(AWAITED_DEPOSIT_POLL_MS);
      });

      await waitFor(() =>
        expect(store.getState().earn.awaitedDeposit).toBeNull(),
      );
      expect(
        (result.current.state.data as any).positions.positions[0].blend
          .supply[0].totalTokens,
      ).toBe("1500000000");
      // Every read after the load bypasses the cache.
      expect(mockFetchPositions).toHaveBeenLastCalledWith(
        expect.objectContaining({ useCache: false }),
      );

      await act(async () => {
        await jest.advanceTimersByTimeAsync(AWAITED_DEPOSIT_POLL_MS * 3);
      });
      expect(mockFetchPositions).toHaveBeenCalledTimes(3);
    });

    // Past its wait, a deposit still gets one fresh read in place of the
    // cached copy; the 30s poll takes over after that.
    it("reads once more and stops when the wait has expired", async () => {
      mockFetchPositions.mockResolvedValue(holding("1000000000"));
      const store = storeAwaiting({ ...AWAITED, expiresAt: 0 });
      const { result } = renderAwaiting(store);

      await act(async () => {
        await result.current.fetchData({ useAppDataCache: false });
      });

      await waitFor(() =>
        expect(store.getState().earn.awaitedDeposit).toBeNull(),
      );
      expect(mockFetchPositions).toHaveBeenCalledTimes(2);
    });

    it("leaves another account's deposit alone", async () => {
      const store = storeAwaiting({ ...AWAITED, publicKey: "GOTHER" });
      const { result } = renderAwaiting(store);

      await act(async () => {
        await result.current.fetchData({ useAppDataCache: false });
      });

      expect(mockFetchPositions).toHaveBeenCalledTimes(1);
      expect(store.getState().earn.awaitedDeposit).not.toBeNull();
    });
  });

  // Regression: I3 moved the earnOptions landing to after the mainnet
  // scanned-balances block so it would stop sitting in front of that scan.
  // But the scan dispatches a throwaway `scannedPayload` local rather than
  // updating `payload` itself, so the earnOptions dispatch that follows
  // spreads the still-unscanned `payload` -- and the reducer fully replaces
  // state per dispatch (helpers/request.ts), so that silently reverts
  // `balances`/`isScanAppended` right after the scan lands. Affects every
  // mainnet account with zero Blend positions (no error, empty list) -- the
  // only population for which `earnOptionsRequest` is non-null.
  it("keeps the Blockaid-scanned balances after the earnOptions dispatch that follows it", async () => {
    const { result } = renderHook(
      () => useGetAccountData({ showHidden: false, includeIcons: false }),
      { wrapper },
    );

    await act(async () => {
      await result.current.fetchData({ useAppDataCache: false });
    });

    const resolved = result.current.state.data as any;

    expect(resolved.isScanAppended).toBe(true);
    expect(resolved.balances).toEqual(SCANNED_BALANCES);
  });

  it("fetches the Positions tab's pool catalog and earn options", async () => {
    const { result } = renderHook(
      () => useGetAccountData({ showHidden: false, includeIcons: false }),
      { wrapper },
    );

    await act(async () => {
      await result.current.fetchData({ useAppDataCache: false });
    });

    expect(getPoolsSpy).toHaveBeenCalledTimes(1);
    expect(getEarnOptionsSpy).toHaveBeenCalledTimes(1);
  });

  // With the tab hidden, Home makes none of its requests.
  it("skips the pool catalog and earn options while positions_enabled is off", async () => {
    const { result } = renderHook(
      () => useGetAccountData({ showHidden: false, includeIcons: false }),
      { wrapper: wrapperWithPositionsOff },
    );

    await act(async () => {
      await result.current.fetchData({ useAppDataCache: false });
    });

    expect(getPoolsSpy).not.toHaveBeenCalled();
    expect(getEarnOptionsSpy).not.toHaveBeenCalled();
    expect((result.current.state.data as any).pools).toEqual([]);
  });
});
