// config/jest/setupTests.tsx globally auto-mocks "helpers/metrics" (so
// unrelated component/reducer tests don't have to deal with Amplitude etc.).
// This file tests the real implementation, so opt back out of that stub.
jest.unmock("helpers/metrics");

// Shared mocks — metrics.ts couples to the store, the SDK, and selectors at
// module load, so isolate all of them here. Individual tests set behavior.
jest.mock("@amplitude/analytics-browser");
jest.mock("popup/App", () => ({
  store: { getState: jest.fn(() => ({})), subscribe: jest.fn() },
}));
jest.mock("popup/ducks/accountServices", () => ({
  publicKeySelector: jest.fn(),
}));
jest.mock("popup/ducks/settings", () => ({
  settingsDataSharingSelector: jest.fn(() => true),
  settingsNetworkDetailsSelector: jest.fn(() => ({ network: "TESTNET" })),
}));
jest.mock("helpers/experimentClient", () => ({
  initExperimentClient: jest.fn(),
}));
jest.mock("constants/env", () => ({
  AMPLITUDE_KEY: "test-key",
  APP_VERSION: "9.9.9",
  METRICS_PLATFORM: "WEB",
}));
jest.mock("popup/helpers/isSidebarMode", () => ({
  isSidebarMode: jest.fn(() => false),
}));
jest.mock("webextension-polyfill", () => ({
  tabs: { getCurrent: jest.fn() },
  runtime: { getManifest: jest.fn(() => ({ version: "9.9.9" })) },
}));

import * as amplitude from "@amplitude/analytics-browser";
import {
  getAccountIdHash,
  getSurface,
  resolveSurface,
  buildCommonContext,
} from "helpers/metrics";
import { isSidebarMode } from "popup/helpers/isSidebarMode";
import browser from "webextension-polyfill";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { METRICS_DATA } from "constants/localStorageTypes";
import { AccountType } from "@shared/api/types";

describe("getAccountIdHash", () => {
  const PUBLIC_KEY = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
  const EXPECTED =
    "f56f6f2c6cf1b9388e3495dfab96f0c55ec5d217f481b2ae45d11b46145c44ef";

  it("returns the lowercase hex SHA-256 of the G-address (cross-platform vector)", () => {
    expect(getAccountIdHash(PUBLIC_KEY)).toBe(EXPECTED);
  });

  it("is deterministic and 64 hex chars", () => {
    const h = getAccountIdHash(PUBLIC_KEY);
    expect(h).toBe(getAccountIdHash(PUBLIC_KEY));
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("differs for different keys", () => {
    expect(getAccountIdHash("GABC")).not.toBe(getAccountIdHash("GXYZ"));
  });
});

describe("getSurface", () => {
  beforeEach(() => jest.clearAllMocks());

  it("returns 'sidebar' when in sidebar mode", async () => {
    (isSidebarMode as jest.Mock).mockReturnValue(true);
    await resolveSurface();
    expect(getSurface()).toBe("sidebar");
  });

  it("returns 'fullpage' when opened in a tab", async () => {
    (isSidebarMode as jest.Mock).mockReturnValue(false);
    (browser.tabs.getCurrent as jest.Mock).mockResolvedValue({ id: 1 });
    await resolveSurface();
    expect(getSurface()).toBe("fullpage");
  });

  it("returns 'popup' when not a tab", async () => {
    (isSidebarMode as jest.Mock).mockReturnValue(false);
    (browser.tabs.getCurrent as jest.Mock).mockResolvedValue(undefined);
    await resolveSurface();
    expect(getSurface()).toBe("popup");
  });

  it("defaults to 'popup' if getCurrent throws", async () => {
    (isSidebarMode as jest.Mock).mockReturnValue(false);
    (browser.tabs.getCurrent as jest.Mock).mockRejectedValue(new Error("x"));
    await resolveSurface();
    expect(getSurface()).toBe("popup");
  });
});

describe("buildCommonContext (four-bucket property model)", () => {
  const PUBLIC_KEY = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    (settingsNetworkDetailsSelector as unknown as jest.Mock).mockReturnValue({
      network: "TESTNET",
    });
    (publicKeySelector as unknown as jest.Mock).mockReturnValue(PUBLIC_KEY);
    localStorage.setItem(
      METRICS_DATA,
      JSON.stringify({
        accountType: AccountType.IMPORTED,
        hwExists: false,
        importedExists: true,
        hwFunded: false,
        importedFunded: true,
        freighterFunded: false,
        unfundedFreighterAccounts: [],
      }),
    );
  });

  it("stamps schema_version '2'", () => {
    expect(buildCommonContext({} as never).schema_version).toBe("2");
  });

  it("emits the reshaped event-level bucket", () => {
    const ctx = buildCommonContext({} as never);
    expect(ctx).toMatchObject({
      network: "TESTNET",
      account_type: "imported_secret_key",
      account_funded: true,
      is_hardware_account: false,
      account_id_hash:
        "f56f6f2c6cf1b9388e3495dfab96f0c55ec5d217f481b2ae45d11b46145c44ef",
    });
    expect(ctx.surface).toBeDefined();
  });

  it("drops SDK-supplied and legacy fields", () => {
    const ctx = buildCommonContext({} as never);
    expect(ctx).not.toHaveProperty("platform");
    expect(ctx).not.toHaveProperty("platformVersion");
    expect(ctx).not.toHaveProperty("appVersion");
    expect(ctx).not.toHaveProperty("publicKey");
    expect(ctx).not.toHaveProperty("connectionType");
    expect(ctx).not.toHaveProperty("effectiveType");
  });

  it("omits account_id_hash when there is no active key (pre-unlock)", () => {
    (publicKeySelector as unknown as jest.Mock).mockReturnValue("");
    expect(buildCommonContext({} as never)).not.toHaveProperty(
      "account_id_hash",
    );
  });

  it("marks hardware active account", () => {
    localStorage.setItem(
      METRICS_DATA,
      JSON.stringify({
        accountType: AccountType.HW,
        hwExists: true,
        importedExists: false,
        hwFunded: true,
        importedFunded: false,
        freighterFunded: false,
        unfundedFreighterAccounts: [],
      }),
    );
    expect(buildCommonContext({} as never)).toMatchObject({
      account_type: "hardware",
      is_hardware_account: true,
      account_funded: true,
    });
  });
});

describe("initAmplitude SDK config", () => {
  beforeEach(() => jest.clearAllMocks());

  it("passes appVersion so the SDK attaches app_version, with autocapture off", async () => {
    // initAmplitude guards on a module-level `hasInitialized` flag, so isolate
    // the module here to ensure this test is independent of init having
    // already run in another describe block.
    let mod: typeof import("helpers/metrics");
    jest.isolateModules(() => {
      mod = require("helpers/metrics");
    });
    await mod!.initAmplitude();
    expect(
      (require("@amplitude/analytics-browser") as typeof amplitude).init,
    ).toHaveBeenCalledWith(
      "test-key",
      undefined,
      expect.objectContaining({ appVersion: "9.9.9", autocapture: false }),
    );
  });
});
