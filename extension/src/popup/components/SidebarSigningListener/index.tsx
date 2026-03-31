import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import browser from "webextension-polyfill";
import { ROUTES } from "popup/constants/routes";
import { SIDEBAR_NAVIGATE } from "@shared/constants/services";

export const SIDEBAR_PORT_NAME = "sidebar";

export const SidebarSigningListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Open a long-lived port to the background.
    // The background uses onDisconnect to reliably clear sidebarWindowId when sidebar closes.
    const port = browser.runtime.connect({ name: SIDEBAR_PORT_NAME });

    // Send window ID so the background can register this sidebar
    browser.windows.getCurrent().then((win) => {
      port.postMessage({ windowId: win.id });
    });

    // In sidebar mode, window.close() would collapse the panel. Navigate home instead.
    const originalClose = window.close.bind(window);
    window.close = () => navigate(ROUTES.account);

    // Listen for navigation messages sent directly over the port from the
    // background, scoped to this sidebar only (no broadcast to other listeners).
    const portHandler = (message: unknown) => {
      const { type, route } = message as { type: string; route: string };
      if (type === SIDEBAR_NAVIGATE) {
        navigate(route);
      }
    };

    port.onMessage.addListener(portHandler);

    return () => {
      window.close = originalClose;
      port.onMessage.removeListener(portHandler);
      port.disconnect();
    };
  }, [navigate]);

  return null;
};
