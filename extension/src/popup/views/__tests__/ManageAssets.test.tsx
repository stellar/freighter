import React from "react";
import {
  render,
  waitFor,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import BigNumber from "bignumber.js";

import * as ApiInternal from "@shared/api/internal";
import * as UseNetworkFees from "popup/helpers/useNetworkFees";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { Balances } from "@shared/api/types/backend-api";
import * as SorobanHelpers from "@shared/api/helpers/soroban";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";

import {
  APPLICATION_STATE,
  APPLICATION_STATE as ApplicationState,
} from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import * as CheckSuspiciousAsset from "popup/helpers/checkForSuspiciousAsset";
import * as ManageAssetXDR from "popup/helpers/getManageAssetXDR";
import * as SearchAsset from "popup/helpers/searchAsset";
import * as BlockaidHelpers from "popup/helpers/blockaid";

import {
  AssetSelectType,
  initialState as transactionSubmissionInitialState,
} from "popup/ducks/transactionSubmission";

import { Wrapper, mockAccounts } from "../../__testHelpers__";
import { ManageAssets } from "../ManageAssets";
import { SettingsState } from "@shared/api/types";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";

const mockXDR =
  "AAAAAgAAAADaBSz5rQFDZHNdV8//w/Yiy11vE1ZxGJ8QD8j7HUtNEwAAAGQAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAADaBSz5rQFDZHNdV8//w/Yiy11vE1ZxGJ8QD8j7HUtNEwAAAAAAAAAAAvrwgAAAAAAAAAABHUtNEwAAAEBY/jSiXJNsA2NpiXrOi6Ll6RiIY7v8QZEEZviM8HmmzeI4FBP9wGZm7YMorQue+DK9KI5BEXDt3hi0VOA9gD8A";
const verifiedToken =
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";
const unverifiedToken =
  "CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND";

const manageAssetsMockBalances = {
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
      total: new BigNumber("0"),
      available: new BigNumber("0"),
    },
  } as any as Balances,
  isFunded: true,
  subentryCount: 1,
};

jest
  .spyOn(ApiInternal, "getHiddenAssets")
  .mockImplementation(() => Promise.resolve({ hiddenAssets: {}, error: "" }));

jest
  .spyOn(ApiInternal, "getAccountBalances")
  .mockImplementation(() => Promise.resolve(manageAssetsMockBalances));

jest
  .spyOn(ApiInternal, "getAssetIcons")
  .mockImplementation(() => Promise.resolve({}));

jest
  .spyOn(CheckSuspiciousAsset, "checkForSuspiciousAsset")
  .mockImplementation(({ issuer }: { issuer: string }) => {
    let isRevocable = false;
    let isNewAsset = false;
    let isInvalidDomain = false;

    if (issuer === "GBFJZSHWOMYS6U73NXQRRD4JX6TZNWEAFII6Z5INGWVJ2VCQ2K4NQMHP") {
      isRevocable = true;
      isNewAsset = true;
      isInvalidDomain = true;
    }

    return Promise.resolve({ isRevocable, isNewAsset, isInvalidDomain });
  });

jest
  .spyOn(ManageAssetXDR, "getManageAssetXDR")
  .mockImplementation(() => Promise.resolve(mockXDR));

jest.spyOn(ApiInternal, "signFreighterTransaction").mockImplementation(() =>
  Promise.resolve({
    signedTransaction: mockXDR,
  }),
);

jest.spyOn(ApiInternal, "signFreighterTransaction").mockImplementation(() =>
  Promise.resolve({
    signedTransaction: mockXDR,
  }),
);

jest.spyOn(UseNetworkFees, "useNetworkFees").mockImplementation(() => ({
  recommendedFee: "0.00001",
  networkCongestion: UseNetworkFees.NetworkCongestion.MEDIUM,
  fetchData: () => Promise.resolve({ recommendedFee: "00.1" }),
}));

