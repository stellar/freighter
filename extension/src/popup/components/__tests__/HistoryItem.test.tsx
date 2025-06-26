import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { HistoryItem } from "popup/components/accountHistory/HistoryItem";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as sorobanHelpers from "popup/helpers/soroban";
import * as internalApi from "@shared/api/internal";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";

describe("HistoryItem", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  jest
    .spyOn(sorobanHelpers, "getAttrsFromSorobanHorizonOp")
    .mockImplementation(() => {
      return {
        to: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        from: "GCGORBD5DB4JDIKVIA536CJE3EWMWZ6KBUBWZWRQM7Y3NHFRCLOKYVAL",
        contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
        fnName: SorobanTokenInterface.transfer,
        amount: 100000000,
      };
    });
  jest.spyOn(internalApi, "getTokenDetails").mockImplementation(() => {
    return Promise.resolve({
      decimals: 7,
      name: "native",
      symbol: "XLM",
    });
  });
  it("renders SAC transfers as payments", async () => {
    const props = {
      accountBalances: {
        balances: {
          native: {
            token: {
              code: "XLM",
            },
            decimals: 7,
          },
        } as any,
        isFunded: true,
        subentryCount: 0,
      },
      operation: {
        account: "GCGORBD5DB4JDIKVIA536CJE3EWMWZ6KBUBWZWRQM7Y3NHFRCLOKYVAL",
        amount: "10",
        asset_code: "XLM",
        created_at: Date.now(),
        id: "op-id",
        to: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        from: "GCGORBD5DB4JDIKVIA536CJE3EWMWZ6KBUBWZWRQM7Y3NHFRCLOKYVAL",
        starting_balance: "10",
        type: "invokeHostFunction",
        type_i: 24,
        transaction_attr: {
          operation_count: 1,
        },
        isCreateExternalAccount: false,
        isPayment: false,
        isSwap: false,
        transaction_successful: true,
      } as any,
      publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
      url: "example.com",
      networkDetails: TESTNET_NETWORK_DETAILS,
      setDetailViewProps: () => null,
      setIsDetailViewShowing: () => null,
    };
    render(<HistoryItem {...props} />);
    await waitFor(() => screen.getByTestId("history-item"));
    expect(screen.getByTestId("history-item")).toBeDefined();
    expect(
      screen.getByTestId("history-item-amount-component"),
    ).toHaveTextContent("+10 XLM");
  });
  it("renders SAC transfer correctly when balance includes LP shares", async () => {
    const props = {
      accountBalances: {
        balances: {
          "a468d41d8e9b8f3c7209651608b74b7db7ac9952dcae0cdf24871d1d9c7b0088:lp":
            {
              liquidityPoolId:
                "a468d41d8e9b8f3c7209651608b74b7db7ac9952dcae0cdf24871d1d9c7b0088",
              total: new BigNumber(10),
              limit: new BigNumber(100),
            },
          native: {
            token: {
              code: "XLM",
            },
            decimals: 7,
          },
        } as any,
        isFunded: true,
        subentryCount: 0,
      },
      operation: {
        account: "GCGORBD5DB4JDIKVIA536CJE3EWMWZ6KBUBWZWRQM7Y3NHFRCLOKYVAL",
        amount: "10",
        asset_code: "XLM",
        created_at: Date.now(),
        id: "op-id",
        to: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        from: "GCGORBD5DB4JDIKVIA536CJE3EWMWZ6KBUBWZWRQM7Y3NHFRCLOKYVAL",
        starting_balance: "10",
        type: "invokeHostFunction",
        type_i: 24,
        transaction_attr: {
          operation_count: 1,
        },
        isCreateExternalAccount: false,
        isPayment: false,
        isSwap: false,
        transaction_successful: true,
      } as any,
      publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
      url: "example.com",
      networkDetails: TESTNET_NETWORK_DETAILS,
      setDetailViewProps: () => null,
      setIsDetailViewShowing: () => null,
    };
    render(<HistoryItem {...props} />);
    await waitFor(() => screen.getByTestId("history-item"));
    expect(screen.getByTestId("history-item")).toBeDefined();
    expect(
      screen.getByTestId("history-item-amount-component"),
    ).toHaveTextContent("+10 XLM");
  });
  it("renders failed transactions with payment details", async () => {
    const props = {
      accountBalances: {
        balances: {
          native: {
            token: {
              code: "XLM",
            },
            decimals: 7,
          },
        } as any,
        isFunded: true,
        subentryCount: 0,
      },
      operation: {
        account: "GCGORBD5DB4JDIKVIA536CJE3EWMWZ6KBUBWZWRQM7Y3NHFRCLOKYVAL",
        amount: "10",
        asset_code: "XLM",
        created_at: Date.now(),
        id: "op-id",
        to: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
        from: "GCGORBD5DB4JDIKVIA536CJE3EWMWZ6KBUBWZWRQM7Y3NHFRCLOKYVAL",
        starting_balance: "10",
        type: "payment",
        type_i: 1,
        transaction_attr: {
          operation_count: 1,
        },
        isCreateExternalAccount: false,
        isPayment: true,
        isSwap: false,
        transaction_successful: false,
      } as any,
      publicKey: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
      url: "example.com",
      networkDetails: TESTNET_NETWORK_DETAILS,
      setDetailViewProps: () => null,
      setIsDetailViewShowing: () => null,
    };
    render(<HistoryItem {...props} />);
    await waitFor(() => screen.getByTestId("history-item"));
    expect(screen.getByTestId("history-item")).toBeDefined();
    expect(screen.getByTestId("history-item-label")).toHaveTextContent(
      "Transaction failed",
    );
  });
});
