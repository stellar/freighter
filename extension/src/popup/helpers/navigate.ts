import browser from "webextension-polyfill";

import { ROUTES } from "popup/constants/routes";
import { NavigateFunction } from "react-router-dom";

export const navigateTo = (
  path: ROUTES,
  navigate: NavigateFunction,
  queryParams?: string,
) => {
  const pathname = queryParams ? `${path}${queryParams}` : path;
  navigate(pathname);
};

/* Firefox will not let you use window.open to programatically open a tab. Use this instead */
export const openTab = (url: string) => browser.tabs.create({ url });

export const openSidebar = async () => {
  if ((browser as any).sidebarAction) {
    // Firefox
    await (browser as any).sidebarAction.open();
  } else {
    // Chrome and other Chromium browsers
    const win = await chrome.windows.getCurrent();
    await chrome.sidePanel.setOptions({
      path: "index.html?mode=sidebar",
      enabled: true,
    });
    await chrome.sidePanel.open({ windowId: win.id! });
  }
};