jest.spyOn(SearchAsset, "searchAsset").mockImplementation(({ asset }) => {
  if (asset === "NEW") {
    return Promise.resolve({
      _embedded: {
        records: [
          {
            asset:
              "NEW-GDERVKOZAJS65FCY4EGCQEWV6PRCPZZHXLM37PIRCX6DG7EZVANMHXFY",
            domain: "new.domain.com",
          },
        ],
      },
    });
  }

  if (asset === "BMAL") {
    return Promise.resolve({
      _embedded: {
        records: [
          {
            asset:
              "BMAL-GBFJZSHWOMYS6U73NXQRRD4JX6TZNWEAFII6Z5INGWVJ2VCQ2K4NQMHP",
            domain: "bmal.domain.com",
          },
        ],
      },
    });
  }

  // Asset with warnings
  return Promise.resolve({
    _embedded: {
      records: [
        {
          asset: "BAD-GBFJZSHWOMYS6U73NXQRRD4JX6TZNWEAFII6Z5INGWVJ2VCQ2K4NQMHP",
          domain: "bad.domain.com",
          flags: {
            auth_required: true,
            auth_revocable: true,
            auth_immutable: false,
            auth_clawback_enabled: false,
          },
        },
      ],
    },
  });
});

jest
  .spyOn(SearchAsset, "getAssetLists")
  .mockImplementation(({ networkDetails }) => {
    return Promise.resolve([
      {
        status: "fulfilled",
        value: {
          name: "Test Asset List",
          description: "fake asset list for testing",
          network: networkDetails.network,
          version: "1",
          provider: "test-provider",
          assets: [
            {
              code: "USDC",
              contract:
                "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
              decimals: 7,
              domain: "centre.io",
              icon: "",
              issuer:
                "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
            },
          ],
        },
      },
    ]);
  });

jest
  .spyOn(SearchAsset, "getVerifiedTokens")
  .mockImplementation(({ contractId }) => {
    if (contractId === verifiedToken) {
      return Promise.resolve([
        {
          code: "USDC",
          contract: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
          decimals: 7,
          domain: "centre.io",
          icon: "",
          issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
          org: "unknown",
          verifiedLists: [],
        },
      ]);
    }

    return Promise.resolve([]);
  });

jest
  .spyOn(ApiInternal, "getTokenDetails")
  .mockImplementation(({ contractId }) => {
    if (
      contractId === "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA"
    ) {
      return Promise.resolve({ name: "USDC", symbol: "USDC", decimals: 7 });
    }
    return Promise.resolve({ name: "foo", symbol: "baz", decimals: 7 });
  });

jest
  .spyOn(SorobanHelpers, "isContractId")
  .mockImplementation(
    (contractId) =>
      contractId === verifiedToken || contractId === unverifiedToken,
  );

jest.mock("stellar-sdk", () => {
  const original = jest.requireActual("stellar-sdk");
  return {
    Asset: original.Asset,
    Operation: original.Operation,
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
    rpc: original.rpc,
    TransactionBuilder: original.TransactionBuilder,
  };
});

