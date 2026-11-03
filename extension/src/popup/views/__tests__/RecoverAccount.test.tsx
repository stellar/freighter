import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
import { RecoverAccount } from "popup/views/RecoverAccount";

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

describe("Recover Account View", () => {
  beforeEach(() => {
    jest.spyOn(ApiInternal, "loadAccount").mockResolvedValue({
      hasPrivateKey: false,
      publicKey: "",
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      allAccounts: [],
      bipPath: "",
      tokenIdList: [],
    } as any);
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
    jest.restoreAllMocks();
  });

  it("warns before replacing an existing wallet", async () => {
    const recoverSpy = jest
      .spyOn(ApiInternal, "recoverAccount")
      .mockResolvedValue({
        allAccounts: [],
        hasPrivateKey: true,
        publicKey: "GNEWWALLET",
        applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
        error: "",
      } as any);
    render(
      <Wrapper
        routes={[ROUTES.recoverAccount]}
        state={{
          auth: {
            error: null,
            applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
            publicKey: "",
            allAccounts: [],
          },
        }}
      >
        <RecoverAccount />
      </Wrapper>,
    );

    const passwordField = await screen.findByTestId(
      "account-creator-password-input",
    );
    expect(
      screen.getByText(
        "You are overwriting an existing account. You will permanently lose access to the account currently stored in Varial.",
      ),
    ).toBeInTheDocument();

    fireEvent.change(passwordField, { target: { value: "Password" } });
    fireEvent.change(
      screen.getByTestId("account-creator-confirm-password-input"),
      { target: { value: "Password" } },
    );
    await userEvent.click(
      screen.getByTestId("account-creator-termsOfUse-input"),
    );
    await waitFor(() =>
      expect(screen.getByTestId("account-creator-submit")).not.toBeDisabled(),
    );
    await userEvent.click(screen.getByTestId("account-creator-submit"));

    await screen.findByText("Import wallet from recovery phrase");
    WORDS.forEach((word, i) => {
      fireEvent.change(
        document.getElementById(`MnemonicPhrase-${i + 1}`) as HTMLElement,
        { target: { value: word } },
      );
    });
    await userEvent.click(screen.getByRole("button", { name: "Import" }));

    await waitFor(() =>
      expect(recoverSpy).toHaveBeenCalledWith({
        password: "Password",
        recoverMnemonic: WORDS.join(" "),
        isOverwritingAccount: true,
      }),
    );
  });
});
