import React from "react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { NavigateFunction, Route, Routes, useNavigate } from "react-router-dom";
import { Keypair } from "stellar-sdk";

import * as ApiInternal from "@shared/api/internal";
import { SettingsState } from "@shared/api/types";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES } from "@shared/constants/autoLock";
import { DEFAULT_ASSETS_LISTS } from "@shared/constants/soroban/asset-list";
import {
  DEFAULT_NETWORKS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { Wrapper } from "popup/__testHelpers__";
import { ROUTES } from "popup/constants/routes";
import { RecoverAccount, MIN_IMPORTING_MS } from "popup/views/RecoverAccount";
import { STATUS_EXIT_MS } from "popup/components/OnboardingStatus";

const WORDS = [
  "have",
  "style",
  "milk",
  "flush",
  "you",
  "possible",
  "thrive",
  "dice",
  "delay",
  "police",
  "seminar",
  "face",
];
const PHRASE = WORDS.join(" ");
const SECRET_KEY = Keypair.random().secret();

const OVERWRITE_WARNING =
  "You are overwriting an existing account. You will permanently lose access to the account currently stored in Varial.";

const mockLoadAccount = (applicationState: APPLICATION_STATE) =>
  jest.spyOn(ApiInternal, "loadAccount").mockResolvedValue({
    hasPrivateKey: false,
    publicKey: "",
    applicationState,
    allAccounts: [],
    bipPath: "",
    tokenIdList: [],
  } as any);

const successResponse = {
  allAccounts: [],
  hasPrivateKey: true,
  publicKey: "GNEWWALLET",
  activeAccountId: "1",
  error: "",
};

// Hands the router's navigate to a test, to act like the browser's Back.
let testNavigate: NavigateFunction = () => {};
const NavigateProbe = () => {
  testNavigate = useNavigate();
  return null;
};

const renderView = (
  routes: Array<string | { pathname: string; state: unknown }> = [
    ROUTES.recoverAccount,
  ],
) =>
  render(
    <Wrapper
      routes={routes}
      state={{
        auth: {
          error: null,
          applicationState: APPLICATION_STATE.APPLICATION_STARTED,
          publicKey: "",
          allAccounts: [],
        },
      }}
    >
      <NavigateProbe />
      <Routes>
        <Route path={ROUTES.recoverAccount} element={<RecoverAccount />} />
        <Route
          path={ROUTES.account}
          element={<div data-testid="account-route" />}
        />
        <Route path={ROUTES.welcome} element={<div data-testid="welcome" />} />
      </Routes>
    </Wrapper>,
  );

const enterSecret = async (value: string) => {
  const input = await screen.findByTestId("import-secret-input");
  fireEvent.change(input, { target: { value } });
  fireEvent.click(screen.getByTestId("import-secret-next"));
};

const fillPasswordForm = async () => {
  fireEvent.change(
    await screen.findByTestId("account-creator-password-input"),
    { target: { value: "Password1!" } },
  );
  fireEvent.change(
    screen.getByTestId("account-creator-confirm-password-input"),
    { target: { value: "Password1!" } },
  );
  fireEvent.click(screen.getByTestId("account-creator-termsOfUse-input"));
  await waitFor(() =>
    expect(screen.getByTestId("account-creator-submit")).not.toBeDisabled(),
  );
};

describe("Recover Account View", () => {
  beforeEach(() => {
    mockLoadAccount(APPLICATION_STATE.APPLICATION_STARTED);
    jest.spyOn(ApiInternal, "loadSettings").mockResolvedValue({
      networkDetails: TESTNET_NETWORK_DETAILS,
      networksList: DEFAULT_NETWORKS,
      hiddenAssets: {},
      allowList: ApiInternal.DEFAULT_ALLOW_LIST,
      error: "",
      isDataSharingAllowed: false,
      isMemoValidationEnabled: false,
      isHideDustEnabled: true,
      isOpenSidebarByDefault: false,
      settingsState: SettingsState.SUCCESS,
      isSorobanPublicEnabled: false,
      isRpcHealthy: true,
      userNotification: { enabled: false, message: "" },
      isExperimentalModeEnabled: false,
      isHashSigningEnabled: false,
      isNonSSLEnabled: false,
      experimentalFeaturesState: SettingsState.SUCCESS,
      assetsLists: DEFAULT_ASSETS_LISTS,
      autoLockTimeoutMinutes: DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES,
    } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it("warns before replacing an existing wallet", async () => {
    mockLoadAccount(APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED);
    const recoverSpy = jest
      .spyOn(ApiInternal, "recoverAccount")
      .mockResolvedValue(successResponse as any);
    renderView();

    await enterSecret(PHRASE);
    await fillPasswordForm();
    expect(screen.getByText(OVERWRITE_WARNING)).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("account-creator-submit"));

    await waitFor(() =>
      expect(recoverSpy).toHaveBeenCalledWith({
        password: "Password1!",
        recoverMnemonic: PHRASE,
        isOverwritingAccount: true,
      }),
    );
  });

  it("rejects invalid input before the password step", async () => {
    renderView();

    await enterSecret("hello");

    expect(
      await screen.findByText("Enter a valid recovery phrase or secret key"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("account-creator-password-input"),
    ).not.toBeInTheDocument();
  });

  it("disables Next while the input is empty", async () => {
    renderView();

    expect(await screen.findByTestId("import-secret-next")).toBeDisabled();
    fireEvent.change(screen.getByTestId("import-secret-input"), {
      target: { value: "  " },
    });
    expect(screen.getByTestId("import-secret-next")).toBeDisabled();
  });

  it("routes a phrase to recoverAccount", async () => {
    const recoverSpy = jest
      .spyOn(ApiInternal, "recoverAccount")
      .mockResolvedValue(successResponse as any);
    const keySpy = jest.spyOn(ApiInternal, "recoverAccountFromSecretKey");
    renderView();

    await enterSecret(`  ${WORDS.join("  ").toUpperCase()} `);
    await fillPasswordForm();
    fireEvent.click(screen.getByTestId("account-creator-submit"));

    await waitFor(() =>
      expect(recoverSpy).toHaveBeenCalledWith({
        password: "Password1!",
        recoverMnemonic: PHRASE,
        isOverwritingAccount: false,
      }),
    );
    expect(keySpy).not.toHaveBeenCalled();
  });

  it("routes a secret key to recoverAccountFromSecretKey", async () => {
    const keySpy = jest
      .spyOn(ApiInternal, "recoverAccountFromSecretKey")
      .mockResolvedValue(successResponse as any);
    const recoverSpy = jest.spyOn(ApiInternal, "recoverAccount");
    renderView();

    await enterSecret(` ${SECRET_KEY}\n`);
    await fillPasswordForm();
    fireEvent.click(screen.getByTestId("account-creator-submit"));

    await waitFor(() =>
      expect(keySpy).toHaveBeenCalledWith({
        secretKey: SECRET_KEY,
        password: "Password1!",
        isOverwritingAccount: false,
      }),
    );
    expect(recoverSpy).not.toHaveBeenCalled();
  });

  it("keeps the input when going back from the password step", async () => {
    // The form's Back button is hidden in a tab with no history.
    window.history.pushState({}, "", "/");
    renderView();

    await enterSecret(SECRET_KEY);
    await screen.findByTestId("account-creator-password-input");
    fireEvent.click(screen.getByRole("button", { name: "Back" }));

    expect(await screen.findByTestId("import-secret-input")).toHaveValue(
      SECRET_KEY,
    );
  });

  it("masks the input until revealed", async () => {
    renderView();

    const input = await screen.findByTestId("import-secret-input");
    expect(input).toHaveClass("RecoverAccount__input--masked");

    fireEvent.click(screen.getByTestId("import-secret-visibility"));
    expect(input).not.toHaveClass("RecoverAccount__input--masked");

    fireEvent.click(screen.getByTestId("import-secret-visibility"));
    expect(input).toHaveClass("RecoverAccount__input--masked");
  });

  it("sends one request on double submit", async () => {
    let resolve: (value: any) => void = () => {};
    const keySpy = jest
      .spyOn(ApiInternal, "recoverAccountFromSecretKey")
      .mockImplementation(
        () =>
          new Promise((r) => {
            resolve = r;
          }),
      );
    renderView();

    await enterSecret(SECRET_KEY);
    await fillPasswordForm();
    // The button disables itself while submitting; Enter in a field submits
    // the form directly, so submit the form twice.
    const form = screen
      .getByTestId("account-creator-submit")
      .closest("form") as HTMLFormElement;
    fireEvent.submit(form);
    fireEvent.submit(form);

    await screen.findByText("Importing your wallet…");
    await act(async () => {
      resolve(successResponse);
    });
    await screen.findByText("Your wallet is ready!");
    expect(keySpy).toHaveBeenCalledTimes(1);
  });

  it("stays on the ready state", async () => {
    jest
      .spyOn(ApiInternal, "recoverAccountFromSecretKey")
      .mockResolvedValue(successResponse as any);
    renderView();

    await enterSecret(SECRET_KEY);
    await fillPasswordForm();
    jest.useFakeTimers();
    fireEvent.click(screen.getByTestId("account-creator-submit"));

    await screen.findByText("Your wallet is ready!");

    // Onboarding ends here; the user closes the tab.
    act(() => {
      jest.advanceTimersByTime(60_000);
    });
    expect(screen.getByText("Your wallet is ready!")).toBeInTheDocument();
    expect(screen.queryByTestId("account-route")).not.toBeInTheDocument();
  });

  it("keeps the status screen mounted and swaps only the copy", async () => {
    let resolve: (value: any) => void = () => {};
    jest.spyOn(ApiInternal, "recoverAccountFromSecretKey").mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    renderView();

    await enterSecret(SECRET_KEY);
    await fillPasswordForm();
    jest.useFakeTimers();
    fireEvent.click(screen.getByTestId("account-creator-submit"));
    await screen.findByText("Importing your wallet…");
    const statusScreen = screen.getByTestId("onboarding-status");

    await act(async () => {
      resolve(successResponse);
    });
    await act(async () => {
      jest.advanceTimersByTime(MIN_IMPORTING_MS);
    });
    // The old line plays its exit before the new one replaces it.
    expect(screen.getByText("Importing your wallet…")).toHaveClass(
      "OnboardingStatus__text--leaving",
    );

    act(() => {
      jest.advanceTimersByTime(STATUS_EXIT_MS);
    });
    expect(screen.getByText("Your wallet is ready!")).not.toHaveClass(
      "OnboardingStatus__text--leaving",
    );
    expect(
      screen.queryByText("Importing your wallet…"),
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("onboarding-status")).toBe(statusScreen);
  });

  it("keeps the importing screen up for a minimum time", async () => {
    jest
      .spyOn(ApiInternal, "recoverAccountFromSecretKey")
      .mockResolvedValue(successResponse as any);
    renderView();

    await enterSecret(SECRET_KEY);
    await fillPasswordForm();
    jest.useFakeTimers();
    fireEvent.click(screen.getByTestId("account-creator-submit"));
    // Let the mocked import and the account reload settle.
    const flushPromises = async () => {
      for (let i = 0; i < 20; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
      }
    };
    await act(async () => {
      jest.advanceTimersByTime(MIN_IMPORTING_MS - 1);
      await flushPromises();
    });
    expect(ApiInternal.recoverAccountFromSecretKey).toHaveBeenCalled();
    expect(screen.getByTestId("onboarding-status")).toHaveAttribute(
      "data-status",
      "importing",
    );

    await act(async () => {
      jest.advanceTimersByTime(1);
    });
    await waitFor(() =>
      expect(screen.getByTestId("onboarding-status")).toHaveAttribute(
        "data-status",
        "ready",
      ),
    );
  });

  it("returns to the input with the error when the import fails", async () => {
    jest.spyOn(ApiInternal, "recoverAccountFromSecretKey").mockResolvedValue({
      ...successResponse,
      publicKey: "",
      error: "Error importing account",
    } as any);
    renderView();

    await enterSecret(SECRET_KEY);
    await fillPasswordForm();
    fireEvent.click(screen.getByTestId("account-creator-submit"));

    expect(
      await screen.findByText("Error importing account"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("import-secret-input")).toHaveValue(SECRET_KEY);
    expect(
      screen.queryByTestId("account-creator-password-input"),
    ).not.toBeInTheDocument();
  });

  it("shows the generic import error for an unknown failure message", async () => {
    jest.spyOn(ApiInternal, "recoverAccountFromSecretKey").mockResolvedValue({
      ...successResponse,
      publicKey: "",
      error: "Something the background invented",
    } as any);
    renderView();

    await enterSecret(SECRET_KEY);
    await fillPasswordForm();
    fireEvent.click(screen.getByTestId("account-creator-submit"));

    expect(
      await screen.findByText("Error importing account"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Something the background invented"),
    ).not.toBeInTheDocument();
  });

  it("shows the invalid-input copy when the background rejects the key", async () => {
    jest.spyOn(ApiInternal, "recoverAccountFromSecretKey").mockResolvedValue({
      ...successResponse,
      publicKey: "",
      error: "Invalid secret key",
    } as any);
    renderView();

    await enterSecret(SECRET_KEY);
    await fillPasswordForm();
    fireEvent.click(screen.getByTestId("account-creator-submit"));

    expect(
      await screen.findByText("Enter a valid recovery phrase or secret key"),
    ).toBeInTheDocument();
  });

  it("ignores a stale password-step history entry after a reload", async () => {
    renderView([
      { pathname: ROUTES.recoverAccount, state: { step: "password" } },
    ]);

    const input = await screen.findByTestId("import-secret-input");
    fireEvent.change(input, { target: { value: "h" } });

    expect(screen.getByTestId("import-secret-input")).toHaveValue("h");
    expect(
      screen.queryByTestId("account-creator-password-input"),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("import-secret-next"));
    expect(
      await screen.findByText("Enter a valid recovery phrase or secret key"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("account-creator-password-input"),
    ).not.toBeInTheDocument();
  });

  it("stays on the import route when Back is pressed during a failing import", async () => {
    let resolve: (value: any) => void = () => {};
    jest.spyOn(ApiInternal, "recoverAccountFromSecretKey").mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    renderView([ROUTES.welcome, ROUTES.recoverAccount]);

    await enterSecret(SECRET_KEY);
    await fillPasswordForm();
    fireEvent.click(screen.getByTestId("account-creator-submit"));
    await screen.findByText("Importing your wallet…");

    // Browser Back pops the password entry while the request runs.
    act(() => {
      testNavigate(-1);
    });
    await act(async () => {
      resolve({
        ...successResponse,
        publicKey: "",
        error: "Error importing account",
      });
    });

    expect(
      await screen.findByText("Error importing account"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("import-secret-input")).toHaveValue(SECRET_KEY);
    expect(screen.queryByTestId("welcome")).not.toBeInTheDocument();
  });
  it("does not redirect after the route is left during a successful import", async () => {
    let resolve: (value: any) => void = () => {};
    jest.spyOn(ApiInternal, "recoverAccountFromSecretKey").mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    renderView();

    await enterSecret(SECRET_KEY);
    await fillPasswordForm();
    fireEvent.click(screen.getByTestId("account-creator-submit"));
    await screen.findByText("Importing your wallet…");

    act(() => {
      testNavigate(ROUTES.welcome);
    });
    jest.useFakeTimers();
    await act(async () => {
      resolve(successResponse);
    });
    act(() => {
      jest.advanceTimersByTime(60_000);
    });

    expect(screen.getByTestId("welcome")).toBeInTheDocument();
    expect(screen.queryByTestId("account-route")).not.toBeInTheDocument();
  });

  it("does not pop history after the route is left during a failing import", async () => {
    let resolve: (value: any) => void = () => {};
    jest.spyOn(ApiInternal, "recoverAccountFromSecretKey").mockImplementation(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    );
    renderView([ROUTES.welcome, ROUTES.recoverAccount]);

    await enterSecret(SECRET_KEY);
    await fillPasswordForm();
    fireEvent.click(screen.getByTestId("account-creator-submit"));
    await screen.findByText("Importing your wallet…");

    act(() => {
      testNavigate(ROUTES.welcome);
    });
    await act(async () => {
      resolve({
        ...successResponse,
        publicKey: "",
        error: "Error importing account",
      });
    });

    expect(screen.getByTestId("welcome")).toBeInTheDocument();
    expect(screen.queryByTestId("import-secret-input")).not.toBeInTheDocument();
  });
});
