import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import BigNumber from "bignumber.js";
import { Asset } from "stellar-sdk";

import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { NETWORKS, TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { Wrapper } from "popup/__testHelpers__";
import {
  ResolvedEarnTokens,
  useGetEarnTokensData,
} from "popup/components/earn/EarnTokenPicker/hooks/useGetEarnTokensData";

const mockFetchAppData = jest.fn();
const mockFetchBalances = jest.fn();
const mockGetBlendEarnOptions = jest.fn();
const mockGetBlendPools = jest.fn();
const mockResolveEarnAssetIcons = jest.fn();

jest.mock("helpers/hooks/useGetAppData", () => ({
  ...jest.requireActual("helpers/hooks/useGetAppData"),
  useGetAppData: () => ({ fetchData: mockFetchAppData }),
}));

jest.mock("helpers/hooks/useGetBalances", () => ({
  ...jest.requireActual("helpers/hooks/useGetBalances"),
  useGetBalances: () => ({ fetchData: mockFetchBalances }),
}));

jest.mock("@shared/api/helpers/blend", () => ({
  getBlendEarnOptions: (...args: unknown[]) => mockGetBlendEarnOptions(...args),
  getBlendPools: (...args: unknown[]) => mockGetBlendPools(...args),
}));

jest.mock("popup/components/earn/helpers/earnAssetIcons", () => ({
  ...jest.requireActual("popup/components/earn/helpers/earnAssetIcons"),
  resolveEarnAssetIcons: (...args: unknown[]) =>
    mockResolveEarnAssetIcons(...args),
}));

const PASSPHRASE = TESTNET_NETWORK_DETAILS.networkPassphrase;
const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.TESTNET]!;
const USDC_ISSUER = "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const USDC_CANONICAL = `USDC:${USDC_ISSUER}`;
const XLM_SAC = Asset.native().contractId(PASSPHRASE);
const USDC_SAC = new Asset("USDC", USDC_ISSUER).contractId(PASSPHRASE);
const USDC_ICON = "https://example.com/usdc.png";

const offer = {
  id: POOL_ID,
  name: "Fixed",
  supplyApy: 0.1,
  emissionsSupplyApr: 0,
};
const earnOptions = [
  { assetId: XLM_SAC, symbol: null, name: null, decimals: 7, pools: [offer] },
  {
    assetId: USDC_SAC,
    symbol: "USDC",
    name: USDC_CANONICAL,
    decimals: 7,
    pools: [offer],
  },
];
const pools = [{ id: POOL_ID, name: "Fixed", reserves: [] }];

const xlmBalance = {
  token: { type: "native", code: "XLM" },
  total: new BigNumber("100"),
};
const usdcBalance = {
  token: {
    type: "credit_alphanum4",
    code: "USDC",
    issuer: { key: USDC_ISSUER },
  },
  total: new BigNumber("5"),
};
const balancesOf = (...balances: object[]) => ({
  balances,
  isFunded: true,
  subentryCount: 0,
  icons: {},
});

const appData = {
  type: AppDataType.RESOLVED,
  account: { publicKey: "G123" },
  settings: { networkDetails: TESTNET_NETWORK_DETAILS },
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const renderData = () =>
  renderHook(() => useGetEarnTokensData(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <Wrapper
        routes={["/earn"]}
        state={{
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            assetsLists: {},
          },
          // Token lists already in the session, as Home leaves them.
          cache: { icons: {}, tokenLists: [{ assets: [] }] },
        }}
      >
        {children}
      </Wrapper>
    ),
  });

const resolvedData = (result: { current: { state: { data: unknown } } }) =>
  result.current.state.data as ResolvedEarnTokens;

