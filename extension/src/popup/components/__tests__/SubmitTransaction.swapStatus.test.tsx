import React from "react";
import { render, screen } from "@testing-library/react";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { RequestState } from "constants/request";
import { SendingTransaction } from "popup/components/InternalTransaction/SubmitTransaction";
import { initialState as txInitialState } from "popup/ducks/transactionSubmission";
import { mockAccounts, Wrapper } from "popup/__testHelpers__";

let mockSubmitState: RequestState;

jest.mock(
  "popup/components/InternalTransaction/SubmitTransaction/hooks/useSubmitTxData",
  () => ({
    useSubmitTxData: () => ({
      state: { state: mockSubmitState, data: null, error: null },
      fetchData: jest.fn(),
    }),
  }),
);

jest.mock(
  "popup/components/InternalTransaction/SubmitTransaction/hooks/useGetSubmitAccountData",
  () => ({
    ...jest.requireActual(
      "popup/components/InternalTransaction/SubmitTransaction/hooks/useGetSubmitAccountData",
    ),
    useGetSubmitAccountData: () => ({
      // Literals: a mock factory can't reach imports. RequestState.SUCCESS
      // and AppDataType.RESOLVED.
      state: {
        state: "SUCCESS",
        data: { type: "resolved", hasPrivateKey: true },
        error: null,
      },
      fetchData: jest.fn(),
    }),
  }),
);

const USDC = "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";

const renderSwapStatus = (state: RequestState) => {
  mockSubmitState = state;
  return render(
    <Wrapper
      routes={["/swap"]}
      state={{
        auth: {
          applicationState: ApplicationState.PASSWORD_CREATED,
          publicKey: "G1",
          allAccounts: mockAccounts,
          hasPrivateKey: true,
        },
        settings: { networkDetails: TESTNET_NETWORK_DETAILS },
        transactionSubmission: {
          ...txInitialState,
          transactionData: {
            ...txInitialState.transactionData,
            amount: "100",
            asset: "native",
            destinationAsset: USDC,
            destinationAmount: "149.99",
          },
        },
      }}
    >
      <SendingTransaction xdr="xdr" goBack={jest.fn()} />
    </Wrapper>,
  );
};

// Main Swap and the swap inside Earn both render this screen (Varial
// 1523:157348/157365, 4478:117063/117082).
describe("swap submit screen", () => {
  it("reads Swap in progress, from one token to the other", () => {
    renderSwapStatus(RequestState.LOADING);

    expect(screen.getByText("Swap in progress")).toBeInTheDocument();
    expect(screen.getByTestId("swap-status-caption")).toHaveTextContent(
      "100 XLM to 149.99 USDC",
    );
  });

  it("reads Swap complete, and that one token was swapped for the other", () => {
    renderSwapStatus(RequestState.SUCCESS);

    expect(screen.getByText("Swap complete")).toBeInTheDocument();
    expect(screen.getByTestId("swap-status-caption")).toHaveTextContent(
      "100 XLM was swapped for 149.99 USDC",
    );
  });

  it("puts a single arrow between the tokens", () => {
    const { container } = renderSwapStatus(RequestState.SUCCESS);

    expect(
      container.querySelectorAll(".TransactionStatus__arrow"),
    ).toHaveLength(1);
    expect(
      container.querySelector(".SendingTransaction__Summary__Assets__Divider"),
    ).not.toBeInTheDocument();
  });
});
