import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";

const mockState = {
  cache: { tokenLists: [] as unknown[], popularTokens: {}, icons: {} },
};
jest.mock("popup/App", () => ({
  store: { getState: () => mockState },
}));
jest.mock("@shared/api/helpers/token-list", () => ({
  getCombinedAssetListData: jest.fn().mockResolvedValue([]),
}));
jest.mock("popup/helpers/searchAsset", () => ({
  searchAsset: jest.fn(),
}));
jest.mock("popup/helpers/assetList", () => ({
  splitVerifiedAssetCurrency: jest.fn(async ({ assets }) => ({
    verifiedAssets: [],
    unverifiedAssets: assets,
  })),
}));
jest.mock("popup/helpers/useHiddenAssets", () => ({
  readHiddenAssets: jest.fn().mockResolvedValue({}),
}));
jest.mock("popup/helpers/blockaid", () => ({
  ...jest.requireActual("popup/helpers/blockaid"),
  scanAssetBulk: jest.fn(),
}));

import { searchAsset } from "popup/helpers/searchAsset";
import { scanAssetBulk } from "popup/helpers/blockaid";
import { SecurityLevel } from "popup/constants/blockaid";
import { makeDummyStore } from "popup/__testHelpers__";
import {
  useSwapTokenLookup,
  resetSwapIdleCacheForTests,
} from "../useSwapTokenLookup";

const CONTRACT = "CBI7UCH5KGSVQRO5H4SUCZUTZABCITZLRHQQZTWL2TK4RZ72TAR6IHRV";

const renderLookup = () => {
  const store = makeDummyStore({ settings: { assetsLists: {} } });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useSwapTokenLookup(), { wrapper });
};

const search = async (
  result: ReturnType<typeof renderLookup>["result"],
  searchTerm: string,
) => {
  await act(async () => {
    await result.current.fetchData({
      searchTerm,
      balances: [],
      publicKey: "GADUMMY",
      networkDetails: MAINNET_NETWORK_DETAILS,
    });
  });
  return result.current.state.data!.sections.unverified;
};

describe("useSwapTokenLookup with Soroban contract tokens", () => {
  beforeEach(() => {
    (searchAsset as jest.Mock).mockResolvedValue({
      _embedded: {
        records: [
          {
            asset: CONTRACT,
            code: "TKN",
            decimals: 18,
            tomlInfo: { image: "https://toml.example/tkn.png" },
          },
        ],
      },
    });
    (scanAssetBulk as jest.Mock).mockResolvedValue({
      results: { [`TKN-${CONTRACT}`]: { result_type: "Malicious" } },
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
    resetSwapIdleCacheForTests();
    mockState.cache.tokenLists = [];
    mockState.cache.icons = {};
  });

  it("finds one by search, with its decimals, and scans it with Blockaid", async () => {
    const { result } = renderLookup();

    const rows = await search(result, "tkn");

    expect(scanAssetBulk).toHaveBeenCalledWith(
      [`TKN-${CONTRACT}`],
      MAINNET_NETWORK_DETAILS,
      expect.anything(),
    );
    expect(rows).toEqual([
      expect.objectContaining({
        code: "TKN",
        issuer: CONTRACT,
        isContract: true,
        requiresTrustline: false,
        decimals: 18,
        securityLevel: SecurityLevel.MALICIOUS,
      }),
    ]);
  });
});
