import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as createStellarIdenticon from "helpers/stellarIdenticon";
import {
  Memo,
  MemoType,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "stellar-sdk";

import * as Stellar from "helpers/stellar";
import { getTokenInvocationArgs } from "popup/helpers/soroban";
import * as ApiInternal from "@shared/api/internal";

import { SignTransaction } from "../SignTransaction";
import { Wrapper, mockBalances, mockAccounts } from "../../__testHelpers__";
import { ROUTES } from "popup/constants/routes";
import { Balances } from "@shared/api/types/backend-api";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { DEFAULT_NETWORKS } from "@shared/constants/stellar";
import { SettingsState } from "@shared/api/types";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";

jest.mock("helpers/stellarIdenticon");
jest.setTimeout(20000);

jest
  .spyOn(ApiInternal, "getHiddenAssets")
  .mockImplementation(() => Promise.resolve({ hiddenAssets: {}, error: "" }));

jest
  .spyOn(ApiInternal, "getAccountBalances")
  .mockImplementation(() => Promise.resolve(mockBalances));

jest
  .spyOn(ApiInternal, "getAssetIcons")
  .mockImplementation(() => Promise.resolve({}));

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
  const getMemoMockTransactionInfo = (xdr: string, op: Operation) => ({
    transaction: {
      _networkPassphrase: Networks.FUTURENET,
      _operations: [op],
      _fee: 0.001,
    },
    transactionXdr: xdr,
    accountToSign: "",
    domain: "laboratory.stellar.org",
    flaggedKeys: {},
    isDomainListedAllowed: true,
    isHttpsDomain: true,
  });

  const MEMO_TXN_NO_MEMO =
    "AAAAAgAAAACvFaM0g3O8YSM1/Z5zr/lN215/ohYXdEVGMM/n+JocRQAAAGQADeezAAAAFwAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAABVvU5/EF8mFV8VbCrtaboJUyso8pHnPX6HerHf4QV1EwAAAAAAAAAASVBPgAAAAAAAAAAA";
  const MEMO_TXN_TEXT =
    "AAAAAgAAAACvFaM0g3O8YSM1/Z5zr/lN215/ohYXdEVGMM/n+JocRQAAAGQADeezAAAAFwAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAl0ZXh0IG1lbW8AAAAAAAABAAAAAAAAAAEAAAAAVb1OfxBfJhVfFWwq7Wm6CVMrKPKR5z1+h3qx3+EFdRMAAAAAAAAAAElQT4AAAAAAAAAAAA==";
  const MEMO_TXN_ID =
    "AAAAAgAAAACvFaM0g3O8YSM1/Z5zr/lN215/ohYXdEVGMM/n+JocRQAAAGQADeezAAAAFwAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAgAAAAAAAeJAAAAAAQAAAAAAAAABAAAAAFW9Tn8QXyYVXxVsKu1puglTKyjykec9fod6sd/hBXUTAAAAAAAAAABJUE+AAAAAAAAAAAA=";
  const MEMO_TXN_HASH =
    "AAAAAgAAAACvFaM0g3O8YSM1/Z5zr/lN215/ohYXdEVGMM/n+JocRQAAAGQADeezAAAAFwAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAA+mIabuovOCMELeEBiAhJ/OIjCVFTNN7AmAIYkUnUfUmAAAAAQAAAAAAAAABAAAAAFW9Tn8QXyYVXxVsKu1puglTKyjykec9fod6sd/hBXUTAAAAAAAAAABJUE+AAAAAAAAAAAA=";
  const MEMO_TXN_RETURN =
    "AAAAAgAAAACvFaM0g3O8YSM1/Z5zr/lN215/ohYXdEVGMM/n+JocRQAAAGQADeezAAAAFwAAAAEAAAAAAAAAAAAAAAAAAAAAAAAABOmIabuovOCMELeEBiAhJ/OIjCVFTNN7AmAIYkUnUfUmAAAAAQAAAAAAAAABAAAAAFW9Tn8QXyYVXxVsKu1puglTKyjykec9fod6sd/hBXUTAAAAAAAAAABJUE+AAAAAAAAAAAA=";
  const OP_SOURCE_UNFUNDED =
    "AAAAAgAAAABou5983/G8OINKO6IsleNqE1hDPTsk2zo4fCVVbrQijwAAAAAAAAAAAAAAAAAAAAEAAAAAZu7vZQAAAABm7vG9AAAAAAAAAAEAAAABAAAAAGKCByA2uogbMQkINY5i9z3Bde53tuyoUGtHLfUDS2ZeAAAACgAAABFzdGcudm9sYWcuaW8gYXV0aAAAAAAAAAEAAABAMTUzNjM0Yjc5NDk1MzJiMzY3MjY5OTk0Yzc5MjQwNGI2ZjViMTQzNGVlZDNlNjNhNTYzZDg2YjRhMzc3ZTI2OAAAAAAAAAABbrQijwAAAEDO2lAZ9aXC8ZR76DAJBve1RKmAfVoP3ulL0T3ezzC7M7mpxwZVSFmN9PEL2s596Q1DDbyGAi2WryvYMcA0AvsM";

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

  it("renders", async () => {
    const transaction = TransactionBuilder.fromXDR(
      transactions.sorobanTransfer,
      Networks.FUTURENET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.sorobanTransfer,
      transaction: {
        ...mockTransactionInfo.transaction,
        _networkPassphrase: Networks.FUTURENET,
        _operations: [op],
      },
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
            hiddenAssets: {},
          },
        }}
      >
        <SignTransaction />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("SignTransaction"));
    expect(screen.getByTestId("SignTransaction")).toBeDefined();
  });

  it("shows non-https domain error on Mainnet", async () => {
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

  it("displays token payment parameters for Soroban token payment operations", async () => {
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
      transactions.sorobanTransfer,
      Networks.FUTURENET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.sorobanTransfer,
      transaction: {
        ...mockTransactionInfo.transaction,
        _networkPassphrase: Networks.FUTURENET,
        _operations: [op],
      },
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

    await waitFor(async () => {
      expect(screen.getByTestId("Tab-Details")).toBeInTheDocument();
      await userEvent.click(screen.getByTestId("Tab-Details"));
    });

    const args = getTokenInvocationArgs(op);
    const opDetails = screen
      .getAllByTestId("OperationKeyVal")
      .map((node) => node.textContent);

    expect(
      opDetails.includes(
        `Parameters${args?.from.toString()}Copied${args?.to.toString()}Copied${args?.amount.toString()}`,
      ),
    ).toBeTruthy();
    expect(
      opDetails.includes(
        `Contract ID${Stellar.truncatedPublicKey(
          args?.contractId || "",
          6,
        )}Copied`,
      ),
    ).toBeTruthy();
    expect(opDetails.includes(`Function Name${args?.fnName}`)).toBeTruthy();
    expect(args?.amount === BigInt(5)).toBeTruthy();
  });

  it("displays mint parameters for Soroban mint operations", async () => {
    const transaction = TransactionBuilder.fromXDR(
      transactions.sorobanMint,
      Networks.FUTURENET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.sorobanMint,
      transaction: {
        ...mockTransactionInfo.transaction,
        _networkPassphrase: Networks.FUTURENET,
        _operations: [op],
      },
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

    await waitFor(async () => {
      expect(screen.getByTestId("Tab-Details")).toBeInTheDocument();
      await userEvent.click(screen.getByTestId("Tab-Details"));
    });

    const args = getTokenInvocationArgs(op);
    const opDetails = screen
      .getAllByTestId("OperationKeyVal")
      .map((node) => node.textContent);

    expect(
      opDetails.includes(
        `Parameters${args?.to.toString()}Copied${args?.amount.toString()}`,
      ),
    ).toBeTruthy();
    expect(
      opDetails.includes(
        `Contract ID${Stellar.truncatedPublicKey(
          args?.contractId || "",
          6,
        )}Copied`,
      ),
    ).toBeTruthy();
    expect(opDetails.includes(`Function Name${args?.fnName}`)).toBeTruthy();
    expect(args?.amount === BigInt(5)).toBeTruthy();
  });

  it("memo: doesn't render memo if there is no memo", async () => {
    const transaction = TransactionBuilder.fromXDR(
      MEMO_TXN_NO_MEMO,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      ...getMemoMockTransactionInfo(MEMO_TXN_NO_MEMO, op),
    }));

    render(
      <Wrapper routes={[ROUTES.signTransaction]} state={{}}>
        <SignTransaction />
      </Wrapper>,
    );

    expect(screen.queryByTestId("MemoBlock")).toBeNull();
  });

  it("memo: render memo text", async () => {
    const transaction = TransactionBuilder.fromXDR(
      MEMO_TXN_TEXT,
      Networks.FUTURENET,
    ) as Transaction<Memo<MemoType>, Operation[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      ...getMemoMockTransactionInfo(MEMO_TXN_TEXT, op),
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

    await waitFor(() => screen.getByTestId("SignTransaction"));
    expect(screen.getByTestId("MemoBlock")).toHaveTextContent(
      "text memo (MEMO_TEXT)",
    );
  });

  it("memo: render memo id", async () => {
    const transaction = TransactionBuilder.fromXDR(
      MEMO_TXN_ID,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      ...getMemoMockTransactionInfo(MEMO_TXN_ID, op),
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
    await waitFor(() => screen.getByTestId("SignTransaction"));
    expect(screen.getByTestId("MemoBlock")).toHaveTextContent(
      "123456 (MEMO_ID)",
    );
  });

  it("memo: render memo hash", async () => {
    const transaction = TransactionBuilder.fromXDR(
      MEMO_TXN_HASH,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      ...getMemoMockTransactionInfo(MEMO_TXN_HASH, op),
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

    await waitFor(() => screen.getByTestId("SignTransaction"));
    expect(screen.getByTestId("MemoBlock")).toHaveTextContent(
      "e98869bba8bce08c10b78406202127f3888c25454cd37b02600862452751f526 (MEMO_HASH)",
    );
  });

  it("memo: render memo return", async () => {
    const transaction = TransactionBuilder.fromXDR(
      MEMO_TXN_RETURN,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      ...getMemoMockTransactionInfo(MEMO_TXN_RETURN, op),
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

    await waitFor(() => screen.getByTestId("SignTransaction"));
    expect(screen.getByTestId("MemoBlock")).toHaveTextContent(
      "e98869bba8bce08c10b78406202127f3888c25454cd37b02600862452751f526 (MEMO_RETURN)",
    );
  });

  it("shows unfunded warning when signer has no XLM", async () => {
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
        networkDetails: {
          ...defaultSettingsState.networkDetails,
          networkPassphrase: "Test SDF Future Network ; October 2022",
        },
        networksList: DEFAULT_NETWORKS,
        hiddenAssets: {},
        allowList: {
          "Future Net": {
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
        isExperimentalModeEnabled: true,
        isHashSigningEnabled: false,
        isNonSSLEnabled: false,
        experimentalFeaturesState: SettingsState.SUCCESS,
        assetsLists: DEFAULT_ASSETS_LISTS,
      }),
    );
    const mockBalancesEmpty = {
      ...mockBalances,
      balances: {
        "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ":
          mockBalances.balances?.[
            "DT:CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ"
          ],
      } as any as Balances,
    };
    jest
      .spyOn(ApiInternal, "getAccountBalances")
      .mockImplementation(() => Promise.resolve(mockBalancesEmpty));

    const transaction = TransactionBuilder.fromXDR(
      OP_SOURCE_UNFUNDED,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      ...getMemoMockTransactionInfo(OP_SOURCE_UNFUNDED, op),
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
});
