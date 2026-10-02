import React from "react";
import { Provider } from "react-redux";
import { act, renderHook, waitFor } from "@testing-library/react";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  MAINNET_NETWORK_DETAILS,
  NetworkDetails,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { CUSTOM_NETWORK } from "@shared/helpers/stellar";
import { AccountBalances } from "helpers/hooks/useGetBalances";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Collectibles } from "@shared/api/types/types";
import { makeDummyStore, TEST_PUBLIC_KEY } from "popup/__testHelpers__";
import { RequestState } from "constants/request";

import { useGetAccountData } from "../useGetAccountData";

jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  makeAccountActive: jest.fn().mockResolvedValue({
    publicKey: "",
    hasPrivateKey: true,
    bipPath: "",
  }),
  loadBackendSettings: jest.fn().mockResolvedValue({
    isSorobanPublicEnabled: true,
    isRpcHealthy: true,
    userNotification: { enabled: false, message: "" },
  }),
}));

const mockFetchAppData = jest.fn();
const mockFetchBalances = jest.fn();
const mockFetchCollectibles = jest.fn();
const mockFetchTokenPrices = jest.fn();

jest.mock("helpers/hooks/useGetAppData", () => ({
  ...jest.requireActual("helpers/hooks/useGetAppData"),
  useGetAppData: () => ({ fetchData: mockFetchAppData }),
}));
jest.mock("helpers/hooks/useGetBalances", () => ({
  ...jest.requireActual("helpers/hooks/useGetBalances"),
  useGetBalances: () => ({ fetchData: mockFetchBalances }),
}));
jest.mock("helpers/hooks/useGetCollectibles", () => ({
  ...jest.requireActual("helpers/hooks/useGetCollectibles"),
  useGetCollectibles: () => ({ fetchData: mockFetchCollectibles }),
}));
jest.mock("helpers/hooks/useGetTokenPrices", () => ({
  ...jest.requireActual("helpers/hooks/useGetTokenPrices"),
  useGetTokenPrices: () => ({ fetchData: mockFetchTokenPrices }),
}));

const OTHER_PUBLIC_KEY =
  "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const CUSTOM_NETWORK_DETAILS: NetworkDetails = {
  network: CUSTOM_NETWORK,
  networkName: "My Standalone Network",
  networkUrl: "http://localhost:8000",
  networkPassphrase: "Standalone Network ; February 2017",
};

/** A promise whose settlement this test controls. */
const deferred = <T,>() => {
  let settle: (value: T) => void = () => {};
  const promise = new Promise<T>((resolve) => {
    settle = resolve;
  });
  return { promise, settle: (value: T) => settle(value) };
};

/**
 * Balances are compared by `subentryCount` throughout, which stands in for
 * "whose snapshot is this" without needing a full balance list.
 */
const makeBalances = (subentryCount: number) =>
  ({
    balances: [],
    isFunded: true,
    subentryCount,
    error: undefined,
  }) as unknown as AccountBalances;

const makeCollectibles = (count: number) =>
  ({
    collections: new Array(count).fill({ collectionAddress: "C1", items: [] }),
  }) as unknown as Collectibles;

const appDataFor = (
  publicKey: string,
  networkDetails: NetworkDetails = TESTNET_NETWORK_DETAILS,
) => ({
  type: AppDataType.RESOLVED,
  account: {
    publicKey,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
  },
  settings: {
    networkDetails,
    allowList: {},
  },
});

const renderUseGetAccountData = () => {
  const store = makeDummyStore({
    auth: {
      allAccounts: [],
      publicKey: TEST_PUBLIC_KEY,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    },
    settings: { networkDetails: TESTNET_NETWORK_DETAILS },
  });

  return renderHook(
    () => useGetAccountData({ showHidden: false, includeIcons: false }),
    {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
      ),
    },
  );
};

/** The resolved snapshot the hook is currently serving. */
const resolved = (result: {
  current: ReturnType<typeof useGetAccountData>;
}) => {
  const { data } = result.current.state;
  if (!data || data.type !== AppDataType.RESOLVED) {
    throw new Error("expected resolved account data");
  }
  return data;
};

