import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import { SearchAsset } from "popup/components/manageAssets/SearchAsset";
import { mockAccounts, mockBalances, Wrapper } from "popup/__testHelpers__";
import { ROUTES } from "popup/constants/routes";
import {
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
  NETWORKS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: jest.fn(() => ({
    pathname: "/manage-assets/search-asset",
    search: "",
    hash: "",
    state: null,
    key: "test",
  })),
}));

// A search with one result, so the rows render.
jest.mock(
  "popup/components/manageAssets/SearchAsset/hooks/useAssetLookup",
  () => ({
    useAssetLookup: () => ({
      fetchData: jest.fn().mockResolvedValue(undefined),
      state: {
        state: "SUCCESS",
        data: {
          verifiedAssetRows: [{ code: "USDC", issuer: "G" }],
          unverifiedAssetRows: [],
          isVerifiedToken: true,
          isVerificationInfoShowing: false,
        },
      },
    }),
  }),
);

// Stands in for a Hide from a row's detail sheet.
jest.mock("popup/components/manageAssets/ManageAssetRows", () => ({
  ManageAssetRows: ({
    onBalancesChanged,
  }: {
    onBalancesChanged?: () => void;
  }) => (
    <button
      type="button"
      data-testid="sheet-hide"
      onClick={() => onBalancesChanged?.()}
    >
      hide
    </button>
  ),
}));

describe("SearchAsset: a hide from a row's detail sheet", () => {
  it("refreshes the hidden map and keeps the typed search", async () => {
    const balancesSpy = jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockBalances));
    const hiddenSpy = jest
      .spyOn(ApiInternal, "getHiddenAssets")
      .mockImplementation(() =>
        Promise.resolve({ hiddenAssets: {}, error: "" }),
      );
    render(
      <Wrapper
        routes={[ROUTES.searchAsset]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            hasPrivateKey: true,
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            assetsLists: { [NETWORKS.PUBLIC]: [] },
          },
        }}
      >
        <SearchAsset />
      </Wrapper>,
    );
    fireEvent.change(await screen.findByTestId("search-asset-input"), {
      target: { value: "USDC" },
    });
    const hiddenReads = hiddenSpy.mock.calls.length;
    const balanceReads = balancesSpy.mock.calls.length;

    fireEvent.click(await screen.findByTestId("sheet-hide"));

    await waitFor(() =>
      expect(hiddenSpy.mock.calls.length).toBeGreaterThan(hiddenReads),
    );
    // No screen-level reload, whose loading state would remount the form.
    expect(balancesSpy.mock.calls.length).toBe(balanceReads);
    expect(screen.getByTestId("search-asset-input")).toHaveValue("USDC");
    balancesSpy.mockRestore();
    hiddenSpy.mockRestore();
  });
});
