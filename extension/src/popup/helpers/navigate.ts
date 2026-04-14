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
  try {
    if ((browser as any).sidebarAction) {
      // Firefox
      await (browser as any).sidebarAction.open();
    } else {
      // Chrome — must be called in user gesture context before closing popup
      const win = await chrome.windows.getCurrent();
      await chrome.sidePanel.setOptions({
        path: "index.html?mode=sidebar",
        enabled: true,
      });
      await chrome.sidePanel.open({ windowId: win.id! });
    }
  } catch (e) {
    console.error("Failed to open sidebar:", e);
  } finally {
    window.close();
  }
};
