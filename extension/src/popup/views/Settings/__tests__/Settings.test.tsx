import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import * as ApiInternal from "@shared/api/internal";
import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { Wrapper } from "popup/__testHelpers__";
import * as Toast from "popup/basics/shadcn/Toast";
import { ROUTES } from "popup/constants/routes";
import * as navigateHelpers from "popup/helpers/navigate";
import { Settings } from "popup/views/Settings";

const renderSettings = () =>
  render(
    <Wrapper state={{}} routes={[ROUTES.settings]}>
      <Settings />
    </Wrapper>,
  );

describe("Settings sign-out", () => {
  let navigateToSpy: jest.SpyInstance;
  let showToastSpy: jest.SpyInstance;
  let signOutSpy: jest.SpyInstance;

  beforeEach(() => {
    navigateToSpy = jest
      .spyOn(navigateHelpers, "navigateTo")
      .mockImplementation(() => undefined);
    showToastSpy = jest
      .spyOn(Toast, "showToast")
      .mockImplementation(() => "toast-id");
    signOutSpy = jest.spyOn(ApiInternal, "signOut").mockResolvedValue({
      publicKey: "",
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it.each([
    ["settings-lock-freighter", ROUTES.unlockAccount],
    ["settings-log-out", ROUTES.account],
  ])(
    "%s navigates once the background signs out",
    async (testId, destination) => {
      renderSettings();

      await userEvent.click(screen.getByTestId(testId));

      await waitFor(() =>
        expect(navigateToSpy).toHaveBeenCalledWith(
          destination,
          expect.anything(),
        ),
      );
      expect(showToastSpy).not.toHaveBeenCalled();
    },
  );

  // A failed sign-out leaves the background unlocked, so the unlock screen
  // must not be shown over it.
  it.each([["settings-lock-freighter"], ["settings-log-out"]])(
    "%s stays on Settings and reports the failure when the sign-out fails",
    async (testId) => {
      signOutSpy.mockResolvedValue({ error: "No response from background" });
      renderSettings();

      await userEvent.click(screen.getByTestId(testId));

      await waitFor(() => expect(showToastSpy).toHaveBeenCalledTimes(1));
      expect(navigateToSpy).not.toHaveBeenCalled();
    },
  );
});
