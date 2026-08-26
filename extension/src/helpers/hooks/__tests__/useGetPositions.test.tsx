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
});
