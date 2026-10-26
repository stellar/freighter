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

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { searchAsset } from "popup/helpers/searchAsset";
import { makeDummyStore } from "popup/__testHelpers__";
import { useAssetLookup } from "../useAssetLookup";

const ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
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
});
