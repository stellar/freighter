import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "popup/constants/routes";
import { SIDEBAR_NAVIGATE } from "@shared/constants/services";

export const SIDEBAR_PORT_NAME = "sidebar";

export const SidebarSigningListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Open a long-lived port to the background.
    // The background uses onDisconnect to reliably clear sidebarWindowId when sidebar closes.
    const port = chrome.runtime.connect({ name: SIDEBAR_PORT_NAME });

    // Send window ID so the background can register this sidebar
    chrome.windows.getCurrent().then((win) => {
      port.postMessage({ windowId: win.id });
    });

    // In sidebar mode, window.close() would collapse the panel. Navigate home instead.
    const originalClose = window.close.bind(window);
    window.close = () => navigate(ROUTES.account);

    // Listen for navigation messages sent directly over the port from the
    // background, scoped to this sidebar only (no broadcast to other listeners).
    const portHandler = (message: { type: string; route: string }) => {
      if (message.type === SIDEBAR_NAVIGATE) {
        navigate(message.route);
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
