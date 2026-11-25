import React from "react";
import { Provider } from "react-redux";
import { renderHook, act, waitFor } from "@testing-library/react";

// The hook reads the App store singleton directly for the token-list cache.
jest.mock("popup/App", () => ({
  store: { getState: () => ({ cache: { tokenLists: [] } }) },
}));
jest.mock("@shared/api/helpers/token-list", () => ({
  getCombinedAssetListData: jest.fn().mockResolvedValue([]),
}));
jest.mock("@shared/api/helpers/getIconFromTokenList", () => ({
  getIconFromTokenLists: jest.fn().mockResolvedValue({}),
}));
jest.mock("popup/helpers/searchAsset", () => ({
  ...jest.requireActual("popup/helpers/searchAsset"),
  searchAsset: jest.fn(),
}));
// Every row is unverified, so all of them go through one run of chunks.
jest.mock("popup/helpers/assetList", () => ({
  splitVerifiedAssetCurrency: jest.fn(({ assets }) =>
    Promise.resolve({ verifiedAssets: [], unverifiedAssets: assets }),
  ),
}));
jest.mock("@sentry/browser", () => ({
  ...jest.requireActual("@sentry/browser"),
  captureException: jest.fn(),
}));

import { captureException } from "@sentry/browser";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { searchAsset } from "popup/helpers/searchAsset";
import { splitVerifiedAssetCurrency } from "popup/helpers/assetList";
import { makeDummyStore } from "popup/__testHelpers__";
import { useAssetLookup } from "../useAssetLookup";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const IMPERSONATOR = "GCDK6KWRHOQCWIVAYWMUEBXNH47E7HATCXJDWZPG6LPOQRYDOHXABANK";
const CONTRACT = "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA";

