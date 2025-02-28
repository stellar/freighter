import React from "react";
import { render, waitFor, screen } from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { Balances } from "@shared/api/types/backend-api";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { Swap } from "popup/views/Swap";

import { Wrapper, mockAccounts } from "../../__testHelpers__";

const publicKey = "GCXRLIZUQNZ3YYJDGX6Z445P7FG5WXT7UILBO5CFIYYM7Z7YTIOELC6O";

export const swapMockBalances = {
  balances: {} as any as Balances,
  isFunded: true,
  subentryCount: 1,
};

jest.spyOn(ApiInternal, "signFreighterTransaction").mockImplementation(() =>
  Promise.resolve({
    signedTransaction:
      "AAAAAgAAAADaBSz5rQFDZHNdV8//w/Yiy11vE1ZxGJ8QD8j7HUtNEwAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADaBSz5rQFDZHNdV8//w/Yiy11vE1ZxGJ8QD8j7HUtNEwAAAAAAAAAAAvrwgAAAAAAAAAABHUtNEwAAAEBY/jSiXJNsA2NpiXrOi6Ll6RiIY7v8QZEEZviM8HmmzeI4FBP9wGZm7YMorQue+DK9KI5BEXDt3hi0VOA9gD8A",
  }),
);

jest.spyOn(UseNetworkFees, "useNetworkFees").mockImplementation(() => ({
  recommendedFee: "0.00001",
  networkCongestion: UseNetworkFees.NetworkCongestion.MEDIUM,
}));

jest.mock("popup/helpers/horizonGetBestPath", () => ({
  get horizonGetBestPath() {
    return jest.fn(() => ({
      path: [
        {
          asset_code: "TEST",
          asset_issuer:
            "GCQQKT67XY6N2GTAH3D2Q3AGKYYC6TD33AL2Y36HYT6PKI2SLWDHAYYM",
          asset_type: "credit_alphanum4",
        },
      ],
      source_amount: "20",
      source_asset_type: "credit_alphanum4",
      source_asset_code: "XLM",
      source_asset_issuer: "native",
      destination_amount: "10",
      destination_asset_type: "credit_alphanum4",
      destination_asset_code: "USDC",
      destination_asset_issuer:
        "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
    }));
  },
}));

jest.mock("lodash/debounce", () => jest.fn((fn) => fn));

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    Asset: original.Asset,
    Operation: original.Operation,
    TransactionBuilder: original.TransactionBuilder,
    Networks: original.Networks,
    Horizon: {
      Server: class {
        loadAccount() {
          return {
            sequenceNumber: () => 1,
            accountId: () => publicKey,
            incrementSequenceNumber: () => {},
          };
        }
      },
    },
    SorobanRpc: original.SorobanRpc,
  };
});

describe.skip("Swap unfunded account", () => {
  jest
    .spyOn(ApiInternal, "getAccountBalances")
    .mockImplementation(() => Promise.resolve(swapMockBalances));

  jest
    .spyOn(ApiInternal, "getAssetIcons")
    .mockImplementation(() => Promise.resolve({}));

  jest.spyOn(ApiInternal, "getHiddenAssets").mockImplementation(() =>
    Promise.resolve({
      hiddenAssets: {},
      error: "",
    }),
  );

  beforeEach(() => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as any),
    );
  });
  beforeEach(async () => {
    render(
      <Wrapper
        routes={[ROUTES.swap]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey,
            allAccounts: mockAccounts,
            hasPrivateKey: true,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
        }}
      >
        <Swap />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toBeDefined();
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it("renders an empty balance and no available swap options", () => {
    expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
      "Swap XLM",
    );
    expect(screen.getByTestId("AppHeaderPageSubtitle")).toHaveTextContent(
      "0 XLM available",
    );
    expect(screen.getByTestId("send-amount-btn-continue")).toBeDisabled();
  });
});
