import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";

import { makeDummyStore } from "popup/__testHelpers__";
import { APPLICATION_STATE } from "@shared/constants/applicationState";

const mockResolveSorobanDomain = jest.fn();
jest.mock("popup/helpers/sorobanDomains", () => ({
  resolveSorobanDomain: (...args: unknown[]) => mockResolveSorobanDomain(...args),
}));

// The hook debounces resolution with lodash/debounce (wait: 0), which defers
// via setTimeout - a macrotask that never fires inside `act()`'s microtask-only
// flush. Same mock used by Send.test.tsx / Swap.test.tsx / SwapUnfunded.test.tsx
// to make debounce synchronous under test.
jest.mock("lodash/debounce", () => jest.fn((fn) => fn));

const mockFetchAppData = jest.fn();
jest.mock("helpers/hooks/useGetAppData", () => ({
  ...jest.requireActual("helpers/hooks/useGetAppData"),
  useGetAppData: () => ({ fetchData: mockFetchAppData }),
}));

jest.mock("helpers/hooks/useGetBalances", () => ({
  useGetBalances: () => ({
    fetchData: jest.fn().mockResolvedValue({ isFunded: true }),
  }),
}));

jest.mock("@shared/api/internal", () => ({
  loadRecentAddresses: jest.fn().mockResolvedValue({ recentAddresses: [] }),
}));

import { AppDataType } from "helpers/hooks/useGetAppData";
import { useSendToData } from "../useSendToData";
import { RequestState } from "constants/request";

const NETWORK_DETAILS = {
  network: "PUBLIC",
  networkName: "Main Net",
  networkUrl: "https://horizon.stellar.org",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
  sorobanRpcUrl: "https://mainnet-rpc.example.com",
} as any;

const deferred = <T,>() => {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe("useSendToData - Soroban Domain resolution", () => {
  beforeEach(() => {
    mockResolveSorobanDomain.mockReset();
    mockFetchAppData.mockReset().mockResolvedValue({
      type: AppDataType.RESOLVED,
      account: {
        publicKey: "GACTIVEACCOUNT00000000000000000000000000000000000000000",
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      },
      settings: { networkDetails: NETWORK_DETAILS },
    });
  });

  const renderSendToData = () => {
    const store = makeDummyStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    return renderHook(() => useSendToData(), { wrapper });
  };

  it("resolves a Soroban Domain and stores it as domainAddress", async () => {
    mockResolveSorobanDomain.mockResolvedValue({
      address: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      domain: "jhon.xlm",
    });

    const { result } = renderSendToData();

    await act(async () => {
      await result.current.fetchData("jhon.xlm", {});
    });

    expect(result.current.state.state).toBe(RequestState.SUCCESS);
    const data = result.current.state.data as any;
    expect(data.validatedAddress).toBe(
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    );
    expect(data.domainAddress).toBe("jhon.xlm");
    expect(data.fedAddress).toBe("");
  });

  it("surfaces a translated error when resolution fails", async () => {
    mockResolveSorobanDomain.mockRejectedValue(
      new Error("Failed to resolve Soroban Domain"),
    );

    const { result } = renderSendToData();

    await act(async () => {
      await result.current.fetchData("nope.xlm", {});
    });

    expect(result.current.state.state).toBe(RequestState.ERROR);
  });

  it("does not let a slower, superseded resolution overwrite a newer one", async () => {
    const stale = deferred<{ address: string; domain: string }>();
    const fresh = deferred<{ address: string; domain: string }>();
    mockResolveSorobanDomain
      .mockReturnValueOnce(stale.promise)
      .mockReturnValueOnce(fresh.promise);

    const { result } = renderSendToData();

    let stalePromise: Promise<unknown>;
    let freshPromise: Promise<unknown>;
    await act(async () => {
      stalePromise = result.current.fetchData("stale.xlm", {});
      freshPromise = result.current.fetchData("fresh.xlm", {});
    });

    await act(async () => {
      fresh.resolve({
        address: "GFRESHFRESHFRESHFRESHFRESHFRESHFRESHFRESHFRESHFRESHFR",
        domain: "fresh.xlm",
      });
      await freshPromise;
    });

    expect((result.current.state.data as any).domainAddress).toBe(
      "fresh.xlm",
    );

    await act(async () => {
      stale.resolve({
        address: "GSTALESTALESTALESTALESTALESTALESTALESTALESTALESTALES",
        domain: "stale.xlm",
      });
      await stalePromise;
    });

    // The stale resolution must not have overwritten the fresh one.
    expect((result.current.state.data as any).domainAddress).toBe(
      "fresh.xlm",
    );
  });
});
