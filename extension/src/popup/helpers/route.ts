import { APPLICATION_STATE } from "@shared/constants/applicationState";
import { RequestState } from "constants/request";
import { AppDataType } from "helpers/hooks/useGetAppData";
import { openTab } from "./navigate";
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

export const reRouteOnboarding = (data: {
  type: AppDataType;
  applicationState: APPLICATION_STATE;
  state: RequestState;
}) => {
  if (
    data.type === AppDataType.RESOLVED &&
    (data.applicationState === APPLICATION_STATE.PASSWORD_CREATED ||
      data.applicationState === APPLICATION_STATE.MNEMONIC_PHRASE_FAILED)
  ) {
    openTab(newTabHref(ROUTES.accountCreator, "isRestartingOnboarding=true"));
    window.close();
  }
};