jest.spyOn(BlockaidHelpers, "scanAsset").mockImplementation((address) => {
  if (
    address === "BMAL-GBFJZSHWOMYS6U73NXQRRD4JX6TZNWEAFII6Z5INGWVJ2VCQ2K4NQMHP"
  ) {
    return Promise.resolve({
      ...defaultBlockaidScanAssetResult,
      result_type: "Malicious",
      features: [
        {
          description: "bad asset",
          feature_id: "KNOWN_MALICIOUS",
          type: "Malicious",
        },
      ],
    });
  }

  return Promise.resolve({
    ...defaultBlockaidScanAssetResult,
    result_type: "Benign",
    features: [
      {
        description: "good asset",
        feature_id: "METADATA",
        type: "Benign",
      },
    ],
  });
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

const mockNavigateTo = jest.fn();
jest.mock("popup/helpers/navigate", () => {
  return {
    navigateTo: (...args: any) => mockNavigateTo(args),
  };
});

const publicKey = "GCXRLIZUQNZ3YYJDGX6Z445P7FG5WXT7UILBO5CFIYYM7Z7YTIOELC6O";

const initView = async (
  rejectTxn: boolean = false,
  isMainnet: boolean = false,
  balances = manageAssetsMockBalances,
) => {
  const configuredNetworkDetails = isMainnet
    ? MAINNET_NETWORK_DETAILS
    : TESTNET_NETWORK_DETAILS;

  render(
    <Wrapper
      routes={[ROUTES.manageAssets]}
      state={{
        auth: {
          error: null,
          applicationState: ApplicationState.PASSWORD_CREATED,
          publicKey,
          allAccounts: mockAccounts,
          hasPrivateKey: true,
        },
        settings: {
          networkDetails: {
            ...configuredNetworkDetails,
            networkName: rejectTxn ? "Test Net Reject" : "Test Net",
          },
          networksList: DEFAULT_NETWORKS,
          isSorobanPublicEnabled: true,
          isRpcHealthy: true,
          hiddenAssets: {},
          assetsLists: {
            [configuredNetworkDetails.network]: [
              {
                url: "asset_list_url",
                isEnabled: true,
              },
            ],
          },
        },
        transactionSubmission: {
          ...transactionSubmissionInitialState,
          accountBalances: balances,
          assetSelect: {
            type: AssetSelectType.MANAGE,
            isSource: true,
          },
        },
      }}
    >
      <ManageAssets />
    </Wrapper>,
  );

  await waitFor(() => {
    expect(screen.getByTestId("AppHeaderPageTitle")).toBeDefined();
  });
};

describe.skip("Manage assets", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  beforeEach(() => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as any),
    );
  });

  it("renders manage assets view initial state", async () => {
    await initView();

    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Manage assets",
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("ChooseAssetWrapper")).toBeDefined();
    });

    const addedTrustlines = screen.queryAllByTestId("ManageAssetRow");

    expect(addedTrustlines.length).toBe(2);
    expect(
      within(addedTrustlines[0]).getByTestId("ManageAssetCode"),
    ).toHaveTextContent("USDC");
    expect(
      within(addedTrustlines[0]).getByTestId("ManageAssetDomain"),
    ).toHaveTextContent("circle.io");

    expect(
      within(addedTrustlines[1]).getByTestId("ManageAssetCode"),
    ).toHaveTextContent("SRT");
    expect(
      within(addedTrustlines[1]).getByTestId("ManageAssetDomain"),
    ).toHaveTextContent("testanchor.stellar.org");

    expect(screen.getByTestId("ChooseAssetAddAssetButton")).toBeEnabled();
  });

  it("add asset", async () => {
    await initView();

    expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
      "Manage assets",
    );
    await waitFor(() => {
      expect(screen.getByTestId("ChooseAssetWrapper")).toBeDefined();
    });

    const addButton = screen.getByTestId("ChooseAssetAddAssetButton");
    expect(addButton).toBeEnabled();
    await fireEvent.click(addButton);

    await waitFor(() => {
      screen.getByTestId("AppHeaderPageTitle");
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Choose asset",
      );

      const searchInput = screen.getByTestId("search-asset-input");
      fireEvent.change(searchInput, { target: { value: "NEW" } });
      expect(searchInput).toHaveValue("NEW");
    });

    await waitFor(async () => {
      const addedTrustlines = screen.queryAllByTestId("ManageAssetRow");

      expect(addedTrustlines.length).toBe(1);
      expect(
        within(addedTrustlines[0]).getByTestId("ManageAssetCode"),
      ).toHaveTextContent("NEW");
      expect(
        within(addedTrustlines[0]).getByTestId("ManageAssetDomain"),
      ).toHaveTextContent("new.domain.com");

      const addAssetButton = within(addedTrustlines[0]).getByTestId(
        "ManageAssetRowButton",
      );

      expect(addAssetButton).toHaveTextContent("Add");
      expect(addAssetButton).toBeEnabled();
      await fireEvent.click(addAssetButton);
    });

    expect(mockNavigateTo).toHaveBeenCalledWith([
      ROUTES.account,
      expect.any(Function),
    ]);
  });

  it("remove asset", async () => {
    await initView();

    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Manage assets",
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("ChooseAssetWrapper")).toBeDefined();
    });

    const addedTrustlines = screen.queryAllByTestId("ManageAssetRow");
    const ellipsisButton = screen.getByTestId(
      "ManageAssetRowButton__ellipsis-SRT",
    );

    await waitFor(async () => {
      fireEvent.click(ellipsisButton);
      const removeButton = within(addedTrustlines[1]).getByTestId(
        "ManageAssetRowButton",
      );
      expect(removeButton).toHaveTextContent("Remove asset");
      expect(removeButton).toBeEnabled();
      fireEvent.click(removeButton);
    });

    expect(mockNavigateTo).toHaveBeenCalledWith([
      ROUTES.account,
      expect.any(Function),
    ]);
  });

  it("show error view when removing asset with balance", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({
          extras: {
            envelope_xdr:
              "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAPQkAAAYjdAAAA9gAAAAEAAAAAAAAAAAAAAABmXjffAAAAAAAAAAEAAAAAAAAABgAAAAFVU0RDAAAAACYFzNOyHT8GgwiyzcOOhwLtCctwM/RiSnrFp7JOe8xeAAAAAAAAAAAAAAAAAAAAAcskg+QAAABAA/rRMU+KKsxCX1pDBuCvYDz+eQTCsY9bzgPU4J+Xe3vOWUa8YOzWlL3N3zlxHVx9hsB7a8dpSXMSAINjjsY4Dg==",
            result_codes: { operations: ["op_invalid_limit"] },
          },
        }),
      } as any),
    );

    await initView(true);

    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Manage assets",
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("ChooseAssetWrapper")).toBeDefined();
    });

    const addedTrustlines = screen.queryAllByTestId("ManageAssetRow");
    const ellipsisButton = screen.getByTestId(
      "ManageAssetRowButton__ellipsis-SRT",
    );

    await waitFor(async () => {
      fireEvent.click(ellipsisButton);
      const removeButton = within(addedTrustlines[1]).getByTestId(
        "ManageAssetRowButton",
      );
      expect(removeButton).toHaveTextContent("Remove asset");
      expect(removeButton).toBeEnabled();
      fireEvent.click(removeButton);
    });

    await waitFor(() => {
      screen.getByTestId("TrustlineError__error");
      expect(screen.getByTestId("TrustlineError__error")).toHaveTextContent(
        "This asset has a balance",
      );
    });
  });

  it("show error view when removing asset with buying liabilities", async () => {
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        ok: false,
        json: async () => ({
          extras: {
            envelope_xdr:
              "AAAAAgAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAPQkAAAYjdAAAA9gAAAAEAAAAAAAAAAAAAAABmXjffAAAAAAAAAAEAAAAAAAAABgAAAAFVU0RDAAAAACYFzNOyHT8GgwiyzcOOhwLtCctwM/RiSnrFp7JOe8xeAAAAAAAAAAAAAAAAAAAAAcskg+QAAABAA/rRMU+KKsxCX1pDBuCvYDz+eQTCsY9bzgPU4J+Xe3vOWUa8YOzWlL3N3zlxHVx9hsB7a8dpSXMSAINjjsY4Dg==",
            result_codes: { operations: ["op_invalid_limit"] },
          },
        }),
      } as any),
    );

    jest
      .spyOn(ApiInternal, "getAccountIndexerBalances")
      .mockImplementation(() =>
        Promise.resolve({
          balances: {
            "USDC:GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56": {
              token: {
                code: "USDC",
                issuer: {
                  key: "GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56",
                },
              },
              total: new BigNumber("111"),
              available: new BigNumber("111"),
              buyingLiabilities: "1",
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
              total: new BigNumber("0"),
              available: new BigNumber("0"),
            },
          } as any as Balances,
          isFunded: true,
          subentryCount: 1,
        }),
      );

    await initView(true, false, {
      balances: {
        "USDC:GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56": {
          token: {
            code: "USDC",
            issuer: {
              key: "GATALTGTWIOT6BUDBCZM3Q4OQ4BO2COLOAZ7IYSKPLC2PMSOPPGF5V56",
            },
          },
          total: new BigNumber("111"),
          available: new BigNumber("111"),
          buyingLiabilities: "1",
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
          total: new BigNumber("0"),
          available: new BigNumber("0"),
        },
      } as any as Balances,
      isFunded: true,
      subentryCount: 1,
    });

    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Manage assets",
      );
    });
    await waitFor(() => {
      expect(screen.getByTestId("ChooseAssetWrapper")).toBeDefined();
    });

    const addedTrustlines = screen.queryAllByTestId("ManageAssetRow");
    const ellipsisButton = screen.getByTestId(
      "ManageAssetRowButton__ellipsis-SRT",
    );

    await waitFor(async () => {
      fireEvent.click(ellipsisButton);
      const removeButton = within(addedTrustlines[1]).getByTestId(
        "ManageAssetRowButton",
      );
      expect(removeButton).toHaveTextContent("Remove asset");
      expect(removeButton).toBeEnabled();
      fireEvent.click(removeButton);
    });

    await waitFor(() => {
      screen.getByTestId("TrustlineError__error");
      expect(screen.getByTestId("TrustlineError__error")).toHaveTextContent(
        "This asset has buying liabilities",
      );
      expect(screen.getByTestId("TrustlineError__body")).toHaveTextContent(
        "You still have a buying liability of 1",
      );
    });
  });

  it("show warning when adding an asset with warnings", async () => {
    await initView();

    expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
      "Manage assets",
    );
    await waitFor(() => {
      expect(screen.getByTestId("ChooseAssetWrapper")).toBeDefined();
    });

    const addButton = screen.getByTestId("ChooseAssetAddAssetButton");
    expect(addButton).toBeEnabled();
    await fireEvent.click(addButton);

    await waitFor(() => {
      screen.getByTestId("AppHeaderPageTitle");
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Choose asset",
      );

      const searchInput = screen.getByTestId("search-asset-input");
      fireEvent.change(searchInput, { target: { value: "BAD" } });
      expect(searchInput).toHaveValue("BAD");
    });

    await waitFor(async () => {
      const addedTrustlines = screen.queryAllByTestId("ManageAssetRow");

      expect(addedTrustlines.length).toBe(1);
      expect(
        within(addedTrustlines[0]).getByTestId("ManageAssetCode"),
      ).toHaveTextContent("BAD");
      expect(
        within(addedTrustlines[0]).getByTestId("ManageAssetDomain"),
      ).toHaveTextContent("bad.domain.com");

      const addAssetButton = within(addedTrustlines[0]).getByTestId(
        "ManageAssetRowButton",
      );

      expect(addAssetButton).toHaveTextContent("Add");
      expect(addAssetButton).toBeEnabled();
      await fireEvent.click(addAssetButton);
    });

    await waitFor(async () => {
      const warning = screen.getByTestId("NewAssetWarning");
      expect(screen.getByTestId("NewAssetWarningTitle")).toHaveTextContent(
        "Before You Add This Asset",
      );

      const warningAddButton = within(warning).getByTestId(
        "NewAssetWarningAddButton",
      );
      expect(warningAddButton).toBeEnabled();

      await fireEvent.click(warningAddButton);
    });

    expect(mockNavigateTo).toHaveBeenCalledWith([
      ROUTES.account,
      expect.any(Function),
    ]);
  });

  it("show warning when adding an asset with Blockaid warning on Mainnet", async () => {
    await initView(true);

    expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
      "Manage assets",
    );
    await waitFor(() => {
      expect(screen.getByTestId("ChooseAssetWrapper")).toBeDefined();
    });

    const addButton = screen.getByTestId("ChooseAssetAddAssetButton");
    expect(addButton).toBeEnabled();
    await fireEvent.click(addButton);

    await waitFor(() => {
      screen.getByTestId("AppHeaderPageTitle");
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Choose asset",
      );

      const searchInput = screen.getByTestId("search-asset-input");
      fireEvent.change(searchInput, { target: { value: "BMAL" } });
      expect(searchInput).toHaveValue("BMAL");
    });

    await waitFor(async () => {
      const addedTrustlines = screen.queryAllByTestId("ManageAssetRow");

      expect(addedTrustlines.length).toBe(1);
      expect(
        within(addedTrustlines[0]).getByTestId("ManageAssetCode"),
      ).toHaveTextContent("BMAL");
      expect(
        within(addedTrustlines[0]).getByTestId("ManageAssetDomain"),
      ).toHaveTextContent("bmal.domain.com");

      const addAssetButton = within(addedTrustlines[0]).getByTestId(
        "ManageAssetRowButton",
      );

      expect(addAssetButton).toHaveTextContent("Add");
      expect(addAssetButton).toBeEnabled();
      await fireEvent.click(addAssetButton);
    });

    await waitFor(async () => {
      const warning = screen.getByTestId("ScamAssetWarning");
      expect(screen.getByTestId("ScamAssetWarning__box")).toHaveTextContent(
        "This token was flagged as Malicious by Blockaid. Interacting with this token may result in loss of funds and is not recommended for the following reasons:",
      );

      const addAssetButton = within(warning).getByTestId(
        "ScamAsset__add-asset",
      );
      expect(addAssetButton).toBeEnabled();

      await fireEvent.click(addAssetButton);
    });

    expect(mockNavigateTo).toHaveBeenCalledWith([
      ROUTES.account,
      expect.any(Function),
    ]);
  });

  it("add soroban token on asset list", async () => {
    // init Mainnet view
    await initView(false, true);

    expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
      "Manage assets",
    );
    await waitFor(() => {
      expect(screen.getByTestId("ChooseAssetWrapper")).toBeDefined();
    });

    const addTokenButton = screen.getByTestId("ChooseAssetAddAssetButton");
    expect(addTokenButton).toBeEnabled();
    await fireEvent.click(addTokenButton);

    await fireEvent.click(screen.getByTestId("SearchAsset__add-manually"));

    await waitFor(() => {
      screen.getByTestId("AppHeaderPageTitle");
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Add by address",
      );

      const searchInput = screen.getByTestId("search-token-input");
      fireEvent.change(searchInput, { target: { value: verifiedToken } });
      expect(searchInput).toHaveValue(verifiedToken);
    });
    await waitFor(async () => {
      const addedTrustlines = screen.queryAllByTestId("ManageAssetRow");
      const verificationBadge = screen.getByTestId("asset-on-list");

      expect(verificationBadge).toHaveTextContent("On your lists");

      expect(addedTrustlines.length).toBe(1);
      expect(
        within(addedTrustlines[0]).getByTestId("ManageAssetCode"),
      ).toHaveTextContent("USDC");

      const addAssetButton = within(addedTrustlines[0]).getByTestId(
        "ManageAssetRowButton",
      );

      expect(addAssetButton).toHaveTextContent("Add");
      expect(addAssetButton).toBeEnabled();
      await fireEvent.click(addAssetButton);
    });
  });

  it("add soroban token not on asset list", async () => {
    // init Mainnet view
    await initView(false, true);

    const addTokenButton = screen.getByTestId("ChooseAssetAddAssetButton");
    expect(addTokenButton).toBeEnabled();
    await fireEvent.click(addTokenButton);

    await fireEvent.click(screen.getByTestId("SearchAsset__add-manually"));

    await waitFor(() => {
      screen.getByTestId("AppHeaderPageTitle");
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Add by address",
      );

      const searchInput = screen.getByTestId("search-token-input");
      fireEvent.change(searchInput, {
        target: {
          value: unverifiedToken,
        },
      });
      expect(searchInput).toHaveValue(unverifiedToken);
    });
    await waitFor(async () => {
      const addedTrustlines = screen.queryAllByTestId("ManageAssetRow");
      const verificationBadge = screen.getByTestId("not-asset-on-list");

      expect(verificationBadge).toHaveTextContent("Not on your lists");

      expect(addedTrustlines.length).toBe(1);
      expect(
        within(addedTrustlines[0]).getByTestId("ManageAssetCode"),
      ).toHaveTextContent("foo");

      const addAssetButton = within(addedTrustlines[0]).getByTestId(
        "ManageAssetRowButton",
      );

      expect(addAssetButton).toHaveTextContent("Add");
      expect(addAssetButton).toBeEnabled();
      await fireEvent.click(addAssetButton);
    });
  });

  it("hide a token", async () => {
    await initView();

    const navigateToHideBtn = screen.getByTestId("ChooseAssetHideAssetBtn");
    expect(navigateToHideBtn).toBeEnabled();
    await fireEvent.click(navigateToHideBtn);

    await waitFor(() => {
      expect(screen.getByTestId("ToggleAssetContent")).toBeDefined();
    });

    const toggleUsdcRow = screen.getByTestId("Toggle-USDC");
    const childInput = toggleUsdcRow.querySelector("input");
    expect(childInput).toBeEnabled();

    if (!childInput) {
      throw new Error("toggle not found");
    }

    expect(childInput).toBeChecked();
    fireEvent.change(childInput, { target: { checked: false } });
    expect(childInput).not.toBeChecked();
  });
});
