import React from "react";
import { Provider } from "react-redux";
import { renderHook, act, waitFor } from "@testing-library/react";

// The hook reads the App store singleton directly for the token-list / popular
// caches; stub it with empty (but well-shaped) cache slices.
jest.mock("popup/App", () => ({
  store: {
    getState: () => ({ cache: { tokenLists: [], popularTokens: {} } }),
  },
}));
// No verified lists cached -> the hook fetches them; return empty so it proceeds
// straight to the search request.
jest.mock("@shared/api/helpers/token-list", () => ({
  getCombinedAssetListData: jest.fn().mockResolvedValue([]),
}));
jest.mock("popup/helpers/searchAsset", () => ({
  searchAsset: jest.fn().mockResolvedValue({ _embedded: { records: [] } }),
}));
jest.mock("popup/helpers/assetList", () => ({
  splitVerifiedAssetCurrency: jest.fn(),
}));
// The real read goes to the background, which tests don't run. Nothing is
// hidden unless a test says otherwise.
const mockReadHiddenAssets = jest.fn().mockResolvedValue({});
jest.mock("popup/helpers/useHiddenAssets", () => ({
  readHiddenAssets: (...args: unknown[]) => mockReadHiddenAssets(...args),
}));

import { splitVerifiedAssetCurrency } from "popup/helpers/assetList";
import { searchAsset } from "popup/helpers/searchAsset";
import { makeDummyStore } from "popup/__testHelpers__";
import {
  useSwapTokenLookup,
  resetSwapIdleCacheForTests,
} from "../useSwapTokenLookup";

const TESTNET = {
  // TESTNET supports discovery but has Blockaid disabled, so the search path
  // runs without the bulk scan — isolating the first FETCH_DATA_SUCCESS guard.
  network: "TESTNET",
  networkPassphrase: "Test SDF Network ; September 2015",
  networkUrl: "https://horizon-testnet.stellar.org",
} as any;

const deferred = () => {
  let resolve: (value: unknown) => void = () => {};
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe("useSwapTokenLookup fetchData — abort race (§ batch4 task 7)", () => {
  afterEach(() => {
    jest.clearAllMocks();
    mockReadHiddenAssets.mockResolvedValue({});
    resetSwapIdleCacheForTests();
  });

  it("serves a cached result without the tokens hidden since it was cached", async () => {
    const store = makeDummyStore({ settings: { assetsLists: {} } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useSwapTokenLookup(), { wrapper });
    const args = {
      balances: [],
      publicKey: "GADUMMY",
      networkDetails: TESTNET,
      searchTerm: "cached-usdc",
    };

    // First lookup succeeds and caches USDC under this term
    (splitVerifiedAssetCurrency as jest.Mock).mockResolvedValueOnce({
      verifiedAssets: [{ code: "USDC", issuer: "GUSD", domain: null }],
      unverifiedAssets: [],
    });
    await act(async () => {
      await result.current.fetchData(args);
    });
    expect(
      (result.current.state.data?.sections.verified ?? []).map((r) => r.code),
    ).toEqual(["USDC"]);

    // USDC is hidden, then the discovery request fails, so the hook falls
    // back to the cached result. It must not bring USDC back.
    mockReadHiddenAssets.mockResolvedValue({ "USDC:GUSD": "hidden" });
    (splitVerifiedAssetCurrency as jest.Mock).mockRejectedValueOnce(
      new Error("stellar.expert down"),
    );
    await act(async () => {
      await result.current.fetchData(args);
    });

    expect(result.current.state.data?.sections.verified).toEqual([]);
  });

  it("does not commit a superseded search's sections over the current one", async () => {
    const store = makeDummyStore({ settings: { assetsLists: {} } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useSwapTokenLookup(), { wrapper });

    // First split call belongs to the superseded ("stale") lookup, the second
    // to the current ("fresh") one (FIFO: the stale call is invoked first).
    const staleSplit = deferred();
    const freshSplit = deferred();
    (splitVerifiedAssetCurrency as jest.Mock)
      .mockReturnValueOnce(staleSplit.promise)
      .mockReturnValueOnce(freshSplit.promise);

    const baseArgs = {
      balances: [],
      publicKey: "GADUMMY",
      networkDetails: TESTNET,
    };

    // Kick off both lookups; the second aborts the first synchronously.
    let stalePromise: Promise<void>;
    let freshPromise: Promise<void>;
    await act(async () => {
      stalePromise = result.current.fetchData({
        ...baseArgs,
        searchTerm: "stale",
      });
      // Let the stale lookup get past its hidden-assets read and into the
      // search before it is superseded. Aborted earlier, it would exit at
      // that read and never reach the split this test races.
      await waitFor(() => expect(searchAsset).toHaveBeenCalledTimes(1));
      freshPromise = result.current.fetchData({
        ...baseArgs,
        searchTerm: "fresh",
      });
    });

    // The current ("fresh") lookup resolves first and commits its sections.
    await act(async () => {
      freshSplit.resolve({
        verifiedAssets: [{ code: "FRESH", issuer: "GFRESH", domain: null }],
        unverifiedAssets: [],
      });
      await freshPromise;
    });

    expect(
      (result.current.state.data?.sections.verified ?? []).map((r) => r.code),
    ).toContain("FRESH");

    // Now the superseded ("stale") lookup resolves last — its dispatch must be
    // dropped, not painted over the fresh sections (the "Your tokens" flash).
    await act(async () => {
      staleSplit.resolve({
        verifiedAssets: [{ code: "STALE", issuer: "GSTALE", domain: null }],
        unverifiedAssets: [],
      });
      await stalePromise;
    });

    const verifiedCodes = (
      result.current.state.data?.sections.verified ?? []
    ).map((r) => r.code);
    expect(verifiedCodes).toContain("FRESH");
    expect(verifiedCodes).not.toContain("STALE");
  });
});
