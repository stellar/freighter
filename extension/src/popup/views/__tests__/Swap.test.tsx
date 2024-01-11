import React from "react";
import {
  render,
  waitFor,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";

import * as ApiInternal from "@shared/api/internal";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { Balances } from "@shared/api/types";
import { createMemoryHistory } from "history";
import BigNumber from "bignumber.js";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { Swap } from "popup/views/Swap";

import { Wrapper, mockAccounts } from "../../__testHelpers__";

export const swapMockBalances = {
  balances: ({
    "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM": {
      token: {
        code: "USDC",
        issuer: {
          key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        },
      },
      total: new BigNumber("111"),
      available: new BigNumber("111"),
    },
    native: {
      token: { type: "native", code: "XLM" },
      total: new BigNumber("222"),
      available: new BigNumber("222"),
    },
    "SRT:GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B": {
      token: {
        code: "SRT",
        issuer: {
          key: "GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B",
        },
      },
      total: new BigNumber("333"),
      available: new BigNumber("333"),
    },
  } as any) as Balances,
  isFunded: true,
  subentryCount: 1,
};

jest
  .spyOn(ApiInternal, "getAccountBalances")
  .mockImplementation(() => Promise.resolve(swapMockBalances));

jest.spyOn(ApiInternal, "signFreighterTransaction").mockImplementation(() =>
  Promise.resolve({
    signedTransaction:
      "AAAAAgAAAADaBSz5rQFDZHNdV8//w/Yiy11vE1ZxGJ8QD8j7HUtNEwAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADaBSz5rQFDZHNdV8//w/Yiy11vE1ZxGJ8QD8j7HUtNEwAAAAAAAAAAAvrwgAAAAAAAAAABHUtNEwAAAEBY/jSiXJNsA2NpiXrOi6Ll6RiIY7v8QZEEZviM8HmmzeI4FBP9wGZm7YMorQue+DK9KI5BEXDt3hi0VOA9gD8A",
  }),
);

jest
  .spyOn(ApiInternal, "submitFreighterTransaction")
  .mockImplementation(() => Promise.resolve({}));

jest.spyOn(UseNetworkFees, "useNetworkFees").mockImplementation(() => ({
  recommendedFee: "0.00001",
  networkCongestion: UseNetworkFees.NetworkCongestion.MEDIUM,
}));

const mockHistoryGetter = jest.fn();
jest.mock("popup/constants/history", () => ({
  get history() {
    return mockHistoryGetter();
  },
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

const publicKey = "GCXRLIZUQNZ3YYJDGX6Z445P7FG5WXT7UILBO5CFIYYM7Z7YTIOELC6O";

describe("Swap", () => {
  beforeEach(async () => {
    const history = createMemoryHistory();
    history.push(ROUTES.swap);
    mockHistoryGetter.mockReturnValue(history);

    render(
      <Wrapper
        history={history}
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
      expect(screen.getByTestId("send-amount-view")).toBeDefined();
    });
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it("renders swap view initial state", () => {
    expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
      "Swap XLM",
    );
    expect(screen.getByTestId("AppHeaderPageSubtitle")).toHaveTextContent(
      "220.49999 XLM available",
    );
    expect(screen.getByTestId("send-amount-amount-input")).toHaveValue("0");

    const assetSelects = screen.getAllByTestId("AssetSelect");
    const sourceAsset = assetSelects[0];
    const destinationAsset = assetSelects[1];

    expect(
      within(sourceAsset).getByTestId("AssetSelectSourceLabel"),
    ).toHaveTextContent("From");
    expect(
      within(sourceAsset).getByTestId("AssetSelectSourceCode"),
    ).toHaveTextContent("XLM");

    expect(
      within(destinationAsset).getByTestId("AssetSelectSourceLabel"),
    ).toHaveTextContent("To");
    expect(
      within(destinationAsset).getByTestId("AssetSelectSourceCode"),
    ).toHaveTextContent("USDC");
    expect(screen.getByTestId("send-amount-btn-continue")).toBeDisabled();
  });

  it("set max amount", async () => {
    const setMaxButton = screen.getByTestId("SendAmountSetMax");

    fireEvent.click(setMaxButton);
    expect(screen.getByTestId("send-amount-amount-input")).toHaveValue(
      "220.49999",
    );

    expect(await screen.findByTestId("SendAmountRate")).toHaveTextContent(
      "1 XLM ≈ 0.0453515 USDC",
    );
  });

  it("swap custom amount", async () => {
    const amountInput = screen.getByTestId("send-amount-amount-input");

    fireEvent.change(amountInput, { target: { value: "20" } });
    expect(screen.getByTestId("send-amount-amount-input")).toHaveValue("20");

    expect(await screen.findByTestId("SendAmountRateLoader")).toBeDefined();
    expect(await screen.findByTestId("SendAmountRate")).toHaveTextContent(
      "1 XLM ≈ 0.5000000 USDC",
    );

    const assetSelects = screen.getAllByTestId("AssetSelect");
    const sourceAsset = assetSelects[0];
    const destinationAsset = assetSelects[1];

    expect(
      within(sourceAsset).getByTestId("AssetSelectSourceAmount"),
    ).toHaveTextContent("20 XLM");
    expect(
      within(destinationAsset).getByTestId("AssetSelectSourceAmount"),
    ).toHaveTextContent("10 USDC");

    await waitFor(async () => {
      const continueButton = screen.getByTestId("send-amount-btn-continue");
      expect(continueButton).toBeEnabled();
      await fireEvent.click(continueButton);
    });

    // Swap Settings view
    await waitFor(() => {
      screen.getByTestId("send-settings-view");
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Swap Settings",
      );
      expect(
        screen.getByTestId("SendSettingsTransactionFee"),
      ).toHaveTextContent("0.00001 XLM");
      expect(
        screen.getByTestId("SendSettingsAllowedSlippage"),
      ).toHaveTextContent("1%");
    });

    await waitFor(async () => {
      const reviewSwapButton = screen.getByTestId("send-settings-btn-continue");
      expect(reviewSwapButton).toBeEnabled();
      await fireEvent.click(reviewSwapButton);
    });

    // Confirm Swap view
    await waitFor(() => {
      screen.getByTestId("transaction-details-view");
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Confirm Swap",
      );
      expect(
        screen.getByTestId("TransactionDetailsAssetSource"),
      ).toHaveTextContent("20 XLM");
      expect(
        screen.getByTestId("TransactionDetailsAssetDestination"),
      ).toHaveTextContent("10 USDC");
      expect(
        screen.getByTestId("TransactionDetailsConversionRate"),
      ).toHaveTextContent("1 XLM / 0.50 USDC");
      expect(
        screen.getByTestId("TransactionDetailsTransactionFee"),
      ).toHaveTextContent("0.00001 XLM");
      expect(
        screen.getByTestId("TransactionDetailsMinimumReceived"),
      ).toHaveTextContent("9.9 USDC");
    });

    await waitFor(async () => {
      const swapButton = screen.getByTestId("transaction-details-btn-send");
      expect(swapButton).toBeEnabled();
      await fireEvent.click(swapButton);
    });

    // Swap success view
    await waitFor(() => {
      screen.getByTestId("submit-success-view");
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Successfully swapped",
      );
      expect(screen.getByTestId("SubmitResultAmount")).toHaveTextContent(
        "20 XLM",
      );
      expect(screen.getByTestId("SubmitResultSource")).toHaveTextContent("XLM");
      expect(screen.getByTestId("SubmitResultDestination")).toHaveTextContent(
        "USDC",
      );
    });

    await waitFor(async () => {
      const viewDetailsButton = screen.getByTestId("SubmitResultDetailsButton");
      expect(viewDetailsButton).toBeEnabled();
      await fireEvent.click(viewDetailsButton);
    });

    // Swap details view
    await waitFor(() => {
      screen.getByTestId("transaction-details-view");
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Swapped",
      );
      expect(
        screen.getByTestId("TransactionDetailsAssetSource"),
      ).toHaveTextContent("20 XLM");
      expect(
        screen.getByTestId("TransactionDetailsAssetDestination"),
      ).toHaveTextContent("10 USDC");
      expect(
        screen.getByTestId("TransactionDetailsConversionRate"),
      ).toHaveTextContent("1 XLM / 0.50 USDC");
      expect(
        screen.getByTestId("TransactionDetailsTransactionFee"),
      ).toHaveTextContent("0.00001 XLM");
      expect(
        screen.getByTestId("TransactionDetailsMinimumReceived"),
      ).toHaveTextContent("9.9 USDC");
    });
  });
});
