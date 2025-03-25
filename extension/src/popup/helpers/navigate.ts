import browser from "webextension-polyfill";

import { ROUTES } from "popup/constants/routes";
import { NavigateFunction } from "react-router-dom";

export const navigateTo = (
  path: ROUTES,
  navigate: NavigateFunction,
  queryParams?: string
) => {
  const pathname = queryParams ? `${path}${queryParams}` : path;
  navigate(pathname);
};

/* Firefox will not let you use window.open to programatically open a tab. Use this instead */
export const openTab = (url: string) => browser.tabs.create({ url });
