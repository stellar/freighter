import React from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { ROUTES } from "popup/constants/routes";

import { RevealSecretKey } from "../RevealSecretKey";
import { EditAccount } from "../EditAccount";
import { TEST_PUBLIC_KEY, Wrapper } from "../../__testHelpers__";

const SECRET = "SBXKUDBDMEJ3BH5OLVRTBKOHU4F4XQRZF7T4TXIIELRXNCEHFLSAZ3XN";
const OTHER_PUBLIC_KEY =
  "GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57";

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

jest.mock("helpers/metrics", () => ({
  emitScreenViewed: jest.fn(),
  emitMetric: jest.fn(),
}));

const LocationProbe = () => {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{`${pathname}${search}`}</div>;
};

const authState = (hardwareWalletType = WalletType.NONE) => ({
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
      {
        publicKey: OTHER_PUBLIC_KEY,
        name: "Account 2",
        imported: true,
        hardwareWalletType: WalletType.NONE,
      },
    ],
  },
  settings: { networkDetails: TESTNET_NETWORK_DETAILS },
});

const renderReveal = (search = "") =>
  render(
    <Wrapper routes={[`${ROUTES.revealSecretKey}${search}`]}>
      <RevealSecretKey />
    </Wrapper>,
  );

const acknowledgeAndContinue = () => {
  const reveal = screen.getByRole("button", { name: "Reveal secret key" });
  expect(reveal).toBeDisabled();
  fireEvent.click(screen.getByTestId("reveal-secret-key-acknowledge"));
  expect(reveal).not.toBeDisabled();
  fireEvent.click(reveal);
};

const submitPassword = async (password: string) => {
  fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
    target: { value: password },
  });
  const reveal = screen.getByRole("button", { name: "Reveal secret key" });
  await waitFor(() => expect(reveal).not.toBeDisabled());
  fireEvent.click(reveal);
};

describe("RevealSecretKey", () => {
  beforeEach(() => {
    mockRevealSecretKey.mockReset();
  });

  it("asks for consent, then the password, then shows the key", async () => {
    mockRevealSecretKey.mockResolvedValue({ secretKey: SECRET, error: "" });
    renderReveal(`?publicKey=${OTHER_PUBLIC_KEY}`);

    expect(
      screen.getByText("Your secret key controls this wallet"),
    ).toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Enter your password")).toBeNull();

    acknowledgeAndContinue();
    await submitPassword("hunter22");

    await waitFor(() =>
      expect(screen.getByTestId("reveal-secret-key-value")).toHaveTextContent(
        SECRET,
      ),
    );
    expect(screen.getByText("Tap to copy")).toBeInTheDocument();
    expect(mockRevealSecretKey).toHaveBeenCalledWith({
      activePublicKey: TEST_PUBLIC_KEY,
      publicKey: OTHER_PUBLIC_KEY,
      password: "hunter22",
    });
  });

  it("reveals the active account's key when none is named", async () => {
    mockRevealSecretKey.mockResolvedValue({ secretKey: SECRET, error: "" });
    renderReveal();

    acknowledgeAndContinue();
    await submitPassword("hunter22");

    await waitFor(() =>
      expect(mockRevealSecretKey).toHaveBeenCalledWith(
        expect.objectContaining({ publicKey: TEST_PUBLIC_KEY }),
      ),
    );
  });

  it("shows the error inline and no key when the password is wrong", async () => {
    mockRevealSecretKey.mockResolvedValue({
      secretKey: "",
      error: "Incorrect password",
    });
    renderReveal();

    acknowledgeAndContinue();
    await submitPassword("wrong");

    await waitFor(() =>
      expect(screen.getByText("Incorrect password")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("reveal-secret-key-value")).toBeNull();
  });
});

describe("EditAccount", () => {
  const renderEditAccount = (
    search: string,
    hardwareWalletType = WalletType.NONE,
  ) =>
    render(
      <Wrapper
        routes={[`${ROUTES.editAccount}${search}`]}
        state={authState(hardwareWalletType)}
      >
        <Routes>
          <Route path={ROUTES.editAccount} element={<EditAccount />} />
          <Route path={ROUTES.revealSecretKey} element={<LocationProbe />} />
        </Routes>
      </Wrapper>,
    );

  it("shows the named account and opens its secret key reveal", () => {
    renderEditAccount(`?publicKey=${OTHER_PUBLIC_KEY}`);

    expect(screen.getByTestId("edit-account-name")).toHaveTextContent(
      "Account 2",
    );
    expect(screen.getByTestId("edit-account-explorer")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("edit-account-secret-key"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      `${ROUTES.revealSecretKey}?publicKey=${OTHER_PUBLIC_KEY}`,
    );
  });

  it("offers no secret key for a hardware account", () => {
    renderEditAccount(`?publicKey=${TEST_PUBLIC_KEY}`, WalletType.LEDGER);

    expect(screen.getByTestId("edit-account-name")).toHaveTextContent(
      "Account 1",
    );
    expect(screen.queryByTestId("edit-account-secret-key")).toBeNull();
  });

  it("opens the rename sheet from Account name", () => {
    renderEditAccount(`?publicKey=${OTHER_PUBLIC_KEY}`);

    fireEvent.click(screen.getByTestId("edit-account-name"));

    expect(screen.getByTestId("rename-wallet-input")).toHaveValue("Account 2");
  });
});
