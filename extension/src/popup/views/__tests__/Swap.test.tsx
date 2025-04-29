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
import * as BlockaidHelpers from "popup/helpers/blockaid";
import { initialState as transactionSubmissionInitialState } from "popup/ducks/transactionSubmission";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import BigNumber from "bignumber.js";

import {
  APPLICATION_STATE,
  APPLICATION_STATE as ApplicationState,
} from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import { Swap } from "popup/views/Swap";

import { Wrapper, mockAccounts } from "../../__testHelpers__";
import * as GetAssetDomain from "popup/helpers/getAssetDomain";
import * as GetIconHelper from "@shared/api/helpers/getIconUrlFromIssuer";
import { SettingsState } from "@shared/api/types";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";

export const swapMockBalances = {
  balances: {
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
  } as any,
  isFunded: true,
  subentryCount: 1,
};

const swapMaliciousMockBalances = {
  balances: {
    "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM": {
      token: {
        code: "USDC",
        issuer: {
          key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
        },
      },
      total: new BigNumber("111"),
      available: new BigNumber("111"),
      blockaidData: {
        result_type: "Spam",
        features: [{ description: "" }],
      },
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
  } as any,
  isFunded: true,
  subentryCount: 1,
};
jest
  .spyOn(ApiInternal, "getHiddenAssets")
  .mockImplementation(() => Promise.resolve({ hiddenAssets: {}, error: "" }));

jest
  .spyOn(GetAssetDomain, "getAssetDomain")
  .mockImplementation(() => Promise.resolve("centre.io"));

jest
  .spyOn(ApiInternal, "getAccountBalances")
  .mockImplementation(() => Promise.resolve(swapMockBalances));

jest
  .spyOn(ApiInternal, "getAssetIcons")
  .mockImplementation(() => Promise.resolve({}));

jest
  .spyOn(ApiInternal, "getAccountHistory")
  .mockImplementation(() => Promise.resolve([]));

jest
  .spyOn(GetIconHelper, "getIconUrlFromIssuer")
  .mockImplementation(() => Promise.resolve("icon_url"));

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

jest.spyOn(BlockaidHelpers, "useScanTx").mockImplementation(() => {
  return {
    scanTx: () => Promise.resolve(null),
    isLoading: false,
    setLoading: () => {},
    data: null,
    error: null,
  };
});

jest.spyOn(ApiInternal, "loadAccount").mockImplementation(() =>
  Promise.resolve({
    hasPrivateKey: true,
    publicKey: "G1",
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: mockAccounts,
    bipPath: "bip-path",
    tokenIdList: [],
  }),
);

jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
  Promise.resolve({
    networkDetails: TESTNET_NETWORK_DETAILS,
    networksList: DEFAULT_NETWORKS,
    hiddenAssets: {},
    allowList: ApiInternal.DEFAULT_ALLOW_LIST,
    error: "",
    isDataSharingAllowed: false,
    isMemoValidationEnabled: false,
    isHideDustEnabled: true,
    settingsState: SettingsState.SUCCESS,
    isSorobanPublicEnabled: false,
    isRpcHealthy: true,
    userNotification: {
      enabled: false,
      message: "",
    },
    isExperimentalModeEnabled: false,
    isHashSigningEnabled: false,
    isNonSSLEnabled: false,
    experimentalFeaturesState: SettingsState.SUCCESS,
    assetsLists: DEFAULT_ASSETS_LISTS,
  }),
);

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

describe.skip("Swap", () => {
  beforeEach(() => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as any),
    );
  });

  afterEach(() => {});

  afterAll(() => {
    jest.clearAllMocks();
  });

  it("renders swap view initial state", async () => {
    render(
      <Wrapper
        routes={["/amount"]}
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
            hiddenAssets: {},
          },
        }}
      >
        <Swap />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("AppHeaderPageTitle"));
    expect(screen.getByTestId("AppHeaderPageTitle")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageSubtitle")).not.toHaveTextContent(
        "0 XLM available",
      );
    });

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

  it("renders swap view with malicious asset", async () => {
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(swapMaliciousMockBalances));

    jest
      .spyOn(ApiInternal, "getAssetIcons")
      .mockImplementation(() => Promise.resolve({}));

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

    await waitFor(() => screen.getByTestId("AppHeaderPageTitle"));
    expect(screen.getByTestId("AppHeaderPageTitle")).toBeDefined();

    expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
      "Swap XLM",
    );

    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageSubtitle")).not.toHaveTextContent(
        "0 XLM available",
      );
    });

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
    expect(destinationAsset).toContainElement(
      screen.getByTestId("ScamAssetIcon"),
    );
    expect(screen.getByTestId("send-amount-btn-continue")).toBeDisabled();
  });

  it("set max amount", async () => {
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

    await waitFor(() => screen.getByTestId("AppHeaderPageTitle"));
    expect(screen.getByTestId("AppHeaderPageTitle")).toBeDefined();

    const setMaxButton = screen.getByTestId("SendAmountSetMax");

    await waitFor(async () => {
      expect(setMaxButton).toBeInTheDocument();
      fireEvent.click(setMaxButton);

      await waitFor(() => {
        expect(
          screen.getByTestId("send-amount-amount-input"),
        ).not.toHaveTextContent("0");
      });

      expect(screen.getByTestId("send-amount-amount-input")).toHaveValue(
        "220.49999",
      );
    });

    expect(await screen.findByTestId("SendAmountRate")).toHaveTextContent(
      "1 XLM ≈ 0.0453515 USDC",
    );
  });

  it("swap custom amount", async () => {
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(swapMockBalances));

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
          transactionSubmission: {
            ...transactionSubmissionInitialState,
            transactionData: {
              ...transactionSubmissionInitialState.transactionData,
            },
            accountBalances: swapMockBalances,
          },
        }}
      >
        <Swap />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("AppHeaderPageTitle"));
    expect(screen.getByTestId("AppHeaderPageTitle")).toBeDefined();

    const amountInput = screen.getByTestId("send-amount-amount-input");

    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toBeDefined();
    });

    await waitFor(async () => {
      fireEvent.change(amountInput, { target: { value: "20" } });
      expect(screen.getByTestId("send-amount-amount-input")).not.toHaveValue(
        "0",
      );
    });
    expect(screen.getByTestId("send-amount-amount-input")).toHaveValue("20");

    // Loader is flakey in CI
    // expect(await screen.findByTestId("SendAmountRateLoader")).toBeVisible();
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
      expect(continueButton).toBeInTheDocument();
      fireEvent.click(continueButton);
    });

    // Swap Settings view
    await waitFor(() => {
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
      expect(reviewSwapButton).toBeInTheDocument();
      fireEvent.click(reviewSwapButton);
    });

    // Confirm Swap view
    await waitFor(() => screen.getByTestId("AppHeaderPageTitle"));
    expect(screen.getByTestId("AppHeaderPageTitle")).toBeDefined();
    await waitFor(() => {
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
      await waitFor(() => {
        expect(swapButton).toBeInTheDocument();
        fireEvent.click(swapButton);
      });
    });

    // Swap success view
    await waitFor(() => {
      screen.getByTestId("AppHeaderPageTitle");
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
      expect(viewDetailsButton).toBeInTheDocument();
      fireEvent.click(viewDetailsButton);
    });

    // Swap details view
    await waitFor(() => {
      screen.getByTestId("AppHeaderPageTitle");
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
