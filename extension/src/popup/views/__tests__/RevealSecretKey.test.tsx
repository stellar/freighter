import React from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { WalletType } from "@shared/constants/hardwareWallet";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { ROUTES } from "popup/constants/routes";

import { RevealRecoveryPhrase, RevealSecretKey } from "../RevealSecretKey";
import { EditAccount } from "../EditAccount";
import { TEST_PUBLIC_KEY, Wrapper } from "../../__testHelpers__";

const SECRET = "SBXKUDBDMEJ3BH5OLVRTBKOHU4F4XQRZF7T4TXIIELRXNCEHFLSAZ3XN";
const OTHER_PUBLIC_KEY =
  "GDVEU3DD4KOFECV66VIHWEZOYX4ZKR3WV27L464SIIPOU2IUI3JCZA57";

const PHRASE =
  "gloom student label strategy tattoo promote brand mushroom problem divert carbon erode";

const mockRevealSecretKey = jest.fn();
const mockShowBackupPhrase = jest.fn();
jest.mock("@shared/api/internal", () => ({
  revealSecretKey: (...args: unknown[]) => mockRevealSecretKey(...args),
  showBackupPhrase: (...args: unknown[]) => mockShowBackupPhrase(...args),
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

const acknowledgeAndContinue = (
  action = "Reveal secret key",
  testId = "reveal-secret-key",
) => {
  const reveal = screen.getByRole("button", { name: action });
  expect(reveal).toBeDisabled();
  fireEvent.click(screen.getByTestId(`${testId}-acknowledge`));
  expect(reveal).not.toBeDisabled();
  fireEvent.click(reveal);
};

const submitPassword = async (
  password: string,
  action = "Reveal secret key",
) => {
  fireEvent.change(screen.getByPlaceholderText("Enter your password"), {
    target: { value: password },
  });
  const reveal = screen.getByRole("button", { name: action });
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

describe("RevealRecoveryPhrase", () => {
  beforeEach(() => {
    mockShowBackupPhrase.mockReset();
  });

  it("asks for consent, then the password, then shows the numbered words", async () => {
    mockShowBackupPhrase.mockResolvedValue({
      mnemonicPhrase: PHRASE,
      error: "",
    });
    render(
      <Wrapper routes={[ROUTES.revealRecoveryPhrase]}>
        <RevealRecoveryPhrase />
      </Wrapper>,
    );

    expect(
      screen.getByText("Your recovery phrase controls this wallet"),
    ).toBeInTheDocument();

    acknowledgeAndContinue("Reveal recovery phrase", "reveal-recovery-phrase");
    await submitPassword("hunter22", "Reveal recovery phrase");

    const grid = await screen.findByTestId("reveal-recovery-phrase-value");
    const words = grid.querySelectorAll("li");
    expect(words).toHaveLength(12);
    expect(words[0]).toHaveTextContent("1gloom");
    expect(words[11]).toHaveTextContent("12erode");
    expect(screen.getByRole("button", { name: "Done" })).toBeInTheDocument();
    expect(mockShowBackupPhrase).toHaveBeenCalledWith({
      activePublicKey: TEST_PUBLIC_KEY,
      password: "hunter22",
    });
  });

  it("shows the error inline and no words when the password is wrong", async () => {
    mockShowBackupPhrase.mockResolvedValue({
      mnemonicPhrase: "",
      error: "Incorrect Password",
    });
    render(
      <Wrapper routes={[ROUTES.revealRecoveryPhrase]}>
        <RevealRecoveryPhrase />
      </Wrapper>,
    );

    acknowledgeAndContinue("Reveal recovery phrase", "reveal-recovery-phrase");
    await submitPassword("wrong", "Reveal recovery phrase");

    await waitFor(() =>
      expect(screen.getByText("Incorrect Password")).toBeInTheDocument(),
    );
    expect(screen.queryByTestId("reveal-recovery-phrase-value")).toBeNull();
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
          <Route
            path={ROUTES.revealRecoveryPhrase}
            element={<LocationProbe />}
          />
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

  it("offers a phrase-derived account both its phrase and its key", () => {
    renderEditAccount(`?publicKey=${TEST_PUBLIC_KEY}`);

    expect(screen.getByTestId("edit-account-secret-key")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("edit-account-recovery-phrase"));

    expect(screen.getByTestId("location")).toHaveTextContent(
      ROUTES.revealRecoveryPhrase,
    );
  });

  it("offers an imported account no recovery phrase", () => {
    renderEditAccount(`?publicKey=${OTHER_PUBLIC_KEY}`);

    expect(screen.getByTestId("edit-account-secret-key")).toBeInTheDocument();
    expect(screen.queryByTestId("edit-account-recovery-phrase")).toBeNull();
  });

  it("offers no secret key for a hardware account", () => {
    renderEditAccount(`?publicKey=${TEST_PUBLIC_KEY}`, WalletType.LEDGER);

    expect(screen.getByTestId("edit-account-name")).toHaveTextContent(
      "Account 1",
    );
    expect(screen.queryByTestId("edit-account-secret-key")).toBeNull();
    expect(screen.queryByTestId("edit-account-recovery-phrase")).toBeNull();
  });

  it("opens the rename sheet from Account name", () => {
    renderEditAccount(`?publicKey=${OTHER_PUBLIC_KEY}`);

    fireEvent.click(screen.getByTestId("edit-account-name"));

    expect(screen.getByTestId("rename-wallet-input")).toHaveValue("Account 2");
  });
});
