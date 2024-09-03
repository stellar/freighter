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
import { Balances } from "@shared/api/types";
import { createMemoryHistory } from "history";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { ROUTES } from "popup/constants/routes";
import * as AssetDomain from "popup/helpers/getAssetDomain";
import * as CheckSuspiciousAsset from "popup/helpers/checkForSuspiciousAsset";
import * as ManageAssetXDR from "popup/helpers/getManageAssetXDR";
import * as SearchAsset from "popup/helpers/searchAsset";
import * as SorobanHelpers from "popup/helpers/soroban";
import * as BlockaidHelpers from "popup/helpers/blockaid";

import {
  AssetSelectType,
  initialState as transactionSubmissionInitialState,
} from "popup/ducks/transactionSubmission";

import { Wrapper, mockAccounts } from "../../__testHelpers__";
import { ManageAssets } from "../ManageAssets";

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
  .spyOn(ApiInternal, "getAccountIndexerBalances")
  .mockImplementation(() => Promise.resolve(manageAssetsMockBalances));

jest
  .spyOn(AssetDomain, "getAssetDomain")
  .mockImplementation((issuerKey: string) => {
    let domain = "";

    switch (issuerKey) {
      case "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM":
        domain = "circle.io";
        break;
      case "GCDNJUBQSX7AJWLJACMJ7I4BC3Z47BQUTMHEICZLE6MU4KQBRYG5JY6B":
        domain = "testanchor.stellar.org";
        break;
      default:
        domain = "malicious.domain";
    }

    return Promise.resolve(domain);
  });

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
  .mockImplementation(() =>
    Promise.resolve({ name: "foo", symbol: "baz", decimals: 7 }),
  );

jest
  .spyOn(SorobanHelpers, "isContractId")
  .mockImplementation(
    (contractId) =>
      contractId === verifiedToken || contractId === unverifiedToken,
  );

const mockHistoryGetter = jest.fn();
jest.mock("popup/constants/history", () => ({
  get history() {
    return mockHistoryGetter();
  },
}));

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
    SorobanRpc: original.SorobanRpc,
    TransactionBuilder: original.TransactionBuilder,
  };
});

jest.spyOn(BlockaidHelpers, "scanAsset").mockImplementation((address) => {
  if (
    address === "BMAL-GBFJZSHWOMYS6U73NXQRRD4JX6TZNWEAFII6Z5INGWVJ2VCQ2K4NQMHP"
  ) {
    return Promise.resolve({
      result_type: "Malicious",
    });
  }

  return Promise.resolve({
    result_type: "Benign",
  });
});

const publicKey = "GCXRLIZUQNZ3YYJDGX6Z445P7FG5WXT7UILBO5CFIYYM7Z7YTIOELC6O";
const history = createMemoryHistory();

const initView = async (
  rejectTxn: boolean = false,
  isMainnet: boolean = false,
  balances = manageAssetsMockBalances,
) => {
  history.push(ROUTES.manageAssets);
  mockHistoryGetter.mockReturnValue(history);
  const configuredNetworkDetails = isMainnet
    ? MAINNET_NETWORK_DETAILS
    : TESTNET_NETWORK_DETAILS;

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
          networkDetails: {
            ...configuredNetworkDetails,
            networkName: rejectTxn ? "Test Net Reject" : "Test Net",
          },
          networksList: DEFAULT_NETWORKS,
          isSorobanPublicEnabled: true,
          isRpcHealthy: true,
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

describe("Manage assets", () => {
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
        "Your assets",
      );
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
      "Your assets",
    );

    const addButton = screen.getByTestId("ChooseAssetAddAssetButton");
    expect(addButton).toBeEnabled();
    await fireEvent.click(addButton);

    await waitFor(() => {
      screen.getByTestId("AppHeaderPageTitle");
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Choose Asset",
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

    const lastRoute = history.entries.pop();
    expect(lastRoute?.pathname).toBe("/account");
  });

  it("remove asset", async () => {
    await initView();

    await waitFor(() => {
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Your assets",
      );
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

    const lastRoute = history.entries.pop();
    expect(lastRoute?.pathname).toBe("/account");
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
        "Your assets",
      );
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
        "Your assets",
      );
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
        "Your assets",
      );
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
      "Your assets",
    );

    const addButton = screen.getByTestId("ChooseAssetAddAssetButton");
    expect(addButton).toBeEnabled();
    await fireEvent.click(addButton);

    await waitFor(() => {
      screen.getByTestId("AppHeaderPageTitle");
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Choose Asset",
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

    const lastRoute = history.entries.pop();
    expect(lastRoute?.pathname).toBe("/account");
  });
  it("show warning when adding an asset with Blockaid warning on Mainnet", async () => {
    await initView(true);

    expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
      "Your assets",
    );

    const addButton = screen.getByTestId("ChooseAssetAddAssetButton");
    expect(addButton).toBeEnabled();
    await fireEvent.click(addButton);

    await waitFor(() => {
      screen.getByTestId("AppHeaderPageTitle");
      expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
        "Choose Asset",
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
        "This token was flagged as malicious by Blockaid. Interacting with this token may result in loss of funds and is not recommended for the following reasons:",
      );

      const addAssetButton = within(warning).getByTestId(
        "ScamAsset__add-asset",
      );
      expect(addAssetButton).toBeEnabled();

      await fireEvent.click(addAssetButton);
    });

    const lastRoute = history.entries.pop();
    expect(lastRoute?.pathname).toBe("/account");
  });
  it("add soroban token on asset list", async () => {
    // init Mainnet view
    await initView(false, true);

    expect(screen.getByTestId("AppHeaderPageTitle")).toHaveTextContent(
      "Your assets",
    );

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
      const verificationBadge = screen.getByTestId("asset-notification");

      expect(verificationBadge).toHaveTextContent(
        "On your listsFreighter uses asset lists to check assets you interact with. You can define your own assets lists in Settings.",
      );

      expect(addedTrustlines.length).toBe(1);
      expect(
        within(addedTrustlines[0]).getByTestId("ManageAssetCode"),
      ).toHaveTextContent("USDC");
      expect(
        within(addedTrustlines[0]).getByTestId("ManageAssetDomain"),
      ).toHaveTextContent("centre.io");

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
      const verificationBadge = screen.getByTestId("asset-notification");

      expect(verificationBadge).toHaveTextContent(
        "Not on your listsFreighter uses asset lists to check assets you interact with. You can define your own assets lists in Settings.",
      );

      expect(addedTrustlines.length).toBe(1);
      expect(
        within(addedTrustlines[0]).getByTestId("ManageAssetCode"),
      ).toHaveTextContent("foo");
      expect(
        within(addedTrustlines[0]).getByTestId("ManageAssetDomain"),
      ).toHaveTextContent("Stellar Network");

      const addAssetButton = within(addedTrustlines[0]).getByTestId(
        "ManageAssetRowButton",
      );

      expect(addAssetButton).toHaveTextContent("Add");
      expect(addAssetButton).toBeEnabled();
      await fireEvent.click(addAssetButton);
    });
  });
});
