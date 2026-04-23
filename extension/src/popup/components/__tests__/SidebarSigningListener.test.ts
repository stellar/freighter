import { ROUTES } from "popup/constants/routes";

// Replicate the allowlist logic from SidebarSigningListener/index.tsx
// since the arrays are not exported. This documents the expected behavior.
const ALLOWED_NAV_PREFIXES = [
  ROUTES.signTransaction,
  ROUTES.signAuthEntry,
  ROUTES.signMessage,
  ROUTES.grantAccess,
  ROUTES.addToken,
  ROUTES.reviewAuthorization,
];

const SIGNING_ROUTE_PREFIXES = [
  ...ALLOWED_NAV_PREFIXES,
  ROUTES.confirmSidebarRequest,
];

const isAllowedRoute = (route: string) =>
  ALLOWED_NAV_PREFIXES.some((prefix) => route.startsWith(prefix));

describe("SidebarSigningListener route allowlists", () => {
  describe("ALLOWED_NAV_PREFIXES", () => {
    it("contains all expected signing routes", () => {
      expect(ALLOWED_NAV_PREFIXES).toEqual([
        ROUTES.signTransaction,
        ROUTES.signAuthEntry,
        ROUTES.signMessage,
        ROUTES.grantAccess,
        ROUTES.addToken,
        ROUTES.reviewAuthorization,
      ]);
    });

    it("has exactly 6 allowed prefixes", () => {
      expect(ALLOWED_NAV_PREFIXES).toHaveLength(6);
    });
  });

  describe("SIGNING_ROUTE_PREFIXES", () => {
    it("includes confirmSidebarRequest in addition to all ALLOWED routes", () => {
      expect(SIGNING_ROUTE_PREFIXES).toEqual([
        ...ALLOWED_NAV_PREFIXES,
        ROUTES.confirmSidebarRequest,
      ]);
    });

    it("has exactly 7 signing prefixes", () => {
      expect(SIGNING_ROUTE_PREFIXES).toHaveLength(7);
    });

    it("contains every ALLOWED_NAV_PREFIX", () => {
      for (const prefix of ALLOWED_NAV_PREFIXES) {
        expect(SIGNING_ROUTE_PREFIXES).toContain(prefix);
      }
    });

    it("contains confirmSidebarRequest", () => {
      expect(SIGNING_ROUTE_PREFIXES).toContain(ROUTES.confirmSidebarRequest);
    });
  });

  describe("isAllowedRoute — matching allowed routes", () => {
    it.each([
      ["signTransaction", ROUTES.signTransaction],
      ["signAuthEntry", ROUTES.signAuthEntry],
      ["signMessage", ROUTES.signMessage],
      ["grantAccess", ROUTES.grantAccess],
      ["addToken", ROUTES.addToken],
      ["reviewAuthorization", ROUTES.reviewAuthorization],
    ])("matches %s route exactly", (_label, route) => {
      expect(isAllowedRoute(route)).toBe(true);
    });

    it.each([
      ["signTransaction with sub-path", `${ROUTES.signTransaction}/confirm`],
      ["signAuthEntry with query", `${ROUTES.signAuthEntry}?id=123`],
      ["grantAccess with sub-path", `${ROUTES.grantAccess}/details`],
    ])("matches %s via startsWith", (_label, route) => {
      expect(isAllowedRoute(route)).toBe(true);
    });
  });

  describe("isAllowedRoute — rejecting non-signing routes", () => {
    const DISALLOWED_ROUTES = [
      "/settings",
      "/account",
      "/swap",
      "/send-payment",
      "/manage-assets",
      "/account-history",
      "/",
    ];

    it.each(DISALLOWED_ROUTES)(
      "does not match disallowed route %s",
      (route) => {
        expect(isAllowedRoute(route)).toBe(false);
      },
    );
  });

  describe("isAllowedRoute — disallowed routes do not start with any ALLOWED prefix", () => {
    const DISALLOWED_ROUTES = [
      "/settings",
      "/account",
      "/swap",
      "/send-payment",
      "/manage-assets",
      "/account-history",
      "/",
    ];

    it.each(DISALLOWED_ROUTES)(
      "%s does not startWith any allowed prefix",
      (route) => {
        for (const prefix of ALLOWED_NAV_PREFIXES) {
          expect(route.startsWith(prefix)).toBe(false);
        }
      },
    );
  });
});
