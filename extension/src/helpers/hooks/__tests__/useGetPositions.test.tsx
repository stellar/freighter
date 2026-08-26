import React from "react";
import { renderHook, act } from "@testing-library/react";

import { getBlendPositions } from "@shared/api/helpers/blend";
import {
  TESTNET_NETWORK_DETAILS,
  FUTURENET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { useGetPositions } from "helpers/hooks/useGetPositions";
import { TEST_PUBLIC_KEY, Wrapper } from "popup/__testHelpers__";

jest.mock("@shared/api/helpers/blend", () => ({
  getBlendPositions: jest.fn(),
}));
jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));

const mockedGet = getBlendPositions as jest.Mock;

const positions = {
  address: TEST_PUBLIC_KEY,
  totalValueUsd: 500.12,
  netApy: 0.1694,
  positions: [],
  backstop: [],
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Wrapper state={{ cache: { positionsData: {} } }} routes={["/"]}>
    {children}
  </Wrapper>
);

// Preloads the cache slice with one entry for TEST_PUBLIC_KEY on Testnet, so
// the cache-hit/cache-stale branches can be exercised without a live fetch.
const wrapperWithCachedEntry =
  (entry: typeof positions & { updatedAt: number }) =>
  ({ children }: { children: React.ReactNode }) => (
    <Wrapper
      state={{
        cache: {
          positionsData: {
            [TESTNET_NETWORK_DETAILS.network]: {
              [TEST_PUBLIC_KEY]: entry,
            },
          },
        },
      }}
      routes={["/"]}
    >
      {children}
    </Wrapper>
  );

beforeEach(() => mockedGet.mockReset());

describe("useGetPositions", () => {
  it("fetches and returns the account's positions", async () => {
    mockedGet.mockResolvedValue(positions);
    const { result } = renderHook(() => useGetPositions({ useCache: false }), {
      wrapper,
    });

    let resolved;
    await act(async () => {
      resolved = await result.current.fetchData({
        publicKey: TEST_PUBLIC_KEY,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
    });

    expect(mockedGet).toHaveBeenCalledWith({
      publicKey: TEST_PUBLIC_KEY,
      networkDetails: TESTNET_NETWORK_DETAILS,
    });
    expect(resolved).toEqual(positions);
  });

  it("short-circuits to an empty result on an earn-unsupported network", async () => {
    // Futurenet has no allowlisted pool, and the backend rejects any network
    // outside PUBLIC/TESTNET with a 400. Gate here rather than spending a
    // round trip to learn that.
    const { result } = renderHook(() => useGetPositions({ useCache: false }), {
      wrapper,
    });

    let resolved;
    await act(async () => {
      resolved = await result.current.fetchData({
        publicKey: TEST_PUBLIC_KEY,
        networkDetails: FUTURENET_NETWORK_DETAILS,
      });
    });

    expect(mockedGet).not.toHaveBeenCalled();
    expect(resolved).toEqual({
      address: TEST_PUBLIC_KEY,
      totalValueUsd: null,
      netApy: null,
      positions: [],
      backstop: [],
    });
  });

  it("surfaces a rejection as an error state and rethrows", async () => {
    // Unlike collectibles, which swallow failures, the Positions tab has a real
    // error state — "we could not load this" must not read as "you have none".
    mockedGet.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useGetPositions({ useCache: false }), {
      wrapper,
    });

    await act(async () => {
      await expect(
        result.current.fetchData({
          publicKey: TEST_PUBLIC_KEY,
          networkDetails: TESTNET_NETWORK_DETAILS,
        }),
      ).rejects.toThrow("boom");
    });

    expect(result.current.state.state).toBe("ERROR");
  });

  it("serves a fresh cache entry without calling the API", async () => {
    const cachedEntry = { ...positions, updatedAt: Date.now() };
    const { result } = renderHook(() => useGetPositions({ useCache: true }), {
      wrapper: wrapperWithCachedEntry(cachedEntry),
    });

    let resolved;
    await act(async () => {
      resolved = await result.current.fetchData({
        publicKey: TEST_PUBLIC_KEY,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
    });

    expect(mockedGet).not.toHaveBeenCalled();
    expect(resolved).toEqual(cachedEntry);
  });

  it("bypasses a fresh cache entry when the call overrides useCache to false", async () => {
    // The lever the 30s refresh interval and an account/network switch rely
    // on: even with a hook-level `useCache: true` and a fresh entry, a
    // per-call `useCache: false` must still reach the network.
    mockedGet.mockResolvedValue(positions);
    const cachedEntry = { ...positions, updatedAt: Date.now() };
    const { result } = renderHook(() => useGetPositions({ useCache: true }), {
      wrapper: wrapperWithCachedEntry(cachedEntry),
    });

    let resolved;
    await act(async () => {
      resolved = await result.current.fetchData({
        publicKey: TEST_PUBLIC_KEY,
        networkDetails: TESTNET_NETWORK_DETAILS,
        useCache: false,
      });
    });

    expect(mockedGet).toHaveBeenCalledWith({
      publicKey: TEST_PUBLIC_KEY,
      networkDetails: TESTNET_NETWORK_DETAILS,
    });
    expect(resolved).toEqual(positions);
  });

  it("refetches when the cached entry is stale", async () => {
    mockedGet.mockResolvedValue(positions);
    // Outside the 3-minute isCacheValid window.
    const staleEntry = { ...positions, updatedAt: Date.now() - 200000 };
    const { result } = renderHook(() => useGetPositions({ useCache: true }), {
      wrapper: wrapperWithCachedEntry(staleEntry),
    });

    let resolved;
    await act(async () => {
      resolved = await result.current.fetchData({
        publicKey: TEST_PUBLIC_KEY,
        networkDetails: TESTNET_NETWORK_DETAILS,
      });
    });

    expect(mockedGet).toHaveBeenCalledWith({
      publicKey: TEST_PUBLIC_KEY,
      networkDetails: TESTNET_NETWORK_DETAILS,
    });
    expect(resolved).toEqual(positions);
  });
});
