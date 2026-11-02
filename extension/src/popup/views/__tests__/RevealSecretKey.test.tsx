import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { WalletType } from "@shared/constants/hardwareWallet";
import { ROUTES } from "popup/constants/routes";

import { RevealSecretKey } from "../RevealSecretKey";
import { Security } from "../Security";
import { TEST_PUBLIC_KEY, Wrapper } from "../../__testHelpers__";

const SECRET = "SBXKUDBDMEJ3BH5OLVRTBKOHU4F4XQRZF7T4TXIIELRXNCEHFLSAZ3XN";

const mockRevealSecretKey = jest.fn();
jest.mock("@shared/api/internal", () => ({
  revealSecretKey: (...args: unknown[]) => mockRevealSecretKey(...args),
}));

jest.mock("helpers/hooks/useGetAppData", () => {
  const actual = jest.requireActual("helpers/hooks/useGetAppData");
  const { RequestState: State } = jest.requireActual("constants/request");
  const { APPLICATION_STATE: AppState } = jest.requireActual(
    "@shared/constants/applicationState",
  );
  const { TEST_PUBLIC_KEY: publicKey } = jest.requireActual(
    "popup/__testHelpers__",
  );
  return {
    ...actual,
    useGetAppData: () => ({
      state: {
        state: State.SUCCESS,
        data: {
          type: actual.AppDataType.RESOLVED,
          account: {
            publicKey,
            applicationState: AppState.MNEMONIC_PHRASE_CONFIRMED,
          },
        },
      },
      fetchData: jest.fn(),
    }),
  };
});

jest.mock("helpers/metrics", () => ({ emitScreenViewed: jest.fn() }));

const submitPassword = async (password: string) => {
  fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
    target: { value: password },
  });
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Show secret key" }),
    ).not.toBeDisabled(),
  );
  fireEvent.click(screen.getByRole("button", { name: "Show secret key" }));
};

describe("RevealSecretKey", () => {
  beforeEach(() => {
    mockRevealSecretKey.mockReset();
  });

  it("shows the key only after the password is accepted", async () => {
    mockRevealSecretKey.mockResolvedValue({ secretKey: SECRET, error: "" });
    render(
      <Wrapper routes={[ROUTES.revealSecretKey]}>
        <RevealSecretKey />
      </Wrapper>,
    );

    expect(screen.queryByTestId("reveal-secret-key-value")).toBeNull();
    await submitPassword("hunter22");

    await waitFor(() =>
      expect(screen.getByTestId("reveal-secret-key-value")).toHaveTextContent(
        SECRET,
      ),
    );
    expect(mockRevealSecretKey).toHaveBeenCalledWith({
      activePublicKey: TEST_PUBLIC_KEY,
      publicKey: TEST_PUBLIC_KEY,
      password: "hunter22",
    });
  });

  it("shows the error inline and no key when the password is wrong", async () => {
    mockRevealSecretKey.mockResolvedValue({
      secretKey: "",
      error: "Incorrect password",
    });
    render(
      <Wrapper routes={[ROUTES.revealSecretKey]}>
        <RevealSecretKey />
      </Wrapper>,
    );

    await submitPassword("wrong");

    await waitFor(() =>
      expect(screen.getByText("Incorrect password")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("reveal-secret-key-value")).toBeNull();
  });
});

describe("Security", () => {
  const renderSecurity = (hardwareWalletType: WalletType) =>
    render(
      <Wrapper
        routes={[ROUTES.security]}
        state={{
          auth: {
            publicKey: TEST_PUBLIC_KEY,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            allAccounts: [
              {
                publicKey: TEST_PUBLIC_KEY,
                name: "Account 1",
                imported: false,
                hardwareWalletType,
              },
            ],
          },
        }}
      >
        <Security />
      </Wrapper>,
    );

  it("offers the secret key for an account that holds one", () => {
    renderSecurity(WalletType.NONE);
    expect(screen.getByText("Show secret key")).toBeInTheDocument();
  });

  it("hides the secret key for a hardware account", () => {
    renderSecurity(WalletType.LEDGER);
    expect(screen.queryByText("Show secret key")).toBeNull();
  });
});
