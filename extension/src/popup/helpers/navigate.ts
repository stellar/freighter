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

// The browser's own window.close, handed over by SidebarSigningListener for as
// long as it has window.close replaced with "navigate home" (sidebar mode).
let nativeWindowClose: (() => void) | undefined;

export const rememberNativeWindowClose = (close: () => void) => {
  nativeWindowClose = close;
};

export const forgetNativeWindowClose = () => {
  nativeWindowClose = undefined;
};

// Closes the popup, or the side panel in sidebar mode. A plain window.close()
// in the sidebar would navigate home and re-run the onboarding hand-off, so
// there this calls the native close the listener handed over. Everywhere else
// it calls window.close(), looked up when called rather than captured at load.
export const closeWindow = () => {
  if (nativeWindowClose) {
    nativeWindowClose();
    return;
  }
  window.close();
};

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
