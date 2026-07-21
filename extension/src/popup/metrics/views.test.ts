// helpers/metrics is globally auto-mocked (see config/jest/setupTests.tsx), but
// that stub omits emitScreenViewed and does not let us capture the registered
// navigate handler. Provide an explicit mock with jest.fn spies so we can grab
// the handler and assert exactly what it emits.
jest.mock("helpers/metrics", () => ({
  registerHandler: jest.fn(),
  emitMetric: jest.fn(),
  emitScreenViewed: jest.fn(),
}));
jest.mock("popup/ducks/views", () => ({
  navigate: { type: "views/navigate" },
}));
jest.mock("helpers/stellar", () => ({
  getTransactionInfo: jest.fn(() => ({
    operations: [{}, {}, {}],
    operationTypes: ["payment"],
  })),
}));
jest.mock("helpers/urls", () => ({
  parsedSearchParam: jest.fn(() => ({ url: "https://example.org/path" })),
  getUrlHostname: jest.fn(() => "example.org"),
  getUrlDomain: jest.fn(() => "example"),
}));
jest.mock("popup/helpers/isSidebarMode", () => ({
  isSidebarMode: jest.fn(() => false),
}));
jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));

import { captureException } from "@sentry/browser";
import { registerHandler, emitMetric, emitScreenViewed } from "helpers/metrics";
import { METRIC_NAMES } from "popup/constants/metricsNames";
import { ROUTES } from "popup/constants/routes";

// Importing the module registers the navigate handler via registerHandler.
import "popup/metrics/views";

type NavHandler = (state: unknown, action: unknown) => void;

const getHandler = (): NavHandler => {
  const calls = (registerHandler as jest.Mock).mock.calls;
  return calls[calls.length - 1][1] as NavHandler;
};

const fireNavigate = (pathname: string, search = "") =>
  getHandler()(
    {},
    { type: "views/navigate", payload: { location: { pathname, search } } },
  );

describe("views navigate handler → screen.viewed", () => {
  beforeEach(() => {
    (emitScreenViewed as jest.Mock).mockClear();
    (emitMetric as jest.Mock).mockClear();
  });

  it("registers a single navigate handler", () => {
    expect((registerHandler as jest.Mock).mock.calls.length).toBeGreaterThan(0);
  });

  it("emits screen.viewed (never a legacy emitMetric screen event) for a plain screen", () => {
    fireNavigate(ROUTES.welcome);
    expect(emitScreenViewed).toHaveBeenCalledWith("welcome", {
      flow: "onboarding",
    });
    expect(emitMetric).not.toHaveBeenCalled();
  });

  it("maps the home account route to the assets flow", () => {
    fireNavigate(ROUTES.account);
    expect(emitScreenViewed).toHaveBeenCalledWith("account", {
      flow: "assets",
    });
  });

  it("does not emit a screen-view for the send container route (D8)", () => {
    // The send route is a container: its per-step screens are emitted by the
    // Send flow's step effect, so navigating the route itself emits nothing.
    fireNavigate(ROUTES.sendPayment);
    expect(emitScreenViewed).not.toHaveBeenCalled();
    expect(emitMetric).not.toHaveBeenCalled();
  });

  it("skips (does not throw) and reports to Sentry for an uncatalogued route (D6)", () => {
    (captureException as jest.Mock).mockClear();
    expect(() => fireNavigate("/some-brand-new-route")).not.toThrow();
    expect(emitScreenViewed).not.toHaveBeenCalled();
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("attaches a step for completion/success screens", () => {
    fireNavigate(ROUTES.mnemonicPhraseConfirmed);
    expect(emitScreenViewed).toHaveBeenCalledWith("account_creator_finished", {
      flow: "onboarding",
      step: "success",
    });

    (emitScreenViewed as jest.Mock).mockClear();
    fireNavigate(ROUTES.recoverAccountSuccess);
    expect(emitScreenViewed).toHaveBeenCalledWith("recover_account_success", {
      flow: "onboarding",
      step: "success",
    });
  });

  it("preserves the domain/subdomain props on the grant-access screen", () => {
    fireNavigate(ROUTES.grantAccess, "?url=https://example.org");
    expect(emitScreenViewed).toHaveBeenCalledWith("grant_access", {
      flow: "signing",
      domain: "example",
      subdomain: "example.org",
      sidebarMode: false,
    });
  });

  it("preserves the operation props on the sign-transaction screen", () => {
    fireNavigate(ROUTES.signTransaction, "?url=https://example.org");
    expect(emitScreenViewed).toHaveBeenCalledWith("sign_transaction", {
      flow: "signing",
      domain: "example",
      subdomain: "example.org",
      sidebarMode: false,
      number_of_operations: 3,
      operationTypes: ["payment"],
    });
  });

  it("leaves the non-screen modify-asset-list event untouched", () => {
    fireNavigate(ROUTES.manageAssetsListsModifyAssetList);
    expect(emitMetric).toHaveBeenCalledWith(METRIC_NAMES.assetListModified);
    expect(emitScreenViewed).not.toHaveBeenCalled();
  });

  it("has a mapping for every route (never throws on navigate)", () => {
    Object.values(ROUTES).forEach((pathname) => {
      expect(() =>
        fireNavigate(pathname, "?url=https://example.org"),
      ).not.toThrow();
    });
  });

  it("produces only snake_case screen names with no legacy prefix across all routes", () => {
    const screenRoutes = Object.values(ROUTES).filter(
      (r) =>
        r !== ROUTES.manageAssetsListsModifyAssetList &&
        // The send route is an intentional non-emit container (D8); its
        // per-step screens are emitted by the Send flow's step effect.
        r !== ROUTES.sendPayment,
    );
    const names: string[] = [];
    screenRoutes.forEach((pathname) => {
      (emitScreenViewed as jest.Mock).mockClear();
      fireNavigate(pathname, "?url=https://example.org");
      const call = (emitScreenViewed as jest.Mock).mock.calls[0];
      expect(call).toBeDefined();
      names.push(call[0] as string);
    });
    names.forEach((n) => {
      expect(n).not.toMatch(/^loaded screen:/);
      expect(n).toMatch(/^[a-z0-9]+(_[a-z0-9]+)*$/);
    });
  });
});
