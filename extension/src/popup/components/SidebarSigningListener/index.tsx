import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SERVICE_TYPES } from "@shared/constants/services";
import { ROUTES } from "popup/constants/routes";

const SIDEBAR_NAVIGATE = "SIDEBAR_NAVIGATE";

export const SidebarSigningListener = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const register = async () => {
      const win = await chrome.windows.getCurrent();
      chrome.runtime.sendMessage({
        type: SERVICE_TYPES.SIDEBAR_REGISTER,
        windowId: win.id,
      });
    };

    register();

    // In sidebar mode, window.close() would collapse the panel. Navigate home instead.
    const originalClose = window.close.bind(window);
    window.close = () => navigate(ROUTES.account);

    const handler = (message: { type: string; route: string }) => {
      if (message.type === SIDEBAR_NAVIGATE) {
        navigate(message.route);
      }
    };

    chrome.runtime.onMessage.addListener(handler);

    const handleUnload = () => {
      chrome.runtime.sendMessage({ type: SERVICE_TYPES.SIDEBAR_UNREGISTER });
    };

    window.addEventListener("beforeunload", handleUnload);

    return () => {
      window.close = originalClose;
      chrome.runtime.onMessage.removeListener(handler);
      window.removeEventListener("beforeunload", handleUnload);
      chrome.runtime.sendMessage({ type: SERVICE_TYPES.SIDEBAR_UNREGISTER });
    };
  }, [navigate]);

  return null;
};
