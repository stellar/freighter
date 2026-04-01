import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import browser from "webextension-polyfill";
import { ROUTES } from "popup/constants/routes";
import { SIDEBAR_NAVIGATE } from "@shared/constants/services";

export const SIDEBAR_PORT_NAME = "sidebar";

// Routes that represent active signing/approval flows.
// When a new SIDEBAR_NAVIGATE arrives while the user is already on one of
// these, we show an interstitial instead of silently swapping the screen.
const SIGNING_ROUTE_PREFIXES = [
  ROUTES.signTransaction,
  ROUTES.signAuthEntry,
  ROUTES.signMessage,
  ROUTES.grantAccess,
  ROUTES.addToken,
  ROUTES.reviewAuthorization,
  ROUTES.confirmSidebarRequest,
];

// Only allow navigation to known signing-related routes (defense-in-depth).
const ALLOWED_NAV_PREFIXES = [
  ROUTES.signTransaction,
  ROUTES.signAuthEntry,
  ROUTES.signMessage,
  ROUTES.grantAccess,
  ROUTES.addToken,
  ROUTES.reviewAuthorization,
];

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
      if (typeof message !== "object" || message === null) return;
      const { type, route } = message as Record<string, unknown>;
      if (type !== SIDEBAR_NAVIGATE || typeof route !== "string") return;

      // Only allow navigation to known signing routes
      if (!ALLOWED_NAV_PREFIXES.some((prefix) => route.startsWith(prefix))) {
        return;
      }

      // If the user is already reviewing a signing request, show an
      // interstitial so they consciously acknowledge the new request
      // rather than having the screen silently swap underneath them.
      const currentHash = window.location.hash.replace("#", "");
      const isOnSigningRoute = SIGNING_ROUTE_PREFIXES.some((prefix) =>
        currentHash.startsWith(prefix),
      );

      if (isOnSigningRoute) {
        navigate(
          `${ROUTES.confirmSidebarRequest}?next=${encodeURIComponent(route)}`,
        );
      } else {
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