describe("useGetAccountData", () => {
  beforeEach(() => {
    mockFetchAppData.mockImplementation(() =>
      Promise.resolve(appDataFor(TEST_PUBLIC_KEY)),
    );
    mockFetchBalances.mockResolvedValue(makeBalances(1));
    mockFetchCollectibles.mockResolvedValue(makeCollectibles(1));
    mockFetchTokenPrices.mockResolvedValue({ tokenPrices: {} });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /** Loads account A and leaves the hook serving its data. */
  const loadFirstAccount = async () => {
    const { result } = renderUseGetAccountData();

    await act(async () => {
      await result.current.fetchData({ useAppDataCache: false });
    });

    await waitFor(() =>
      expect(result.current.state.state).toBe(RequestState.SUCCESS),
    );
    expect(resolved(result).publicKey).toBe(TEST_PUBLIC_KEY);

    return result;
  };

  /** Switches to `OTHER_PUBLIC_KEY` and waits for its snapshot to land. */
  const switchAccount = async (
    result: { current: ReturnType<typeof useGetAccountData> },
    subentryCount: number,
  ) => {
    mockFetchAppData.mockImplementation(() =>
      Promise.resolve(appDataFor(OTHER_PUBLIC_KEY)),
    );
    mockFetchBalances.mockResolvedValue(makeBalances(subentryCount));
    mockFetchCollectibles.mockResolvedValue(makeCollectibles(subentryCount));

    await act(async () => {
      await result.current.fetchData({
        useAppDataCache: false,
        updatedAppData: { publicKey: OTHER_PUBLIC_KEY },
        shouldForceBalancesRefresh: true,
      });
    });

    await waitFor(() =>
      expect(resolved(result).publicKey).toBe(OTHER_PUBLIC_KEY),
    );
  };

  it("ignores a superseded balances refresh rather than restoring the previous account", async () => {
    const result = await loadFirstAccount();

    // Account A's refresh goes out and hangs.
    const pending = deferred<AccountBalances>();
    mockFetchBalances.mockReturnValueOnce(pending.promise);

    let refresh: Promise<void> = Promise.resolve();
    act(() => {
      refresh = result.current.refreshBalances();
    });

    await switchAccount(result, 2);

    // A's balances land after B is on screen.
    await act(async () => {
      pending.settle(makeBalances(99));
      await refresh;
    });

    expect(resolved(result).publicKey).toBe(OTHER_PUBLIC_KEY);
    expect(resolved(result).balances.subentryCount).toBe(2);
  });

  it("ignores a superseded collectibles refresh rather than restoring the previous account", async () => {
    const result = await loadFirstAccount();

    const pending = deferred<Collectibles>();
    mockFetchCollectibles.mockReturnValueOnce(pending.promise);

    let refresh: Promise<void> = Promise.resolve();
    act(() => {
      refresh = result.current.refreshCollectibles();
    });

    await switchAccount(result, 2);

    await act(async () => {
      pending.settle(makeCollectibles(99));
      await refresh;
    });

    expect(resolved(result).publicKey).toBe(OTHER_PUBLIC_KEY);
    expect(resolved(result).collectibles.collections).toHaveLength(2);
  });

  it("ignores a superseded fetch rather than overwriting the newer one", async () => {
    const result = await loadFirstAccount();

    // A second fetch for account A hangs on its balances...
    const pending = deferred<AccountBalances>();
    mockFetchBalances.mockReturnValueOnce(pending.promise);

    let stale: Promise<unknown> = Promise.resolve();
    act(() => {
      stale = result.current.fetchData({ useAppDataCache: false });
    });

    // ...while a switch to B starts and finishes.
    await switchAccount(result, 2);

    await act(async () => {
      pending.settle(makeBalances(99));
      await stale;
    });

    expect(resolved(result).publicKey).toBe(OTHER_PUBLIC_KEY);
    expect(resolved(result).balances.subentryCount).toBe(2);
  });

  it("still applies a refresh when nothing has superseded it", async () => {
    const result = await loadFirstAccount();

    mockFetchBalances.mockResolvedValueOnce(makeBalances(7));

    await act(async () => {
      await result.current.refreshBalances();
    });

    expect(resolved(result).publicKey).toBe(TEST_PUBLIC_KEY);
    expect(resolved(result).balances.subentryCount).toBe(7);
  });

  it("stops polling as Mainnet once the network changes", async () => {
    jest.useFakeTimers();
    try {
      mockFetchAppData.mockImplementation(() =>
        Promise.resolve(appDataFor(TEST_PUBLIC_KEY, MAINNET_NETWORK_DETAILS)),
      );

      const { result } = renderUseGetAccountData();
      await act(async () => {
        await result.current.fetchData({ useAppDataCache: false });
      });
      expect(resolved(result).networkDetails).toBe(MAINNET_NETWORK_DETAILS);
      // The Mainnet load is what a cached flag would latch on.
      expect(mockFetchTokenPrices).toHaveBeenCalled();

      mockFetchAppData.mockImplementation(() =>
        Promise.resolve(appDataFor(TEST_PUBLIC_KEY, CUSTOM_NETWORK_DETAILS)),
      );
      await act(async () => {
        await result.current.fetchData({ useAppDataCache: false });
      });
      expect(resolved(result).networkDetails).toBe(CUSTOM_NETWORK_DETAILS);

      mockFetchBalances.mockClear();
      mockFetchTokenPrices.mockClear();

      await act(async () => {
        jest.advanceTimersByTime(30000);
      });

      expect(mockFetchBalances).toHaveBeenCalled();
      // `isMainnet` is the second argument. A stale `true` here reaches
      // `makeDisplayableBalances` on the standalone path, which puts the custom
      // network's asset ids through the Mainnet Blockaid bulk scan.
      expect(mockFetchBalances.mock.calls[0][1]).toBe(false);
      // The price poll is Mainnet-only -- `fetchData` skips it off Mainnet, so
      // the interval must not keep it alive.
      expect(mockFetchTokenPrices).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});
