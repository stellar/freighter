import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import * as ApiInternal from "@shared/api/internal";
import { makeDummyStore, TEST_PUBLIC_KEY } from "popup/__testHelpers__";
import { selectHiddenAssetsFor } from "popup/ducks/hiddenAssets";
import { useGetAssetData } from "popup/components/manageAssets/AssetVisibility/hooks/useGetAssetData";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";

const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

describe("useGetAssetData changeAssetVisibility", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  // The account list filters against the redux mirror, so a write that only
  // reaches the background leaves the asset wrongly hidden until a reload.
  it("writes the returned map into the redux mirror", async () => {
    jest
      .spyOn(ApiInternal, "changeAssetVisibility")
      .mockResolvedValue({ hiddenAssets: {}, error: "" } as any);

    const store = makeDummyStore({
      settings: { networkDetails: TESTNET_NETWORK_DETAILS },
    });

    const { result } = renderHook(
      () => useGetAssetData({ showHidden: true, includeIcons: false }),
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <Provider store={store}>
            <MemoryRouter>{children}</MemoryRouter>
          </Provider>
        ),
      },
    );

    expect(
      selectHiddenAssetsFor(
        store.getState() as any,
        TESTNET_NETWORK_DETAILS.networkName,
        TEST_PUBLIC_KEY,
      ),
    ).toBeUndefined();

    await act(async () => {
      await result.current.changeAssetVisibility({
        assetKey: USDC,
        visibility: "visible",
        publicKey: TEST_PUBLIC_KEY,
      });
    });

    expect(
      selectHiddenAssetsFor(
        store.getState() as any,
        TESTNET_NETWORK_DETAILS.networkName,
        TEST_PUBLIC_KEY,
      ),
    ).toEqual({});
  });

  it("mirrors a hide as well as an unhide", async () => {
    jest
      .spyOn(ApiInternal, "changeAssetVisibility")
      .mockResolvedValue({
        hiddenAssets: { [USDC]: "hidden" },
        error: "",
      } as any);

    const store = makeDummyStore({
      settings: { networkDetails: TESTNET_NETWORK_DETAILS },
    });

    const { result } = renderHook(
      () => useGetAssetData({ showHidden: true, includeIcons: false }),
      {
        wrapper: ({ children }: { children: React.ReactNode }) => (
          <Provider store={store}>
            <MemoryRouter>{children}</MemoryRouter>
          </Provider>
        ),
      },
    );

    await act(async () => {
      await result.current.changeAssetVisibility({
        assetKey: USDC,
        visibility: "hidden",
        publicKey: TEST_PUBLIC_KEY,
      });
    });

    expect(
      selectHiddenAssetsFor(
        store.getState() as any,
        TESTNET_NETWORK_DETAILS.networkName,
        TEST_PUBLIC_KEY,
      ),
    ).toEqual({ [USDC]: "hidden" });
  });
});
