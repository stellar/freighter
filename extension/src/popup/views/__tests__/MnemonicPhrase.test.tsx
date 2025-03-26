import React from "react";
import {
  render,
  waitFor,
  screen,
  fireEvent,
  act,
} from "@testing-library/react";

import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";

import { ROUTES } from "popup/constants/routes";

import { MnemonicPhrase } from "../MnemonicPhrase";

import { Wrapper } from "../../__testHelpers__";

const MNEMONIC = "dummy mnemonic";

jest.mock("react-router-dom", () => {
  const ReactRouter = jest.requireActual("react-router-dom");
  return {
    ...ReactRouter,
    Redirect: ({ to }: any) => <div>redirect {to}</div>,
  };
});
jest.mock("@shared/api/internal", () => {
  const { APPLICATION_STATE } = jest.requireActual(
    "@shared/constants/applicationState",
  );
  return {
    confirmMnemonicPhrase: () =>
      Promise.resolve({
        isCorrectPhrase: true,
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      }),
  };
});

describe.skip("MnemonicPhrase", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("renders", async () => {
    render(
      <Wrapper
        routes={[ROUTES.mnemonicPhrase]}
        state={{
          auth: {
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey:
              "GA4UFF2WJM7KHHG4R5D5D2MZQ6FWMDOSVITVF7C5OLD5NFP6RBBW2FGV",
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <MnemonicPhrase mnemonicPhrase={MNEMONIC} />
      </Wrapper>,
    );
    await waitFor(() => screen.getByTestId("display-mnemonic-phrase"));
    expect(screen.getByTestId("display-mnemonic-phrase")).toBeDefined();
  });

  describe("basic flow", () => {
    it("works", async () => {
      render(
        <Wrapper
          routes={[ROUTES.mnemonicPhrase]}
          state={{
            auth: {
              error: null,
              applicationState: ApplicationState.PASSWORD_CREATED,
              publicKey:
                "GA4UFF2WJM7KHHG4R5D5D2MZQ6FWMDOSVITVF7C5OLD5NFP6RBBW2FGV",
            },
            settings: {
              networkDetails: TESTNET_NETWORK_DETAILS,
            },
          }}
        >
          <MnemonicPhrase mnemonicPhrase={MNEMONIC} />
        </Wrapper>,
      );

      // Confirm mnemonic
      await act(async () => {
        fireEvent.click(screen.getByTestId("display-mnemonic-phrase-next-btn"));
        await waitFor(() => screen.getByTestId("ConfirmMnemonicPhrase"));
        // Click each word in the mnemonic
        MNEMONIC.split(" ").forEach((word) =>
          fireEvent.click(screen.getByText(word)),
        );
        fireEvent.click(
          screen.getByTestId("display-mnemonic-phrase-confirm-btn"),
        );
      });
    });
  });
});
