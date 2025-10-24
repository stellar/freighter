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
  useLocation: jest.fn(),
}));

describe("SearchAsset", () => {
  jest
    .spyOn(ApiInternal, "getAccountBalances")
    .mockImplementation(() => Promise.resolve(mockBalances));

  it("should render", async () => {
    render(
      <Wrapper
        routes={[ROUTES.searchAsset]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <SearchAsset />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Choose Asset",
      );
    });
  });
  it("should cancel the request when the component is unmounted", async () => {
    const signalMock = {
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      aborted: false,
    };
    const abortMock = jest.fn();
    const mockAbortController = jest.fn(() => ({
      abort: abortMock,
      signal: signalMock,
    }));

    jest
      .spyOn(global, "AbortController")
      .mockImplementation(() => mockAbortController() as any);

    const fetchSpy = jest.spyOn(global, "fetch").mockImplementation((url) => {
      return new Promise((resolve) => {
        if (
          url === "https://api.stellar.expert/explorer/public/asset?search=USDC"
        ) {
          return resolve({
            ok: true,
            json: async () => ({
              _embedded: {
                records: [
                  {
                    asset:
                      "USDC-GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
                  },
                ],
              },
            }),
          } as any);
        }
        if (
          url === "https://api.stellar.expert/explorer/public/asset?search=XLM"
        ) {
          return resolve({
            ok: true,
            json: async () => ({
              _embedded: {
                records: [
                  {
                    asset:
                      "XLM-GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
                  },
                ],
              },
            }),
          } as any);
        }
      });
    });

    render(
      <Wrapper
        routes={[ROUTES.searchAsset]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
            balances: mockBalances,
          },
          settings: {
            networkDetails: MAINNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            assetsLists: {
              [NETWORKS.PUBLIC]: [],
            },
          },
        }}
      >
        <SearchAsset />
      </Wrapper>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Choose Asset",
      );
    });

    fireEvent.change(screen.getByTestId("search-asset-input"), {
      target: { value: "USDC" },
    });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "https://api.stellar.expert/explorer/public/asset?search=USDC",
        {
          signal: signalMock,
        },
      );
    });

    fireEvent.change(screen.getByTestId("search-asset-input"), {
      target: { value: "XLM" },
    });

    await waitFor(() => {
      expect(abortMock).toHaveBeenCalledTimes(2);
      expect(fetchSpy).toHaveBeenCalledTimes(4);
    });
  });
});
