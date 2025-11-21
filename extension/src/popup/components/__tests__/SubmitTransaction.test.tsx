import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import { SendingTransaction } from "popup/components/InternalTransaction/SubmitTransaction";
import { mockAccounts, Wrapper } from "popup/__testHelpers__";
import { ROUTES } from "popup/constants/routes";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as ApiInternal from "@shared/api/internal";

const mockHasPrivateKeyAccount = {
  name: "Account 1",
  publicKey: "G1",
  applicationState: ApplicationState.PASSWORD_CREATED,
  allAccounts: mockAccounts,
  tokenIdList: [],
  hasPrivateKey: true,
} as any;

jest
  .spyOn(ApiInternal, "loadAccount")
  .mockImplementation(() => Promise.resolve(mockHasPrivateKeyAccount));

jest
  .spyOn(ApiInternal, "signFreighterTransaction")
  .mockImplementation(() =>
    Promise.resolve({ signedTransaction: "signedTransaction" }),
  );
jest
  .spyOn(ApiInternal, "submitFreighterTransaction")
  .mockImplementation(() => Promise.resolve({ successful: true }));

describe("SubmitTransaction", () => {
  it("renders submit transaction", () => {
    render(
      <Wrapper
        routes={[ROUTES.sendPayment]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <SendingTransaction xdr="xdr" goBack={() => {}} />
      </Wrapper>,
    );
  });

  it("sends transaction without asking for password", async () => {
    render(
      <Wrapper
        routes={[ROUTES.sendPayment]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
            hasPrivateKey: true,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <SendingTransaction xdr="xdr" goBack={() => {}} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(
        screen.getByTestId("sending-transaction-footer-subtext"),
      ).toHaveTextContent(
        "You can close this screen, your transaction should be complete in less than a minute.",
      );
      expect(screen.getByText("Close")).toBeInTheDocument();
    });
  });

  it("shows verify account modal and confirms password", async () => {
    render(
      <Wrapper
        routes={[ROUTES.sendPayment]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
            hasPrivateKey: false,
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <SendingTransaction xdr="xdr" goBack={() => {}} />
      </Wrapper>,
    );

    jest
      .spyOn(ApiInternal, "confirmPassword")
      .mockImplementation(() =>
        Promise.resolve({ error: "Incorrect password" } as any),
      );

    await waitFor(() => {
      expect(screen.getByTestId("enter-password")).toBeInTheDocument();
      fireEvent.change(screen.getByTestId("enter-password-input"), {
        target: { value: "not-password" },
      });
      screen.getByTestId("enter-password-submit").click();
      expect(screen.getByTestId("enter-password")).toHaveTextContent(
        "Incorrect Password",
      );
    });

    jest
      .spyOn(ApiInternal, "confirmPassword")
      .mockImplementation(() => Promise.resolve(mockHasPrivateKeyAccount));

    await waitFor(() => {
      expect(screen.getByTestId("enter-password")).toBeInTheDocument();
      fireEvent.change(screen.getByTestId("enter-password-input"), {
        target: { value: "real-password" },
      });
      screen.getByTestId("enter-password-submit").click();
    });
    await waitFor(() => {
      expect(
        screen.getByTestId("sending-transaction-footer-subtext"),
      ).toHaveTextContent(
        "You can close this screen, your transaction should be complete in less than a minute.",
      );
      expect(screen.getByText("Close")).toBeInTheDocument();
    });
  });

  it("asks for password if session has expired mid flow", async () => {
    // when we make a fresh request to load account, we don't have the private key
    jest
      .spyOn(ApiInternal, "loadAccount")
      .mockImplementation(() =>
        Promise.resolve({ ...mockHasPrivateKeyAccount, hasPrivateKey: false }),
      );

    render(
      <Wrapper
        routes={[ROUTES.sendPayment]}
        state={{
          auth: {
            error: null,
            applicationState: ApplicationState.PASSWORD_CREATED,
            publicKey: "G1",
            allAccounts: mockAccounts,
            hasPrivateKey: true, // but redux thinks we have the private key from a previous loadAccount call
          },
          settings: {
            networkDetails: TESTNET_NETWORK_DETAILS,
          },
        }}
      >
        <SendingTransaction xdr="xdr" goBack={() => {}} />
      </Wrapper>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("enter-password")).toBeInTheDocument();
    });
  });
});
