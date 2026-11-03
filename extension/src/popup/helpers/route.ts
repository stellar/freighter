import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { closeWindow, openTab } from "./navigate";
import { newTabHref } from "helpers/urls";
import { ROUTES } from "popup/constants/routes";

export const getPathFromRoute = ({
  fullRoute,
  basePath,
}: {
  fullRoute: string;
  basePath: string;
}) => {
  const [_, path] = fullRoute.split(basePath);
  if (!path) {
    return fullRoute;
  }
  return path;
};

// Where closing the window does nothing (a Firefox sidebar, a tab the user
// opened), the view that called reRouteOnboarding stays mounted and renders
// again, so hand off once per page or every render would open another tab.
let hasHandedOffOnboarding = false;

/** Test-only: forget that this page already handed off onboarding. */
export const resetOnboardingHandOffForTests = () => {
  hasHandedOffOnboarding = false;
};

export const reRouteOnboarding = (data: {
  type: AppDataType;
  applicationState: APPLICATION_STATE;
  state: RequestState;
}) => {
  if (
    !hasHandedOffOnboarding &&
    data.type === AppDataType.RESOLVED &&
    (data.applicationState === APPLICATION_STATE.PASSWORD_CREATED ||
      data.applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    hasHandedOffOnboarding = true;
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    closeWindow();
  }
};