describe("useAssetLookup Blockaid scan", () => {
  let fetchSpy: jest.SpyInstance;

  const scannedIds = () =>
    fetchSpy.mock.calls.map(([url]) =>
      new URL(String(url)).searchParams.getAll("asset_ids"),
    );

  beforeEach(() => {
    // Like freighter-backend: a request without asset_ids fails validation
    // and has no `data`; otherwise every id gets a verdict.
    fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (url) => {
      const ids = new URL(String(url)).searchParams.getAll("asset_ids");
      const body = ids.length
        ? {
            data: {
              results: Object.fromEntries(
                ids.map((id) => [id, { result_type: "Malicious" }]),
              ),
            },
          }
        : { statusCode: 400, code: "FST_ERR_VALIDATION" };
      return new Response(JSON.stringify(body), {
        status: ids.length ? 200 : 400,
        headers: { "content-type": "application/json" },
      });
    });
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    jest.clearAllMocks();
  });

  // Contract tokens aren't scanned, so 10 of them make a chunk with nothing
  // to send. Its empty request used to fail and stop the scan, leaving the
  // classic token after it without its malicious verdict.
  it("still scans the chunks after one with nothing to scan", async () => {
    (searchAsset as jest.Mock).mockResolvedValue({
      _embedded: {
        records: [
          ...Array.from({ length: 10 }, (_, i) => ({
            asset: CONTRACT,
            code: `VAULT${i}`,
          })),
          { asset: `LIQTVAULT-${ISSUER}-2` },
        ],
      },
    });
    const store = makeDummyStore({ settings: { assetsLists: {} } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useAssetLookup(), { wrapper });

    await act(async () => {
      await result.current.fetchData({
        asset: "vault",
        isBlockaidEnabled: true,
        publicKey: ISSUER,
        isAllowListVerificationEnabled: false,
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    await waitFor(() => {
      const row = result.current.state.data?.unverifiedAssetRows.find(
        (assetRow) => assetRow.code === "LIQTVAULT",
      );
      expect(row?.isMalicious).toBe(true);
    });
    expect(scannedIds()).toEqual([[`LIQTVAULT-${ISSUER}`]]);
  });

  // The verified and unverified lists are scanned at the same time. Each
  // update used to write back the other list's rows as they were before its
  // scan, so whichever finished last wiped the other's verdicts, here the
  // impersonator's malicious one.
  it("keeps both lists' verdicts when the verified scan finishes last", async () => {
    (searchAsset as jest.Mock).mockResolvedValue({
      _embedded: {
        records: [
          { asset: `USDC-${ISSUER}-1` },
          { asset: `USDC-${IMPERSONATOR}-1` },
        ],
      },
    });
    (splitVerifiedAssetCurrency as jest.Mock).mockImplementationOnce(
      ({ assets }) =>
        Promise.resolve({
          verifiedAssets: assets.slice(0, 1),
          unverifiedAssets: assets.slice(1),
        }),
    );
    fetchSpy.mockImplementation(async (url) => {
      const ids = new URL(String(url)).searchParams.getAll("asset_ids");
      if (ids.includes(`USDC-${ISSUER}`)) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      const results = Object.fromEntries(
        ids.map((id) => [
          id,
          {
            result_type: id.endsWith(IMPERSONATOR) ? "Malicious" : "Benign",
          },
        ]),
      );
      return new Response(JSON.stringify({ data: { results } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    const store = makeDummyStore({ settings: { assetsLists: {} } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useAssetLookup(), { wrapper });

    await act(async () => {
      await result.current.fetchData({
        asset: "usdc",
        isBlockaidEnabled: true,
        publicKey: ISSUER,
        isAllowListVerificationEnabled: false,
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    await waitFor(() => {
      const data = result.current.state.data;
      expect(data?.verifiedAssetRows[0].isMalicious).toBe(false);
      expect(data?.unverifiedAssetRows[0].isMalicious).toBe(true);
    });
  });
});

describe("useAssetLookup superseded search", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // A new search aborts the one before it, but that request runs in the
  // background, so it still answers, with an AbortError. Its empty result used
  // to replace the new search's rows when it answered after them.
  it("keeps the new search's rows when the search it replaced answers late", async () => {
    let answerFirstSearch: (error: Error) => void = () => {};
    (searchAsset as jest.Mock)
      .mockImplementationOnce(
        () =>
          new Promise((_resolve, reject) => {
            answerFirstSearch = reject;
          }),
      )
      .mockResolvedValueOnce({
        _embedded: { records: [{ asset: `AQUA-${ISSUER}-1` }] },
      });
    const store = makeDummyStore({ settings: { assetsLists: {} } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useAssetLookup(), { wrapper });
    const search = (asset: string) =>
      result.current.fetchData({
        asset,
        isBlockaidEnabled: false,
        publicKey: ISSUER,
        isAllowListVerificationEnabled: false,
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    const rowCodes = () =>
      result.current.state.data?.unverifiedAssetRows.map((row) => row.code);

    let firstSearch: Promise<void> = Promise.resolve();
    await act(async () => {
      firstSearch = search("aqu");
    });
    // The first search's request is in flight before the second one starts.
    await waitFor(() => expect(searchAsset).toHaveBeenCalledTimes(1));
    await act(async () => {
      await search("aqua");
    });
    expect(rowCodes()).toEqual(["AQUA"]);

    await act(async () => {
      answerFirstSearch(
        new DOMException("asset search request aborted", "AbortError"),
      );
      await firstSearch;
    });

    expect(rowCodes()).toEqual(["AQUA"]);
    // A replaced search isn't a failure, so nothing goes to Sentry.
    expect(captureException).not.toHaveBeenCalled();
  });
});

describe("useAssetLookup search failure", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // The Error itself carries the backend's status and message, such as a 404
  // before the route is deployed or a 503 while StellarExpert is down.
  it("reports the search's own error to Sentry", async () => {
    const failure = new Error(
      'Failed to fetch asset search - 503: {"message":"asset search temporarily unavailable"}',
    );
    (searchAsset as jest.Mock).mockRejectedValueOnce(failure);
    const store = makeDummyStore({ settings: { assetsLists: {} } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const { result } = renderHook(() => useAssetLookup(), { wrapper });

    await act(async () => {
      await result.current.fetchData({
        asset: "aqua",
        isBlockaidEnabled: false,
        publicKey: ISSUER,
        isAllowListVerificationEnabled: false,
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    expect(captureException).toHaveBeenCalledWith(failure, {
      tags: { operation: "searchAsset" },
      extra: { network: "PUBLIC" },
    });
  });
});
