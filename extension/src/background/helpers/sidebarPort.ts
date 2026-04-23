import browser from "webextension-polyfill";

// Long-lived port to the sidebar, set by initSidebarConnectionListener
let sidebarPort: browser.Runtime.Port | null = null;

export const setSidebarPort = (port: browser.Runtime.Port) => {
  sidebarPort = port;
};
export const clearSidebarPort = () => {
  sidebarPort = null;
};
export const getSidebarPort = () => sidebarPort;
