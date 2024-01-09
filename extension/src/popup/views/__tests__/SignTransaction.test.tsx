import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import * as createStellarIdenticon from "stellar-identicon-js";
import {
  Memo,
  MemoType,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
} from "stellar-sdk";
// import { act } from "react-dom/test-utils";

import * as Stellar from "helpers/stellar";
import { getAttrsFromSorobanTxOp } from "popup/helpers/soroban";

import { SignTransaction } from "../SignTransaction";
import { Wrapper } from "../../__testHelpers__";

jest.mock("stellar-identicon-js");

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
    networkPassphrase: "foo",
    _operations: [
      {
        flags: {
          authorized: true,
          authorizedToMaintainLiabilities: false,
          clawbackEnabled: undefined,
        },
      },
    ],
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

describe.skip("SignTransactions", () => {
  const getMemoMockTransactionInfo = (xdr: string, op: Operation) => ({
    transaction: {
      networkPassphrase: Networks.TESTNET,
      _operations: [op],
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

  beforeEach(() => {
    const mockCanvas = document.createElement("canvas");
    jest.spyOn(createStellarIdenticon, "default").mockReturnValue(mockCanvas);
    // jest.spyOn(global, "fetch").mockImplementation(await act(
    //   async () => {
    //     return {
    //       json: async () => ({
    //         decimals: 7,
    //       })
    //     } as any
    //   }
    // ));
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
        networkPassphrase: Networks.FUTURENET,
        _operations: [op],
      },
    }));

    render(
      <Wrapper
        state={{
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
    expect(screen.getByTestId("SignTransaction")).toBeDefined();
  });

  it("shows non-https domain error", async () => {
    const transaction = TransactionBuilder.fromXDR(
      transactions.classic,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.classic,
      transaction: {
        networkPassphrase: Networks.TESTNET,
        _operations: [op],
      },
      isHttpsDomain: false,
    }));
    render(
      <Wrapper
        state={{
          settings: {
            isExperimentalModeEnabled: false,
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
    await waitFor(() => screen.getByTestId("WarningMessage"));
    expect(screen.queryByTestId("SignTransaction")).toBeNull();
    expect(screen.getByTestId("WarningMessage")).toHaveTextContent(
      "WEBSITE CONNECTION IS NOT SECURE",
    );
  });

  it("displays token payment parameters for Soroban token payment operations", async () => {
    const transaction = TransactionBuilder.fromXDR(
      transactions.sorobanTransfer,
      Networks.FUTURENET,
    ) as Transaction<Memo<MemoType>, Operation.InvokeHostFunction[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      transactionXdr: transactions.sorobanTransfer,
      transaction: {
        networkPassphrase: Networks.FUTURENET,
        _operations: [op],
      },
    }));

    render(
      <Wrapper
        state={{
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

    const args = getAttrsFromSorobanTxOp(op);
    const opDetails = screen
      .getAllByTestId("OperationKeyVal")
      .map((node) => node.textContent);

    expect(opDetails.includes(`Amount:${args?.amount.toString()}`));
    expect(
      opDetails.includes(
        `Contract ID:${Stellar.truncatedPublicKey(args?.contractId!)}`,
      ),
    );
    expect(
      opDetails.includes(
        `Destination:${Stellar.truncatedPublicKey(args?.to!)}`,
      ),
    );
    expect(
      opDetails.includes(`Source:${Stellar.truncatedPublicKey(args?.from!)}`),
    );
    expect(opDetails.includes(`Function Name:${args?.fnName}`));
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
        networkPassphrase: Networks.FUTURENET,
        _operations: [op],
      },
    }));

    render(
      <Wrapper
        state={{
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

    const args = getAttrsFromSorobanTxOp(op);
    const opDetails = screen
      .getAllByTestId("OperationKeyVal")
      .map((node) => node.textContent);

    expect(opDetails.includes(`Amount:${args?.amount.toString()}`));
    expect(
      opDetails.includes(
        `Contract ID:${Stellar.truncatedPublicKey(args?.contractId!)}`,
      ),
    );
    expect(
      opDetails.includes(
        `Destination:${Stellar.truncatedPublicKey(args?.to!)}`,
      ),
    );
    expect(
      opDetails.includes(`Source:${Stellar.truncatedPublicKey(args?.from!)}`),
    );
    expect(opDetails.includes(`Function Name:${args?.fnName}`));
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
      <Wrapper state={{}}>
        <SignTransaction />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("TransactionInfoWrapper"));
    expect(screen.queryByTestId("SignTransactionMemo")).toBeNull();
  });

  it("memo: render memo text", async () => {
    const transaction = TransactionBuilder.fromXDR(
      MEMO_TXN_TEXT,
      Networks.TESTNET,
    ) as Transaction<Memo<MemoType>, Operation[]>;
    const op = transaction.operations[0];
    jest.spyOn(Stellar, "getTransactionInfo").mockImplementation(() => ({
      ...mockTransactionInfo,
      ...getMemoMockTransactionInfo(MEMO_TXN_TEXT, op),
    }));

    render(
      <Wrapper state={{}}>
        <SignTransaction />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("TransactionInfoWrapper"));
    expect(screen.getByTestId("SignTransactionMemo")).toHaveTextContent(
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
      <Wrapper state={{}}>
        <SignTransaction />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("TransactionInfoWrapper"));
    expect(screen.getByTestId("SignTransactionMemo")).toHaveTextContent(
      "123456 (MEMO_ID)",
    );
  });

  xit("memo: render memo hash", async () => {
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
      <Wrapper state={{}}>
        <SignTransaction />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("TransactionInfoWrapper"));
    expect(screen.getByTestId("SignTransactionMemo")).toHaveTextContent(
      "e98869bba8bce08c10b78406202127f3888c25454cd37b02600862452751f526 (MEMO_HASH)",
    );
  });

  xit("memo: render memo return", async () => {
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
      <Wrapper state={{}}>
        <SignTransaction />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("TransactionInfoWrapper"));
    expect(screen.getByTestId("SignTransactionMemo")).toHaveTextContent(
      "e98869bba8bce08c10b78406202127f3888c25454cd37b02600862452751f526 (MEMO_RETURN)",
    );
  });
});