describe("useGetEarnTokensData", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetchAppData.mockResolvedValue(appData);
    mockFetchBalances.mockResolvedValue(balancesOf(xlmBalance));
    mockGetBlendEarnOptions.mockResolvedValue(earnOptions);
    mockGetBlendPools.mockResolvedValue(pools);
    mockResolveEarnAssetIcons.mockResolvedValue({
      [USDC_CANONICAL]: USDC_ICON,
    });
  });

  it("reads the account, settings and balances Home already loaded", async () => {
    const { result } = renderData();

    await act(() => result.current.fetchData(true));

    expect(mockFetchAppData).toHaveBeenCalledWith(true);
    expect(mockFetchBalances).toHaveBeenCalledWith(
      "G123",
      false,
      TESTNET_NETWORK_DETAILS,
      true,
    );
  });

  it("fetches the Blend catalog alongside the balances, not after them", async () => {
    const balances = deferred<object>();
    mockFetchBalances.mockReturnValue(balances.promise);
    const { result } = renderData();

    act(() => {
      result.current.fetchData(true);
    });

    await waitFor(() => expect(mockGetBlendEarnOptions).toHaveBeenCalled());
    expect(mockGetBlendPools).toHaveBeenCalled();
    expect(result.current.state.state).toBe(RequestState.LOADING);

    await act(async () => balances.resolve(balancesOf(xlmBalance)));
    expect(result.current.state.state).toBe(RequestState.SUCCESS);
  });

  it("lists the tokens without waiting for icons, then fills them in", async () => {
    const icons = deferred<Record<string, string | null>>();
    mockResolveEarnAssetIcons.mockReturnValue(icons.promise);
    const { result } = renderData();

    await act(() => result.current.fetchData(true));

    expect(result.current.state.state).toBe(RequestState.SUCCESS);
    expect(resolvedData(result).held.map((row) => row.code)).toEqual(["XLM"]);
    expect(resolvedData(result).supported).toEqual([
      expect.objectContaining({ code: "USDC", iconUrl: undefined }),
    ]);

    await act(async () => icons.resolve({ [USDC_CANONICAL]: USDC_ICON }));

    expect(resolvedData(result).supported[0].iconUrl).toBe(USDC_ICON);
  });

  it("keeps the list on screen while it refreshes", async () => {
    const { result } = renderData();
    await act(() => result.current.fetchData(true));

    const balances = deferred<object>();
    mockFetchBalances.mockReturnValue(balances.promise);
    act(() => {
      result.current.fetchData(false);
    });

    expect(result.current.state.state).toBe(RequestState.SUCCESS);
    expect(resolvedData(result).supported.map((row) => row.code)).toEqual([
      "USDC",
    ]);

    // The swap that triggered the refresh bought USDC.
    await act(async () =>
      balances.resolve(balancesOf(xlmBalance, usdcBalance)),
    );

    expect(mockFetchBalances).toHaveBeenLastCalledWith(
      "G123",
      false,
      TESTNET_NETWORK_DETAILS,
      false,
    );
    expect(resolvedData(result).held.map((row) => row.code)).toEqual([
      "XLM",
      "USDC",
    ]);
  });

  it("keeps the list when a refresh fails", async () => {
    const { result } = renderData();
    await act(() => result.current.fetchData(true));

    mockFetchBalances.mockRejectedValue(new Error("network down"));
    await act(async () => {
      await expect(result.current.fetchData(false)).rejects.toThrow();
    });

    expect(result.current.state.state).toBe(RequestState.SUCCESS);
    expect(resolvedData(result).supported.map((row) => row.code)).toEqual([
      "USDC",
    ]);
  });

  it("shows the error state when the first load fails", async () => {
    mockGetBlendEarnOptions.mockRejectedValue(new Error("backend down"));
    const { result } = renderData();

    await act(async () => {
      await expect(result.current.fetchData(true)).rejects.toThrow();
    });

    expect(result.current.state.state).toBe(RequestState.ERROR);
  });

  it("doesn't let a slow icon lookup put back a list a refresh replaced", async () => {
    const firstIcons = deferred<Record<string, string | null>>();
    mockResolveEarnAssetIcons.mockReturnValueOnce(firstIcons.promise);
    const { result } = renderData();
    await act(() => result.current.fetchData(true));

    // The refresh finds USDC held, so no row needs an icon lookup.
    mockFetchBalances.mockResolvedValue(balancesOf(xlmBalance, usdcBalance));
    await act(() => result.current.fetchData(false));
    expect(resolvedData(result).held.map((row) => row.code)).toEqual([
      "XLM",
      "USDC",
    ]);

    await act(async () => firstIcons.resolve({ [USDC_CANONICAL]: USDC_ICON }));

    expect(resolvedData(result).held.map((row) => row.code)).toEqual([
      "XLM",
      "USDC",
    ]);
    expect(resolvedData(result).supported).toEqual([]);
  });
});
