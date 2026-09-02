import React from "react";
import { renderHook, act } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import * as TokenListHelpers from "@shared/api/helpers/token-list";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { Wrapper } from "popup/__testHelpers__";
import { useGetIcons } from "../useGetIcons";

const PUBLIC_KEY = "G123";
const NETWORK = TESTNET_NETWORK_DETAILS.network;
const ICONLESS = "NOICON:GISSUER1";

const state = {
  settings: { networkDetails: TESTNET_NETWORK_DETAILS, networksList: [] },
  cache: {
    balanceData: {
      [NETWORK]: {
        [PUBLIC_KEY]: {
          balances: {
            [ICONLESS]: {
              token: { code: "NOICON", issuer: { key: "GISSUER1" } },
            },
          },
        },
      },
    },
    // The session already established this asset has no icon anywhere.
    icons: { [ICONLESS]: null },
    tokenLists: [{ assets: [] }],
    homeDomains: {},
    tokenDetails: {},
    historyData: {},
    tokenPrices: {},
    collections: {},
    popularTokens: {},
  },
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Wrapper state={state} routes={["/"]}>
    {children}
  </Wrapper>
);

describe("useGetIcons", () => {
  afterEach(() => jest.restoreAllMocks());

  it("honours the session's record that an asset has no icon", async () => {
    // Account re-runs this hook every time balances change. Without the
    // session's own icon map, an asset with no icon anywhere repeats the whole
    // chain — token lists, then Horizon, then the issuer's toml — on every one
    // of those passes.
    jest
      .spyOn(ApiInternal, "getAssetIconCache")
      .mockResolvedValue({ icons: {} });
    jest
      .spyOn(TokenListHelpers, "getCombinedAssetListData")
      .mockResolvedValue([]);
    const getAssetIcons = jest
      .spyOn(ApiInternal, "getAssetIcons")
      .mockResolvedValue({});

    const { result } = renderHook(() => useGetIcons(), { wrapper });
    await act(async () => {
      await result.current.fetchData();
    });

    const lookupCall = getAssetIcons.mock.calls.find(
      ([args]) => (args as any).assetsListsData !== undefined,
    );
    expect(lookupCall).toBeDefined();
    expect((lookupCall![0] as any).cachedIcons).toEqual({ [ICONLESS]: null });
  });
});
