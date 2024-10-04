import React from "react";
import { render, waitFor, screen } from "@testing-library/react";

import { HistoryItem } from "popup/components/accountHistory/HistoryItem";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as sorobanHelpers from "popup/helpers/soroban";
import * as internalApi from "@shared/api/internal";

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
        fnName: "transfer",
        amount: "100000000",
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
    expect(screen.getByTestId("history-item-body-component")).toHaveTextContent(
      "+10 XLM",
    );
  });
});
