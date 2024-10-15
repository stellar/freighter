import React from "react";
import { render, waitFor, screen } from "@testing-library/react";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import * as ApiInternal from "@shared/api/internal";

import {
  Wrapper,
  mockAccounts,
  mockAccountHistory,
} from "../../__testHelpers__";
import { AccountHistory } from "../AccountHistory";

jest
  .spyOn(ApiInternal, "getAccountHistory")
  .mockImplementation(() => Promise.resolve(mockAccountHistory as any));

describe("AccountHistory", () => {
  it("loads account history view with all transactions", async () => {
    render(
      <Wrapper
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            isHideDustEnabled: false,
          },
        }}
      >
        <AccountHistory />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("AccountHistory"));
    expect(screen.getByTestId("AccountHistory")).toBeDefined();
    const historyNodes = screen.getAllByTestId("history-item");
    expect(historyNodes.length).toEqual(4);
    const historyNodeAmounts = screen.getAllByTestId(
      "history-item-body-component",
    );
    await waitFor(() =>
      expect(historyNodeAmounts[0]).toHaveTextContent("+1 XLM"),
    );
    await waitFor(() =>
      expect(historyNodeAmounts[1]).toHaveTextContent("+0.1 XLM"),
    );
    await waitFor(() =>
      expect(historyNodeAmounts[2]).toHaveTextContent("+0.01 XLM"),
    );
    await waitFor(() =>
      expect(historyNodeAmounts[3]).toHaveTextContent("-0.1 XLM"),
    );
  });
  it("hides dust transactions", async () => {
    render(
      <Wrapper
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
            isHideDustEnabled: true,
          },
        }}
      >
        <AccountHistory />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("AccountHistory"));
    expect(screen.getByTestId("AccountHistory")).toBeDefined();
    const historyNodes = screen.getAllByTestId("history-item");
    expect(historyNodes.length).toEqual(2);
    await waitFor(() => screen.getAllByTestId("history-item"));
    const historyNodeAmounts = screen.getAllByTestId(
      "history-item-body-component",
    );
    await waitFor(() =>
      expect(historyNodeAmounts[0]).toHaveTextContent("+1 XLM"),
    );
    await waitFor(() =>
      expect(historyNodeAmounts[1]).toHaveTextContent("-0.1 XLM"),
    );
  });
});
