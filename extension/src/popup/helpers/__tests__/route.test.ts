import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { newTabHref } from "helpers/urls";
import { ROUTES } from "popup/constants/routes";
import { closeWindow, openTab } from "popup/helpers/navigate";
import {
  reRouteOnboarding,
  resetOnboardingHandOffForTests,
} from "popup/helpers/route";

jest.mock("popup/helpers/navigate", () => ({
  openTab: jest.fn(),
  closeWindow: jest.fn(),
}));

describe("reRouteOnboarding", () => {
  beforeEach(() => {
    // The hand-off is once per page, and every test here is a new page.
    resetOnboardingHandOffForTests();
    // In the sidebar a plain window.close() navigates home, which runs the
    // hand-off again, so it must never be the call that closes the window.
    jest.spyOn(window, "close").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it.each([
    APPLICATION_STATE.PASSWORD_CREATED,
    APPLICATION_STATE.MNEMONIC_PHRASE_FAILED,
  ])(
    "restarts onboarding in a tab and closes the window for real when it was left at %s",
    (applicationState) => {
      reRouteOnboarding({
        type: AppDataType.RESOLVED,
        applicationState,
        state: RequestState.SUCCESS,
      });

      expect(openTab).toHaveBeenCalledTimes(1);
      expect(openTab).toHaveBeenCalledWith(
        newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"),
      );
      expect(closeWindow).toHaveBeenCalledTimes(1);
      expect(window.close).not.toHaveBeenCalled();
    },
  );

  it("does nothing once onboarding is confirmed", () => {
    reRouteOnboarding({
      type: AppDataType.RESOLVED,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      state: RequestState.SUCCESS,
    });

    expect(openTab).not.toHaveBeenCalled();
    expect(closeWindow).not.toHaveBeenCalled();
    expect(window.close).not.toHaveBeenCalled();
  });

  // Where closing does nothing (a Firefox sidebar, a tab the user opened) the
  // view that called this stays mounted and renders again, so a repeat call
  // must not open another tab.
  it("hands off once per page, however often the view renders", () => {
    const data = {
      type: AppDataType.RESOLVED,
      applicationState: APPLICATION_STATE.PASSWORD_CREATED,
      state: RequestState.SUCCESS,
    };

    reRouteOnboarding(data);
    reRouteOnboarding(data);

    expect(openTab).toHaveBeenCalledTimes(1);
    expect(closeWindow).toHaveBeenCalledTimes(1);
  });

  it("keeps its one hand-off for a call that has something to hand off", () => {
    reRouteOnboarding({
      type: AppDataType.RESOLVED,
      applicationState: APPLICATION_STATE.MNEMONIC_PHRASE_CONFIRMED,
      state: RequestState.SUCCESS,
    });
    reRouteOnboarding({
      type: AppDataType.RESOLVED,
      applicationState: APPLICATION_STATE.PASSWORD_CREATED,
      state: RequestState.SUCCESS,
    });

    expect(openTab).toHaveBeenCalledTimes(1);
    expect(closeWindow).toHaveBeenCalledTimes(1);
  });
});
