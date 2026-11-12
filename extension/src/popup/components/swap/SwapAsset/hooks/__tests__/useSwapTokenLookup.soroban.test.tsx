import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";

const mockState = {
  cache: {
    tokenLists: [] as unknown[],
    popularTokens: {},
    icons: {} as Record<string, string | null>,
  },
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
jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));
jest.mock("@shared/api/internal", () => ({
  ...jest.requireActual("@shared/api/internal"),
  getTokenDetails: jest.fn(),
}));
jest.mock("@shared/helpers/soroban/token", () => ({
  ...jest.requireActual("@shared/helpers/soroban/token"),
  isSacContractExecutable: jest.fn().mockResolvedValue(false),
}));

import { captureException } from "@sentry/browser";
import { getTokenDetails } from "@shared/api/internal";
import { isSacContractExecutable } from "@shared/helpers/soroban/token";
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

  it("names a found token with no code by its shortened contract ID", async () => {
    (searchAsset as jest.Mock).mockResolvedValue({
      _embedded: { records: [{ asset: CONTRACT, decimals: 7 }] },
    });
    const { result } = renderLookup();

    const [row] = await search(result, "cbi7");

    expect(row.code).toBe("CBI7…IHRV");
  });

  describe("row icons", () => {
    const listing = (icon: string) => ({
      name: "List",
      assets: [{ contract: CONTRACT, code: "TKN", icon }],
    });

    it("prefer the user's asset lists over the issuer's stellar.toml", async () => {
      mockState.cache.tokenLists = [listing("https://list.example/tkn.png")];
      const { result } = renderLookup();

      const [row] = await search(result, "tkn");

      expect(row.image).toBe("https://list.example/tkn.png");
    });

    it("fall back to the stellar.toml image", async () => {
      const { result } = renderLookup();

      const [row] = await search(result, "tkn");

      expect(row.image).toBe("https://toml.example/tkn.png");
    });

    it("use the icon the wallet already cached for the token", async () => {
      mockState.cache.tokenLists = [listing("https://list.example/tkn.png")];
      mockState.cache.icons = {
        [`TKN:${CONTRACT}`]: "https://cached.example/tkn.png",
      };
      const { result } = renderLookup();

      const [row] = await search(result, "tkn");

      expect(row.image).toBe("https://cached.example/tkn.png");
    });
  });
});

describe("useSwapTokenLookup with a pasted contract ID", () => {
  const USDC_ISSUER =
    "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

  beforeEach(() => {
    (scanAssetBulk as jest.Mock).mockResolvedValue({ results: {} });
  });
  afterEach(() => {
    jest.clearAllMocks();
    resetSwapIdleCacheForTests();
  });

  it("lists the token the backend describes, whether or not stellar.expert indexes it", async () => {
    (getTokenDetails as jest.Mock).mockResolvedValue({
      name: "Token",
      symbol: "TKN",
      decimals: 18,
    });
    const { result } = renderLookup();

    const rows = await search(result, CONTRACT);

    expect(searchAsset).not.toHaveBeenCalled();
    expect(getTokenDetails).toHaveBeenCalledWith(
      expect.objectContaining({ contractId: CONTRACT, publicKey: "GADUMMY" }),
    );
    expect(rows).toEqual([
      expect.objectContaining({
        code: "TKN",
        issuer: CONTRACT,
        canonical: `TKN:${CONTRACT}`,
        isContract: true,
        decimals: 18,
      }),
    ]);
  });

  it("lists a SAC's id as its classic asset, which needs the trustline", async () => {
    (getTokenDetails as jest.Mock).mockResolvedValue({
      name: `USDC:${USDC_ISSUER}`,
      symbol: "USDC",
      decimals: 7,
    });
    (isSacContractExecutable as jest.Mock).mockResolvedValue(true);
    const { result } = renderLookup();

    const rows = await search(result, CONTRACT);

    expect(rows).toEqual([
      expect.objectContaining({
        code: "USDC",
        issuer: USDC_ISSUER,
        canonical: `USDC:${USDC_ISSUER}`,
        isContract: false,
        requiresTrustline: true,
      }),
    ]);
  });

  it("shows no match when the id is not a token", async () => {
    (getTokenDetails as jest.Mock).mockResolvedValue(null);
    const { result } = renderLookup();

    const rows = await search(result, CONTRACT);

    expect(rows).toEqual([]);
    expect(result.current.state.data!.isFallback).toBe(false);
  });

  it("falls back to held tokens, as a failed search does, when the lookup fails", async () => {
    (getTokenDetails as jest.Mock).mockRejectedValue(new Error("502"));
    const { result } = renderLookup();

    await search(result, CONTRACT);

    expect(result.current.state.data!.isFallback).toBe(true);
    expect(captureException).toHaveBeenCalled();
  });
});
