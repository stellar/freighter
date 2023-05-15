import browser from "webextension-polyfill";

import { ROUTES } from "popup/constants/routes";
import { history } from "popup/constants/history";

export const navigateTo = (path: ROUTES, queryParams?: string) => {
  const pathname = queryParams ? `${path}${queryParams}` : path;
  history.push({ pathname });
};

/* Firefox will not let you use window.open to programatically open a tab. Use this instead */
export const openTab = (url: string) => browser.tabs.create({ url });
