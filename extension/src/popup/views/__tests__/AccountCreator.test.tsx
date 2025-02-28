import React from "react";
import { render, waitFor, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  TESTNET_NETWORK_DETAILS,
  DEFAULT_NETWORKS,
} from "@shared/constants/stellar";
import { APPLICATION_STATE as ApplicationState } from "@shared/constants/applicationState";
import { Wrapper, mockAccounts } from "../../__testHelpers__";
import { AccountCreator } from "../AccountCreator";
import * as internalApi from "@shared/api/internal";
import { ROUTES } from "popup/constants/routes";

describe("Account Creator View", () => {
  afterAll(() => {
    jest.clearAllMocks();
  });

  it("renders", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
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
        }}
      >
        <AccountCreator />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("account-creator-view"));
    expect(screen.getByTestId("account-creator-view")).toBeDefined();
  });

  it("rejects mis-matches in passwords", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
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
        }}
      >
        <AccountCreator />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("account-creator-view"));
    const passwordField = screen.getByTestId("account-creator-password-input");
    const confirmPasswordField = screen.getByTestId(
      "account-creator-confirm-password-input",
    );

    await waitFor(async () => {
      fireEvent.change(passwordField, { target: { value: "password" } });
      fireEvent.change(confirmPasswordField, {
        target: { value: "not-password" },
      });
    });

    await waitFor(async () => {
      expect(screen.getByTestId("account-creator-submit")).toBeDisabled();
    });
  });

  it("rejects missing TOS confirmation", async () => {
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
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
        }}
      >
        <AccountCreator />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("account-creator-view"));
    const tosInput = screen.getByTestId("account-creator-termsOfUse-input");

    await waitFor(async () => {
      userEvent.click(tosInput);
    });

    await waitFor(async () => {
      expect(screen.getByTestId("account-creator-submit")).toBeDisabled();
    });
  });

  it("creates account", async () => {
    const mockShowBackup = jest
      .spyOn(internalApi, "createAccount")
      .mockImplementation(() =>
        Promise.resolve({
          publicKey: "",
          allAccounts: [],
          hasPrivateKey: false,
        }),
      );
    render(
      <Wrapper
        routes={[ROUTES.welcome]}
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
        }}
      >
        <AccountCreator />
      </Wrapper>,
    );

    await waitFor(() => screen.getByTestId("account-creator-view"));
    const passwordField = screen.getByTestId("account-creator-password-input");
    const confirmPasswordField = screen.getByTestId(
      "account-creator-confirm-password-input",
    );
    const submitBtn = screen.getByTestId("account-creator-submit");
    const tosInput = screen.getByTestId("account-creator-termsOfUse-input");

    await waitFor(async () => {
      fireEvent.change(passwordField, { target: { value: "Password" } });
      fireEvent.change(confirmPasswordField, {
        target: { value: "Password" },
      });
      userEvent.click(tosInput);
    });

    await waitFor(async () => {
      expect(submitBtn).not.toBeDisabled();
      userEvent.click(submitBtn);
    });

    await waitFor(async () => {
      expect(mockShowBackup).toHaveBeenCalled();
    });
  });
});
