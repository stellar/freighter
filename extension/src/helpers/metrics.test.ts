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
  deriveIdentifyTraits,
  storeBalanceMetricData,
  initAmplitude,
} from "helpers/metrics";
import { isSidebarMode } from "popup/helpers/isSidebarMode";
import browser from "webextension-polyfill";
import { publicKeySelector } from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { METRICS_DATA } from "constants/localStorageTypes";
import { AccountType } from "@shared/api/types";
import { truncatedPublicKey } from "helpers/stellar";
import { METRIC_NAMES } from "popup/constants/metricsNames";

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

describe("deriveIdentifyTraits", () => {
  it("counts accounts and detects hardware/imported presence", () => {
    const accounts = [
      { publicKey: "G1", hardwareWalletType: "ledger", imported: false },
      { publicKey: "G2", hardwareWalletType: "", imported: true },
      { publicKey: "G3", hardwareWalletType: "", imported: false },
    ] as never;
    expect(deriveIdentifyTraits(accounts)).toEqual({
      wallet_count: 3,
      has_hardware_wallet: true,
      has_imported_account: true,
    });
  });

  it("reports zero/false for an empty account list", () => {
    expect(deriveIdentifyTraits([])).toEqual({
      wallet_count: 0,
      has_hardware_wallet: false,
      has_imported_account: false,
    });
  });
});

describe("storeBalanceMetricData (privacy)", () => {
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
        accountType: AccountType.FREIGHTER,
        hwExists: false,
        importedExists: false,
        hwFunded: false,
        importedFunded: false,
        freighterFunded: false,
        unfundedFreighterAccounts: [truncatedPublicKey(PUBLIC_KEY)],
      }),
    );
  });

  it("emits freighterAccountFunded with account_id_hash and never a raw/truncated publicKey", () => {
    // Ensure emitMetric's `!hasInitialized` guard doesn't short-circuit before
    // the amplitude.track call this test inspects.
    initAmplitude();
    storeBalanceMetricData(PUBLIC_KEY, true);

    expect(amplitude.track).toHaveBeenCalledWith(
      METRIC_NAMES.freighterAccountFunded,
      expect.objectContaining({
        account_id_hash: getAccountIdHash(PUBLIC_KEY),
      }),
    );

    const [, body] = (amplitude.track as jest.Mock).mock.calls[0];
    expect(body).not.toHaveProperty("publicKey");
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

describe("privacy guard", () => {
  it("buildCommonContext never includes a raw or truncated public key", () => {
    (publicKeySelector as jest.Mock).mockReturnValue(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    );
    const ctx = buildCommonContext({} as never);
    const serialized = JSON.stringify(ctx);
    expect(serialized).not.toContain("GAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(ctx).not.toHaveProperty("publicKey");
  });
});

describe("app.opened", () => {
  it("exposes the appOpened event name", () => {
    expect(METRIC_NAMES.appOpened).toBe("app.opened");
  });

  it("emits app.opened once during init with the connectivity snapshot", async () => {
    (Object.defineProperty as typeof Object.defineProperty)(
      global.navigator,
      "connection",
      { value: { type: "wifi", effectiveType: "4g" }, configurable: true },
    );
    let mod: typeof import("helpers/metrics");
    jest.isolateModules(() => {
      mod = require("helpers/metrics");
    });
    const track = (
      require("@amplitude/analytics-browser") as typeof import("@amplitude/analytics-browser")
    ).track as jest.Mock;
    track.mockClear();

    await mod!.initAmplitude();

    const call = track.mock.calls.find((c) => c[0] === "app.opened");
    expect(call).toBeDefined();
    expect(call![1]).toMatchObject({
      connection_type: "wifi",
      effective_type: "4g",
      schema_version: "2",
    });
    expect(call![1].surface).toBeDefined();
  });
});
