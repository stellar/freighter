import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import * as createStellarIdenticon from "helpers/stellarIdenticon";
import { useLocation } from "react-router-dom";
import BigNumber from "bignumber.js";
import {
  Memo,
  MemoType,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "stellar-sdk";

import * as Stellar from "helpers/stellar";
import * as ApiInternal from "@shared/api/internal";
import * as TokenListHelpers from "@shared/api/helpers/token-list";

import { SignTransaction } from "../SignTransaction";
import { Wrapper, mockBalances, mockAccounts } from "../../__testHelpers__";
import { ROUTES } from "popup/constants/routes";
import { Balances } from "@shared/api/types/backend-api";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import {
  DEFAULT_NETWORKS,
  FUTURENET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { SettingsState } from "@shared/api/types";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";
import * as UseIsDomainAllowed from "popup/helpers/useIsDomainListedAllowed";
import * as SignTxDataHooks from "../SignTransaction/hooks/useGetSignTxData";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import * as SigningFlowHooks from "popup/helpers/useSetupSigningFlow";
import { ShowOverlayStatus } from "popup/ducks/transactionSubmission";
import { WalletType } from "@shared/constants/hardwareWallet";
import { sortBalances } from "popup/helpers/account";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";

jest.mock("helpers/stellarIdenticon");
jest.setTimeout(20000);

jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useLocation: jest.fn(),
}));

jest
  .spyOn(ApiInternal, "getHiddenAssets")
  .mockImplementation(() => Promise.resolve({ hiddenAssets: {}, error: "" }));

jest
  .spyOn(ApiInternal, "getAccountBalances")
  .mockImplementation(() => Promise.resolve(mockBalances));

jest
  .spyOn(ApiInternal, "getAssetIcons")
  .mockImplementation(() => Promise.resolve({}));

jest
  .spyOn(TokenListHelpers, "getCombinedAssetListData")
  .mockImplementation(() => Promise.resolve([]));

jest.spyOn(ApiInternal, "loadAccount").mockImplementation(() =>
  Promise.resolve({
    hasPrivateKey: true,
    publicKey: mockAccounts[0].publicKey,
    applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    allAccounts: mockAccounts,
    bipPath: "bip-path",
    tokenIdList: [],
  }),
);

jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
  Promise.resolve({
    networkDetails: FUTURENET_NETWORK_DETAILS,
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

jest
  .spyOn(UseIsDomainAllowed, "useIsDomainListedAllowed")
  .mockImplementation(({}: { domain: string }) => ({
    isDomainListedAllowed: true,
  }));

jest.mock("helpers/metrics", () => ({
  storeAccountMetricsData: jest.fn(),
  registerHandler: jest.fn(),
  storeBalanceMetricData: jest.fn(),
  emitMetric: jest.fn(),
  metricsMiddleware: jest.fn(),
}));

const defaultSettingsState = {
  networkDetails: {
    isTestnet: false,
    network: "",
    networkName: "",
    otherNetworkName: "",
    networkUrl: "",
    networkPassphrase: "foo",
  },
};

const mockTransactionInfo = {
  accountToSign: "",
  transaction: {
    _networkPassphrase: Networks.TESTNET,
    _operations: [
      {
        flags: {
          authorized: true,
          authorizedToMaintainLiabilities: false,
          clawbackEnabled: undefined,
        },
      },
    ],
    _fee: 0.001,
  },
  transactionXdr: "",
  domain: "",
  domainTitle: "",
  isHttpsDomain: true,
  operations: [],
  operationTypes: [],
  isDomainListedAllowed: true,
  flaggedKeys: { test: { tags: [""] } },
};

const transactions = {
  classic:
    "AAAAAgAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAAGQABqQMAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAACCMXQVfkjpO2gAJQzKsUsPfdBCyfrvy7sr8+35cOxOSwAAAAAAmJaAAAAAAAAAAAFw7E5LAAAAQBu4V+/lttEONNM6KFwdSf5TEEogyEBy0jTOHJKuUzKScpLHyvDJGY+xH9Ri4cIuA7AaB8aL+VdlucCfsNYpKAY=",
  sorobanTransfer:
    "AAAAAgAAAACM6IR9GHiRoVVAO78JJNksy2fKDQNs2jBn8bacsRLcrDucaFsAAAWIAAAAMQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABHkEVdJ+UfDnWpBr/qF582IEoDQ0iW0WPzO9CEUdvvh8AAAAIdHJhbnNmZXIAAAADAAAAEgAAAAAAAAAAjOiEfRh4kaFVQDu/CSTZLMtnyg0DbNowZ/G2nLES3KwAAAASAAAAAAAAAADoFl2ACT9HZkbCeuaT9MAIdStpdf58wM3P24nl738AnQAAAAoAAAAAAAAAAAAAAAAAAAAFAAAAAQAAAAAAAAAAAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAIzohH0YeJGhVUA7vwkk2SzLZ8oNA2zaMGfxtpyxEtysAAAAEgAAAAAAAAAA6BZdgAk/R2ZGwnrmk/TACHUraXX+fMDNz9uJ5e9/AJ0AAAAKAAAAAAAAAAAAAAAAAAAABQAAAAAAAAABAAAAAAAAAAIAAAAGAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAAFAAAAAEAAAAHa35L+/RxV6EuJOVk78H5rCN+eubXBWtsKrRxeLnnpRAAAAACAAAABgAAAAEeQRV0n5R8OdakGv+oXnzYgSgNDSJbRY/M70IRR2++HwAAABAAAAABAAAAAgAAAA8AAAAHQmFsYW5jZQAAAAASAAAAAAAAAACM6IR9GHiRoVVAO78JJNksy2fKDQNs2jBn8bacsRLcrAAAAAEAAAAGAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAAEAAAAAEAAAACAAAADwAAAAdCYWxhbmNlAAAAABIAAAAAAAAAAOgWXYAJP0dmRsJ65pP0wAh1K2l1/nzAzc/bieXvfwCdAAAAAQBkcwsAACBwAAABKAAAAAAAAB1kAAAAAA==",
  sorobanMint:
    "AAAAAgAAAACM6IR9GHiRoVVAO78JJNksy2fKDQNs2jBn8bacsRLcrDucQIQAAAWIAAAAMQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAGAAAAAAAAAABHkEVdJ+UfDnWpBr/qF582IEoDQ0iW0WPzO9CEUdvvh8AAAAEbWludAAAAAIAAAASAAAAAAAAAADoFl2ACT9HZkbCeuaT9MAIdStpdf58wM3P24nl738AnQAAAAoAAAAAAAAAAAAAAAAAAAAFAAAAAQAAAAAAAAAAAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAABG1pbnQAAAACAAAAEgAAAAAAAAAA6BZdgAk/R2ZGwnrmk/TACHUraXX+fMDNz9uJ5e9/AJ0AAAAKAAAAAAAAAAAAAAAAAAAABQAAAAAAAAABAAAAAAAAAAIAAAAGAAAAAR5BFXSflHw51qQa/6hefNiBKA0NIltFj8zvQhFHb74fAAAAFAAAAAEAAAAHa35L+/RxV6EuJOVk78H5rCN+eubXBWtsKrRxeLnnpRAAAAABAAAABgAAAAEeQRV0n5R8OdakGv+oXnzYgSgNDSJbRY/M70IRR2++HwAAABAAAAABAAAAAgAAAA8AAAAHQmFsYW5jZQAAAAASAAAAAAAAAADoFl2ACT9HZkbCeuaT9MAIdStpdf58wM3P24nl738AnQAAAAEAYpBIAAAfrAAAAJQAAAAAAAAdYwAAAAA=",
};

describe("SignTransactions", () => {
  beforeEach(() => {
    const mockCanvas = document.createElement("canvas");
    jest.spyOn(createStellarIdenticon, "default").mockReturnValue(mockCanvas);
    jest.spyOn(global, "fetch").mockImplementation(() =>
      Promise.resolve({
        json: async () => ({
          decimals: 7,
        }),
      } as any),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  let currentSignTxDataMock = {
    state: {
      state: RequestState.SUCCESS,
      data: {
        type: AppDataType.RESOLVED,
        scanResult: {
          simualtion: null,
          validation: null,
          request_id: "1",
        },
        icons: {},
        balances: {
          balances: sortBalances(mockBalances.balances),
          isFunded: true,
          subentryCount: 0,
        },
        publicKey: mockAccounts[1].publicKey,
        signFlowState: {
          allAccounts: mockAccounts,
          accountNotFound: false,
          currentAccount: mockAccounts[0],
        },
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        networkDetails: {
          ...defaultSettingsState.networkDetails,
          networkPassphrase: "Test SDF Future Network ; October 2022",
        },
      },
      error: null,
    },
    fetchData: jest.fn(),
  } as ReturnType<typeof SignTxDataHooks.useGetSignTxData>;
  jest.spyOn(SigningFlowHooks, "useSetupSigningFlow").mockReturnValue({
    isConfirming: false,
    isHardwareWallet: false,
    isPasswordRequired: false,
    handleApprove: jest.fn(),
    hwStatus: ShowOverlayStatus.IDLE,
    rejectAndClose: jest.fn(),
    setIsPasswordRequired: jest.fn(),
    verifyPasswordThenSign: jest.fn(),
    hardwareWalletType: WalletType.LEDGER,
  });
  jest
    .spyOn(SignTxDataHooks, "useGetSignTxData")
    .mockReturnValue(currentSignTxDataMock);

  const searchObject = {
    accountToSign: mockAccounts[0].publicKey,
    url: "https://laboratory.stellar.org",
    transaction: {
      _fee: "0.000001",
      _networkPassphrase: Networks.FUTURENET,
    },
    transactionXdr: transactions.sorobanMint,
    flaggedKeys: [],
    tab: { title: "Test Transaction" },
  };

  const jsonString = JSON.stringify(searchObject);
  const base64 = btoa(unescape(encodeURIComponent(jsonString)));
  const encodedSearch = `?${base64}`;

  (useLocation as jest.Mock).mockReturnValue({
    pathname: "/sign-transaction",
    search: encodedSearch,
    hash: "",
    state: null,
    key: "test-key",
  });

  jest
    .spyOn(ApiInternal, "getAccountBalances")
    .mockImplementation(() => Promise.resolve(mockBalances));

  it("renders", async () => {
    render(
      <Wrapper
        routes={[ROUTES.signTransaction]}
        state={{
          auth: {
            allAccounts: mockAccounts,
            publicKey: mockAccounts[0].publicKey,
          },
          settings: {
            isExperimentalModeEnabled: true,
            networkDetails: {
              ...defaultSettingsState.networkDetails,
              networkPassphrase: "Test SDF Future Network ; October 2022",
            },
            hiddenAssets: {},
          },
        }}
      >
        <SignTransaction />
      </Wrapper>,
    );
    await waitFor(() =>
      expect(screen.getByTestId("SignTransaction")).toBeInTheDocument(),
    );
  });

  it("shows non-https domain error on Mainnet", async () => {
    let currentSignTxDataMock = {
      state: {
        state: RequestState.SUCCESS,
        data: {
          type: AppDataType.RESOLVED,
          scanResult: {
            simualtion: null,
            validation: null,
            request_id: "1",
          },
          icons: {},
          balances: {
            balances: sortBalances(mockBalances.balances),
            isFunded: true,
            subentryCount: 0,
          },
          publicKey: mockAccounts[1].publicKey,
          signFlowState: {
            allAccounts: mockAccounts,
            accountNotFound: false,
            currentAccount: mockAccounts[0],
          },
          applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
          networkDetails: {
            ...defaultSettingsState.networkDetails,
            networkPassphrase: "Public Global Stellar Network ; September 2015",
          },
        },
        error: null,
      },
      fetchData: jest.fn(),
    } as ReturnType<typeof SignTxDataHooks.useGetSignTxData>;
    jest
      .spyOn(SignTxDataHooks, "useGetSignTxData")
      .mockReturnValue(currentSignTxDataMock);
    jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
      Promise.resolve({
        networkDetails: {
          ...defaultSettingsState.networkDetails,
          networkPassphrase: "Public Global Stellar Network ; September 2015",
        },
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

    const transaction = TransactionBuilder.fromXDR(
      transactions.classic,
      Networks.PUBLIC,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.classic,
      transaction: {
        ...mockTransactionInfo.transaction,
        _networkPassphrase: Networks.PUBLIC,
        _operations: [op],
      },
      isHttpsDomain: false,
    }));
    render(
      <Wrapper
        routes={[ROUTES.signTransaction]}
        state={{
          auth: {
            allAccounts: mockAccounts,
            publicKey: mockAccounts[0].publicKey,
          },
          settings: {
            isExperimentalModeEnabled: false,
            networkDetails: {
              ...defaultSettingsState.networkDetails,
              networkPassphrase:
                "Public Global Stellar Network ; September 2015",
            },
          },
        }}
      >
        <SignTransaction />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("WarningMessage"));
    expect(screen.queryByTestId("SignTransaction")).toBeNull();
    expect(screen.getByTestId("WarningMessage")).toHaveTextContent(
      "WEBSITE CONNECTION IS NOT SECURE",
    );
  });

  it("does not show non-https domain error on Testnet", async () => {
    let currentSignTxDataMock = {
      state: {
        state: RequestState.SUCCESS,
        data: {
          type: AppDataType.RESOLVED,
          scanResult: {
            simualtion: null,
            validation: null,
            request_id: "1",
          },
          icons: {},
          balances: {
            balances: sortBalances(mockBalances.balances),
            isFunded: true,
            subentryCount: 0,
          },
          publicKey: mockAccounts[1].publicKey,
          signFlowState: {
            allAccounts: mockAccounts,
            accountNotFound: false,
            currentAccount: mockAccounts[0],
          },
          applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
          networkDetails: {
            ...defaultSettingsState.networkDetails,
            networkPassphrase: "Test SDF Network ; September 2015",
          },
        },
        error: null,
      },
      fetchData: jest.fn(),
    } as ReturnType<typeof SignTxDataHooks.useGetSignTxData>;
    jest
      .spyOn(SignTxDataHooks, "useGetSignTxData")
      .mockReturnValue(currentSignTxDataMock);
    jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
      Promise.resolve({
        networkDetails: {
          ...defaultSettingsState.networkDetails,
          networkPassphrase: "Test SDF Network ; September 2015",
          networkName: "Test Net",
        },
        networksList: DEFAULT_NETWORKS,
        hiddenAssets: {},
        allowList: {
          "Test Net": {
            [mockAccounts[0].publicKey]: ["laboratory.stellar.org"],
          },
        },
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
    const transaction = TransactionBuilder.fromXDR(
      transactions.classic,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.classic,
      transaction: {
        ...mockTransactionInfo.transaction,
        _networkPassphrase: Networks.TESTNET,
        _operations: [op],
      },
      isHttpsDomain: false,
      domain: "laboratory.stellar.org",
    }));
    render(
      <Wrapper
        routes={[ROUTES.signTransaction]}
        state={{
          auth: {
            allAccounts: mockAccounts,
            publicKey: mockAccounts[0].publicKey,
          },
          settings: {
            allowList: {
              "Test Net": {
                [mockAccounts[0].publicKey]: ["laboratory.stellar.org"],
              },
            },
            isExperimentalModeEnabled: false,
            networkDetails: {
              ...defaultSettingsState.networkDetails,
              networkPassphrase: "Test SDF Network ; September 2015",
              networkName: "Test Net",
            },
          },
        }}
      >
        <SignTransaction />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("SignTransaction"));
    expect(screen.queryByTestId("WarningMessage")).toBeNull();
  });

  it("shows unfunded warning when signer has no XLM", async () => {
    const mockBalancesEmpty = {
      ...mockBalances,
      balances: {
        native: {
          token: { type: "native", code: "XLM" },
          total: new BigNumber("0"),
          available: new BigNumber("0"),
          blockaidData: defaultBlockaidScanAssetResult,
        },
      } as any as Balances,
    };
    let currentSignTxDataMock = {
      state: {
        state: RequestState.SUCCESS,
        data: {
          type: AppDataType.RESOLVED,
          scanResult: {
            simualtion: null,
            validation: null,
            request_id: "1",
          },
          icons: {},
          balances: {
            balances: sortBalances(mockBalancesEmpty.balances),
            isFunded: true,
            subentryCount: 0,
          },
          publicKey: mockAccounts[1].publicKey,
          signFlowState: {
            allAccounts: mockAccounts,
            accountNotFound: false,
            currentAccount: mockAccounts[0],
          },
          applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
          networkDetails: {
            ...defaultSettingsState.networkDetails,
            networkPassphrase: "Test SDF Future Network ; October 2022",
          },
        },
        error: null,
      },
      fetchData: jest.fn(),
    } as ReturnType<typeof SignTxDataHooks.useGetSignTxData>;
    jest.spyOn(SigningFlowHooks, "useSetupSigningFlow").mockReturnValue({
      isConfirming: false,
      isHardwareWallet: false,
      isPasswordRequired: false,
      handleApprove: jest.fn(),
      hwStatus: ShowOverlayStatus.IDLE,
      rejectAndClose: jest.fn(),
      setIsPasswordRequired: jest.fn(),
      verifyPasswordThenSign: jest.fn(),
      hardwareWalletType: WalletType.LEDGER,
    });
    jest
      .spyOn(SignTxDataHooks, "useGetSignTxData")
      .mockReturnValue(currentSignTxDataMock);
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockBalancesEmpty));

    jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
      Promise.resolve({
        networkDetails: {
          ...defaultSettingsState.networkDetails,
          networkPassphrase: "Test SDF Future Network ; October 2022",
        },
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

    const transaction = TransactionBuilder.fromXDR(
      transactions.classic,
      Networks.PUBLIC,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.classic,
      transaction: {
        ...mockTransactionInfo.transaction,
        _networkPassphrase: Networks.FUTURENET,
        _operations: [op],
      },
      isHttpsDomain: false,
    }));

    render(
      <Wrapper
        routes={[ROUTES.signTransaction]}
        state={{
          auth: {
            allAccounts: mockAccounts,
            publicKey: mockAccounts[0].publicKey,
          },
          settings: {
            isExperimentalModeEnabled: true,
            networkDetails: {
              ...defaultSettingsState.networkDetails,
              networkPassphrase: "Test SDF Future Network ; October 2022",
            },
          },
        }}
      >
        <SignTransaction />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("InsufficientBalanceWarning"));
  });
  it("renders blockaid scan label when tx expected to fail", async () => {
    let currentSignTxDataMock = {
      state: {
        state: RequestState.SUCCESS,
        data: {
          type: AppDataType.RESOLVED,
          scanResult: {
            simulation: {
              status: "Error" as any,
              error: "This transaction is expected to fail" as any,
            },
            validation: null,
            request_id: "1",
          },
          icons: {},
          balances: {
            balances: sortBalances(mockBalances.balances),
            isFunded: true,
            subentryCount: 0,
          },
          publicKey: mockAccounts[1].publicKey,
          signFlowState: {
            allAccounts: mockAccounts,
            accountNotFound: false,
            currentAccount: mockAccounts[0],
          },
          applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
          networkDetails: {
            ...defaultSettingsState.networkDetails,
            networkPassphrase: "Test SDF Network ; September 2015",
          },
        },
        error: null,
      },
      fetchData: jest.fn(),
    } as ReturnType<typeof SignTxDataHooks.useGetSignTxData>;
    jest
      .spyOn(SignTxDataHooks, "useGetSignTxData")
      .mockReturnValue(currentSignTxDataMock);
    jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
      Promise.resolve({
        networkDetails: {
          ...defaultSettingsState.networkDetails,
          networkPassphrase: "Test SDF Network ; September 2015",
          networkName: "Test Net",
        },
        networksList: DEFAULT_NETWORKS,
        hiddenAssets: {},
        allowList: {
          "Test Net": {
            [mockAccounts[0].publicKey]: ["laboratory.stellar.org"],
          },
        },
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
    const transaction = TransactionBuilder.fromXDR(
      transactions.classic,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.classic,
      transaction: {
        ...mockTransactionInfo.transaction,
        _networkPassphrase: Networks.TESTNET,
        _operations: [op],
      },
      isHttpsDomain: false,
      domain: "laboratory.stellar.org",
    }));
    render(
      <Wrapper
        routes={[ROUTES.signTransaction]}
        state={{
          auth: {
            allAccounts: mockAccounts,
            publicKey: mockAccounts[0].publicKey,
          },
          settings: {
            allowList: {
              "Test Net": {
                [mockAccounts[0].publicKey]: ["laboratory.stellar.org"],
              },
            },
            isExperimentalModeEnabled: false,
            networkDetails: {
              ...defaultSettingsState.networkDetails,
              networkPassphrase: "Test SDF Network ; September 2015",
              networkName: "Test Net",
            },
          },
        }}
      >
        <SignTransaction />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("SignTransaction"));
    expect(screen.getByTestId("blockaid-miss-label")).toHaveTextContent(
      "This transaction is expected to fail",
    );
    expect(screen.getByText("Confirm anyway")).toBeDefined();
  });
  it("renders blockaid scan label when tx is malicious", async () => {
    let currentSignTxDataMock = {
      state: {
        state: RequestState.SUCCESS,
        data: {
          type: AppDataType.RESOLVED,
          scanResult: {
            simulation: {} as any,
            validation: {
              result_type: "Malicious",
            } as any,
            request_id: "1",
          },
          icons: {},
          balances: {
            balances: sortBalances(mockBalances.balances),
            isFunded: true,
            subentryCount: 0,
          },
          publicKey: mockAccounts[1].publicKey,
          signFlowState: {
            allAccounts: mockAccounts,
            accountNotFound: false,
            currentAccount: mockAccounts[0],
          },
          applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
          networkDetails: {
            ...defaultSettingsState.networkDetails,
            networkPassphrase: "Test SDF Network ; September 2015",
          },
        },
        error: null,
      },
      fetchData: jest.fn(),
    } as ReturnType<typeof SignTxDataHooks.useGetSignTxData>;
    jest
      .spyOn(SignTxDataHooks, "useGetSignTxData")
      .mockReturnValue(currentSignTxDataMock);
    jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
      Promise.resolve({
        networkDetails: {
          ...defaultSettingsState.networkDetails,
          networkPassphrase: "Test SDF Network ; September 2015",
          networkName: "Test Net",
        },
        networksList: DEFAULT_NETWORKS,
        hiddenAssets: {},
        allowList: {
          "Test Net": {
            [mockAccounts[0].publicKey]: ["laboratory.stellar.org"],
          },
        },
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
    const transaction = TransactionBuilder.fromXDR(
      transactions.classic,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.classic,
      transaction: {
        ...mockTransactionInfo.transaction,
        _networkPassphrase: Networks.TESTNET,
        _operations: [op],
      },
      isHttpsDomain: false,
      domain: "laboratory.stellar.org",
    }));
    render(
      <Wrapper
        routes={[ROUTES.signTransaction]}
        state={{
          auth: {
            allAccounts: mockAccounts,
            publicKey: mockAccounts[0].publicKey,
          },
          settings: {
            allowList: {
              "Test Net": {
                [mockAccounts[0].publicKey]: ["laboratory.stellar.org"],
              },
            },
            isExperimentalModeEnabled: false,
            networkDetails: {
              ...defaultSettingsState.networkDetails,
              networkPassphrase: "Test SDF Network ; September 2015",
              networkName: "Test Net",
            },
          },
        }}
      >
        <SignTransaction />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("SignTransaction"));
    expect(screen.getByTestId("blockaid-malicious-label")).toHaveTextContent(
      "This transaction was flagged as malicious",
    );
    expect(screen.getByText("Confirm anyway")).toBeDefined();
  });
  it("renders blockaid scan label when tx is flagged as warning", async () => {
    let currentSignTxDataMock = {
      state: {
        state: RequestState.SUCCESS,
        data: {
          type: AppDataType.RESOLVED,
          scanResult: {
            simulation: {} as any,
            validation: {
              result_type: "Warning",
            } as any,
            request_id: "1",
          },
          icons: {},
          balances: {
            balances: sortBalances(mockBalances.balances),
            isFunded: true,
            subentryCount: 0,
          },
          publicKey: mockAccounts[1].publicKey,
          signFlowState: {
            allAccounts: mockAccounts,
            accountNotFound: false,
            currentAccount: mockAccounts[0],
          },
          applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
          networkDetails: {
            ...defaultSettingsState.networkDetails,
            networkPassphrase: "Test SDF Network ; September 2015",
          },
        },
        error: null,
      },
      fetchData: jest.fn(),
    } as ReturnType<typeof SignTxDataHooks.useGetSignTxData>;
    jest
      .spyOn(SignTxDataHooks, "useGetSignTxData")
      .mockReturnValue(currentSignTxDataMock);
    jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
      Promise.resolve({
        networkDetails: {
          ...defaultSettingsState.networkDetails,
          networkPassphrase: "Test SDF Network ; September 2015",
          networkName: "Test Net",
        },
        networksList: DEFAULT_NETWORKS,
        hiddenAssets: {},
        allowList: {
          "Test Net": {
            [mockAccounts[0].publicKey]: ["laboratory.stellar.org"],
          },
        },
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
    const transaction = TransactionBuilder.fromXDR(
      transactions.classic,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.classic,
      transaction: {
        ...mockTransactionInfo.transaction,
        _networkPassphrase: Networks.TESTNET,
        _operations: [op],
      },
      isHttpsDomain: false,
      domain: "laboratory.stellar.org",
    }));
    render(
      <Wrapper
        routes={[ROUTES.signTransaction]}
        state={{
          auth: {
            allAccounts: mockAccounts,
            publicKey: mockAccounts[0].publicKey,
          },
          settings: {
            allowList: {
              "Test Net": {
                [mockAccounts[0].publicKey]: ["laboratory.stellar.org"],
              },
            },
            isExperimentalModeEnabled: false,
            networkDetails: {
              ...defaultSettingsState.networkDetails,
              networkPassphrase: "Test SDF Network ; September 2015",
              networkName: "Test Net",
            },
          },
        }}
      >
        <SignTransaction />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("SignTransaction"));
    expect(screen.getByTestId("blockaid-miss-label")).toHaveTextContent(
      "This transaction was flagged as suspicious",
    );
    expect(screen.getByText("Confirm anyway")).toBeDefined();
  });
  it("renders when blockaid scan fails", async () => {
    let currentSignTxDataMock = {
      state: {
        state: RequestState.SUCCESS,
        data: {
          type: AppDataType.RESOLVED,
          scanResult: null,
          icons: {},
          balances: {
            balances: sortBalances(mockBalances.balances),
            isFunded: true,
            subentryCount: 0,
          },
          publicKey: mockAccounts[1].publicKey,
          signFlowState: {
            allAccounts: mockAccounts,
            accountNotFound: false,
            currentAccount: mockAccounts[0],
          },
          applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
          networkDetails: {
            ...defaultSettingsState.networkDetails,
            networkPassphrase: "Test SDF Network ; September 2015",
          },
        },
        error: null,
      },
      fetchData: jest.fn(),
    } as ReturnType<typeof SignTxDataHooks.useGetSignTxData>;
    jest
      .spyOn(SignTxDataHooks, "useGetSignTxData")
      .mockReturnValue(currentSignTxDataMock);
    jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
      Promise.resolve({
        networkDetails: {
          ...defaultSettingsState.networkDetails,
          networkPassphrase: "Test SDF Network ; September 2015",
          networkName: "Test Net",
        },
        networksList: DEFAULT_NETWORKS,
        hiddenAssets: {},
        allowList: {
          "Test Net": {
            [mockAccounts[0].publicKey]: ["laboratory.stellar.org"],
          },
        },
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
    const transaction = TransactionBuilder.fromXDR(
      transactions.classic,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.classic,
      transaction: {
        ...mockTransactionInfo.transaction,
        _networkPassphrase: Networks.TESTNET,
        _operations: [op],
      },
      isHttpsDomain: false,
      domain: "laboratory.stellar.org",
    }));
    render(
      <Wrapper
        routes={[ROUTES.signTransaction]}
        state={{
          auth: {
            allAccounts: mockAccounts,
            publicKey: mockAccounts[0].publicKey,
          },
          settings: {
            allowList: {
              "Test Net": {
                [mockAccounts[0].publicKey]: ["laboratory.stellar.org"],
              },
            },
            isExperimentalModeEnabled: false,
            networkDetails: {
              ...defaultSettingsState.networkDetails,
              networkPassphrase: "Test SDF Network ; September 2015",
              networkName: "Test Net",
            },
          },
        }}
      >
        <SignTransaction />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("SignTransaction"));
    expect(screen.queryByTestId("blockaid-miss-label")).toBeNull();
    expect(screen.queryByTestId("blockaid-malicious-label")).toBeNull();
  });

  it("renders sign transaction view without insufficient balance warning when balances are unavailable", async () => {
    let currentSignTxDataMock = {
      state: {
        state: RequestState.SUCCESS,
        data: {
          type: AppDataType.RESOLVED,
          scanResult: {
            simulation: null,
            validation: null,
            request_id: "1",
          },
          icons: {},
          balances: undefined, // Balances unavailable due to fetch failure
          publicKey: mockAccounts[1].publicKey,
          signFlowState: {
            allAccounts: mockAccounts,
            accountNotFound: false,
            currentAccount: mockAccounts[0],
          },
          applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
          networkDetails: {
            ...defaultSettingsState.networkDetails,
            networkPassphrase: "Test SDF Future Network ; October 2022",
          },
        },
        error: null,
      },
      fetchData: jest.fn(),
    } as ReturnType<typeof SignTxDataHooks.useGetSignTxData>;
    jest.spyOn(SigningFlowHooks, "useSetupSigningFlow").mockReturnValue({
      isConfirming: false,
      isHardwareWallet: false,
      isPasswordRequired: false,
      handleApprove: jest.fn(),
      hwStatus: ShowOverlayStatus.IDLE,
      rejectAndClose: jest.fn(),
      setIsPasswordRequired: jest.fn(),
      verifyPasswordThenSign: jest.fn(),
      hardwareWalletType: WalletType.LEDGER,
    });
    jest
      .spyOn(SignTxDataHooks, "useGetSignTxData")
      .mockReturnValue(currentSignTxDataMock);

    jest.spyOn(ApiInternal, "loadSettings").mockImplementation(() =>
      Promise.resolve({
        networkDetails: {
          ...defaultSettingsState.networkDetails,
          networkPassphrase: "Test SDF Future Network ; October 2022",
        },
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

    const transaction = TransactionBuilder.fromXDR(
      transactions.classic,
      Networks.PUBLIC,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.classic,
      transaction: {
        ...mockTransactionInfo.transaction,
        _networkPassphrase: Networks.FUTURENET,
        _operations: [op],
      },
      isHttpsDomain: false,
    }));

    render(
      <Wrapper
        routes={[ROUTES.signTransaction]}
        state={{
          auth: {
            allAccounts: mockAccounts,
            publicKey: mockAccounts[0].publicKey,
          },
          settings: {
            isExperimentalModeEnabled: true,
            networkDetails: {
              ...defaultSettingsState.networkDetails,
              networkPassphrase: "Test SDF Future Network ; October 2022",
            },
          },
        }}
      >
        <SignTransaction />
      </Wrapper>,
    );

    // Should render the sign transaction view without crashing
    await waitFor(() => screen.getByTestId("SignTransaction"));
    // Should NOT show the insufficient balance warning when balances are unavailable
    expect(screen.queryByTestId("InsufficientBalanceWarning")).toBeNull();
  });
});
