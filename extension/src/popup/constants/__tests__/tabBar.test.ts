import { ROUTES } from "popup/constants/routes";
import { TAB_BAR_ROUTES, shouldShowTabBar } from "popup/constants/tabBar";

describe("shouldShowTabBar", () => {
  it("shows the bar on exactly the three tab roots", () => {
    expect(TAB_BAR_ROUTES).toEqual([
      ROUTES.account,
      ROUTES.accountHistory,
      ROUTES.discover,
    ]);
    TAB_BAR_ROUTES.forEach((route) => {
      expect(shouldShowTabBar(route)).toBe(true);
    });
  });

  // The bar must never appear on a screen that renders its own View.Footer, or
  // a 600px popup stacks two bars. The allow-list is default-off precisely so
  // these need no changes -- assert it, because it would regress silently.
  it.each([
    ROUTES.signTransaction,
    ROUTES.addToken,
    ROUTES.grantAccess,
    ROUTES.signMessage,
    ROUTES.signAuthEntry,
    ROUTES.unlockAccount,
    ROUTES.settings,
    ROUTES.viewPublicKey,
  ])("does not show the bar on %s", (route) => {
    expect(shouldShowTabBar(route)).toBe(false);
  });

  it("does not prefix-match: Home is '/' but must not claim every route", () => {
    expect(shouldShowTabBar(ROUTES.account)).toBe(true);
    expect(shouldShowTabBar("/some-other-route")).toBe(false);
    // Splat children of a tab route are not tab roots either.
    expect(shouldShowTabBar("/account-history/detail")).toBe(false);
  });
});
