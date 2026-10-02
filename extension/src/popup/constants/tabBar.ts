import { ROUTES } from "popup/constants/routes";

/**
 * Routes that show the bottom tab bar.
 *
 * An allow-list rather than a deny-list: default-off means the ~21 screens that
 * render their own `View.Footer` cannot end up stacking two bars in a 600px
 * popup, and they need no changes.
 *
 * Every entry must be an exact path. All three are (`/`, `/account-history`,
 * `/discover`); splat routes like `manageAssets`, `send` and `swap` would not
 * match, but none of them is a tab.
 */
export const TAB_BAR_ROUTES: readonly ROUTES[] = [
  ROUTES.account,
  ROUTES.accountHistory,
  ROUTES.discover,
];

/**
 * Pure so it can be unit tested. Window-mode checks (sidebar, fullscreen,
 * standalone signing popups) stay in `Layout`, which already concentrates that
 * kind of shell decision.
 */
export const shouldShowTabBar = (pathname: string): boolean =>
  TAB_BAR_ROUTES.some((route) => route === pathname);
