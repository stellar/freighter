import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { mockAccounts, Wrapper } from "popup/__testHelpers__";
import { ROUTES } from "popup/constants/routes";
import {
  DEFAULT_NETWORKS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { SendSettingsSlippage } from "../sendPayment/SendSettings/Slippage";

describe("Slippage component", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("only accepts numbers between 0 and 10", async () => {
    render(
      <Wrapper
        routes={[ROUTES.sendPayment]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey:
              "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
            networksList: DEFAULT_NETWORKS,
          },
          transactionSubmission: {
            transactionData: {
              allowedSlippage: "1",
            },
          },
        }}
      >
        <SendSettingsSlippage previous={ROUTES.account} />
      </Wrapper>
    );

    await waitFor(() => screen.getByTestId("slippage-form"));
    expect(screen.getByTestId("slippage-form")).toBeDefined();

    const customInput = screen.getByTestId("custom-slippage-input");
    fireEvent.change(customInput, { target: { value: "-5" } });
    fireEvent.blur(customInput);
    expect(await screen.findByText("must be at least 0%")).toBeInTheDocument();

    fireEvent.change(customInput, { target: { value: "12" } });
    fireEvent.blur(customInput);
    expect(await screen.findByText("must be below 10%")).toBeInTheDocument();
  });
});
