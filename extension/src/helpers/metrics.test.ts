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
  allAccountsSelector: jest.fn(() => []),
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
  initAmplitude,
  emitScreenViewed,
  emitMetric,
  getFundingRecord,
  getFundingRecordKey,
  getFundedAccountCount,
  saveFundingRecord,
  storeAccountMetricsData,
} from "helpers/metrics";
import { isSidebarMode } from "popup/helpers/isSidebarMode";
import browser from "webextension-polyfill";
import {
  publicKeySelector,
  allAccountsSelector,
} from "popup/ducks/accountServices";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { METRICS_DATA } from "constants/localStorageTypes";
import { AccountType } from "@shared/api/types";
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
    // account_type/is_hardware_account are resolved LIVE from the Redux
    // account list keyed on the active key — not from the localStorage cache.
    (allAccountsSelector as unknown as jest.Mock).mockReturnValue([
      { publicKey: PUBLIC_KEY, name: "Imported", imported: true },
    ]);
    // A deliberately *stale* metricsData cache (wrong type) — proves the
    // account_type resolution no longer trusts it.
    localStorage.setItem(
      METRICS_DATA,
      JSON.stringify({
        accountType: AccountType.FREIGHTER,
        hwExists: false,
        importedExists: true,
      }),
    );
  });

  it("stamps schema_version '4'", () => {
    expect(buildCommonContext({} as never).schema_version).toBe("4");
  });

  it("emits the reshaped event-level bucket", () => {
    const ctx = buildCommonContext({} as never);
    expect(ctx).toMatchObject({
      network: "TESTNET",
      account_type: "imported_secret_key",
      is_hardware_account: false,
      account_id_hash:
        "f56f6f2c6cf1b9388e3495dfab96f0c55ec5d217f481b2ae45d11b46145c44ef",
    });
    expect(ctx.surface).toBeDefined();
  });

  it("does not emit account_funded", () => {
    expect(buildCommonContext({} as never)).not.toHaveProperty(
      "account_funded",
    );
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

  it("omits all account fields when there is no active key (pre-unlock)", () => {
    (publicKeySelector as unknown as jest.Mock).mockReturnValue("");
    const ctx = buildCommonContext({} as never);
    expect(ctx).not.toHaveProperty("account_id_hash");
    expect(ctx).not.toHaveProperty("account_type");
    expect(ctx).not.toHaveProperty("is_hardware_account");
    // non-account context is still present
    expect(ctx).toMatchObject({ schema_version: "4", network: "TESTNET" });
    expect(ctx.surface).toBeDefined();
  });

  it("marks hardware active account", () => {
    (allAccountsSelector as unknown as jest.Mock).mockReturnValue([
      {
        publicKey: PUBLIC_KEY,
        name: "Ledger",
        imported: false,
        hardwareWalletType: "Ledger",
      },
    ]);
    expect(buildCommonContext({} as never)).toMatchObject({
      account_type: "hardware",
      is_hardware_account: true,
    });
  });

  it("resolves account_type from the live account list, ignoring a stale metricsData cache", () => {
    // The cache (set in beforeEach) says FREIGHTER, but the active account is
    // resolvable as an imported secret-key account — the live list must win.
    // This is the regression guard for the post-import mislabeling bug: an
    // account-mutation thunk switches the active account without refreshing
    // metricsData, and events emitted before the next full reload must still
    // report the correct type.
    const ctx = buildCommonContext({} as never);
    expect(ctx).toMatchObject({
      account_type: "imported_secret_key",
      is_hardware_account: false,
    });
  });

  it("omits account_type/is_hardware_account when the active key is not resolvable in allAccounts", () => {
    // Auth-store update race: the active public key is set, but the account
    // list hasn't caught up (or doesn't contain it). Fail safe by OMITTING the
    // type fields rather than guessing "freighter" — parity with mobile.
    (allAccountsSelector as unknown as jest.Mock).mockReturnValue([
      { publicKey: "GSOMEOTHERKEY", name: "Other", imported: false },
    ]);
    const ctx = buildCommonContext({} as never);
    expect(ctx).not.toHaveProperty("account_type");
    expect(ctx).not.toHaveProperty("is_hardware_account");
    // The active-key-derived fields are still emitted.
    expect(ctx).toHaveProperty("account_id_hash");
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
      funded_account_count: 0,
    });
  });

  it("reports zero/false for an empty account list", () => {
    expect(deriveIdentifyTraits([])).toEqual({
      wallet_count: 0,
      has_hardware_wallet: false,
      has_imported_account: false,
      funded_account_count: 0,
    });
  });

  it("does not cache the fingerprint when called before Amplitude init, so an identical call after init still sends Identify", async () => {
    // syncIdentifyTraits guards on module-level `hasInitialized`/`AMPLITUDE_KEY`
    // state, so isolate the module here to get a fresh, uninitialized instance
    // independent of init having already run in another describe block.
    const accounts = [
      { publicKey: "G1", hardwareWalletType: "ledger", imported: false },
    ] as never;

    let mod: typeof import("helpers/metrics");
    jest.isolateModules(() => {
      mod = require("helpers/metrics");
    });
    const identify = (
      require("@amplitude/analytics-browser") as typeof amplitude
    ).identify as jest.Mock;
    identify.mockClear();

    // Pre-init call: the init/consent guard short-circuits before any Identify
    // is sent. The fingerprint must NOT be cached here (the hardening fix).
    mod!.syncIdentifyTraits(accounts);
    expect(identify).not.toHaveBeenCalled();

    await mod!.initAmplitude();
    // initAmplitude sends its own Identify (bundle id property); clear that
    // call so it doesn't get confused with the assertion below.
    identify.mockClear();

    // Same accounts as the pre-init call: if the fingerprint had been cached
    // pre-init, this would be a no-op dirty-check short-circuit and Identify
    // would never fire. Post-fix, it must fire because nothing was cached.
    mod!.syncIdentifyTraits(accounts);
    expect(identify).toHaveBeenCalled();
  });
});

describe("funding records", () => {
  const KEY_A = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
  const KEY_B = "GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB";
  const KEY_C = "GCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC";

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it("keys a record by network and account_id_hash, without the G address", () => {
    saveFundingRecord("PUBLIC", KEY_A, { status: "unfunded", funded: false });
    const raw = localStorage.getItem(METRICS_DATA)!;
    expect(raw).not.toContain(KEY_A);
    expect(raw).not.toContain(KEY_A.slice(0, 10));
    expect(JSON.parse(raw).fundingRecords).toEqual({
      [`PUBLIC:${getAccountIdHash(KEY_A)}`]: {
        status: "unfunded",
        funded: false,
      },
    });
    expect(getFundingRecordKey("PUBLIC", KEY_A)).toBe(
      `PUBLIC:${getAccountIdHash(KEY_A)}`,
    );
    expect(getFundingRecord("PUBLIC", KEY_A)).toEqual({
      status: "unfunded",
      funded: false,
    });
    expect(getFundingRecord("TESTNET", KEY_A)).toBeUndefined();
  });

  it("keeps the other metricsData fields when it saves a record", () => {
    localStorage.setItem(
      METRICS_DATA,
      JSON.stringify({ accountType: AccountType.HW, hwExists: true }),
    );
    saveFundingRecord("PUBLIC", KEY_A, { funded: true });
    expect(JSON.parse(localStorage.getItem(METRICS_DATA)!)).toMatchObject({
      accountType: AccountType.HW,
      hwExists: true,
    });
  });

  it("deletes the legacy account.first_funded fields on the first write after the update (VT-17)", () => {
    localStorage.setItem(
      METRICS_DATA,
      JSON.stringify({
        accountType: AccountType.FREIGHTER,
        hwExists: false,
        importedExists: false,
        hwFunded: true,
        importedFunded: false,
        freighterFunded: true,
        unfundedFreighterAccounts: ["GAAA…AWHF"],
      }),
    );
    storeAccountMetricsData(KEY_A, [
      { publicKey: KEY_A, name: "A", imported: false },
    ] as never);
    const stored = JSON.parse(localStorage.getItem(METRICS_DATA)!);
    expect(stored).not.toHaveProperty("unfundedFreighterAccounts");
    expect(stored).not.toHaveProperty("freighterFunded");
    expect(stored).not.toHaveProperty("hwFunded");
    expect(stored).not.toHaveProperty("importedFunded");
  });

  it("counts own accounts with funded: true on PUBLIC only (VT-24, VT-28)", () => {
    const accounts = [
      { publicKey: KEY_A },
      { publicKey: KEY_B },
      { publicKey: KEY_C },
    ] as never;
    const records = {
      [getFundingRecordKey("PUBLIC", KEY_A)]: { funded: true },
      [getFundingRecordKey("PUBLIC", KEY_B)]: {
        status: "funded" as const,
        funded: false,
      },
      // A testnet record does not count.
      [getFundingRecordKey("TESTNET", KEY_C)]: { funded: true },
    };
    expect(getFundedAccountCount(accounts, records)).toBe(1);
    // A removed account does not count.
    expect(
      getFundedAccountCount([{ publicKey: KEY_B }] as never, records),
    ).toBe(0);
  });

  it("adds funded_account_count to the Identify traits", () => {
    const accounts = [{ publicKey: KEY_A }, { publicKey: KEY_B }] as never;
    expect(
      deriveIdentifyTraits(accounts, {
        [getFundingRecordKey("PUBLIC", KEY_A)]: { funded: true },
        [getFundingRecordKey("PUBLIC", KEY_B)]: { funded: true },
      }).funded_account_count,
    ).toBe(2);
  });
});

describe("syncIdentifyTraits funded_account_count (VT-25, VT-26)", () => {
  const KEY_A = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";

  it("sends a changed count one time, and an unchanged count never", async () => {
    let mod: typeof import("helpers/metrics");
    let settingsMod: { settingsDataSharingSelector: jest.Mock };
    let amp: typeof amplitude;
    jest.isolateModules(() => {
      mod = require("helpers/metrics");
      settingsMod = require("popup/ducks/settings");
      amp = require("@amplitude/analytics-browser");
    });
    localStorage.clear();
    const accounts = [{ publicKey: KEY_A }] as never;
    settingsMod!.settingsDataSharingSelector.mockReturnValue(true);
    await mod!.initAmplitude();
    const identify = amp!.identify as jest.Mock;
    const identifySet = jest.fn();
    (amp!.Identify as unknown as jest.Mock).mockImplementation(() => ({
      set: identifySet,
    }));

    identify.mockClear();
    mod!.syncIdentifyTraits(accounts);
    expect(identify).toHaveBeenCalledTimes(1);
    expect(identifySet).toHaveBeenCalledWith("funded_account_count", 0);

    // Unchanged: no new Identify.
    mod!.syncIdentifyTraits(accounts);
    expect(identify).toHaveBeenCalledTimes(1);

    // Changed: one Identify with the new count.
    mod!.saveFundingRecord("PUBLIC", KEY_A, { funded: true });
    identifySet.mockClear();
    mod!.syncIdentifyTraits(accounts);
    expect(identify).toHaveBeenCalledTimes(2);
    expect(identifySet).toHaveBeenCalledWith("funded_account_count", 1);

    // Analytics disabled: no Identify. Enabled again: the next sync sends
    // the current count.
    mod!.saveFundingRecord("PUBLIC", KEY_A, { funded: false });
    settingsMod!.settingsDataSharingSelector.mockReturnValue(false);
    mod!.syncIdentifyTraits(accounts);
    expect(identify).toHaveBeenCalledTimes(2);
    settingsMod!.settingsDataSharingSelector.mockReturnValue(true);
    identifySet.mockClear();
    mod!.syncIdentifyTraits(accounts);
    expect(identify).toHaveBeenCalledTimes(3);
    expect(identifySet).toHaveBeenCalledWith("funded_account_count", 0);
  });
});

describe("emitMetric return value", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await initAmplitude();
  });

  it("returns true when it sends the event", () => {
    const { settingsDataSharingSelector } = jest.requireMock(
      "popup/ducks/settings",
    );
    settingsDataSharingSelector.mockReturnValue(true);
    expect(emitMetric(METRIC_NAMES.accountFunded)).toBe(true);
    expect(amplitude.track).toHaveBeenCalledWith(
      "account.funded",
      expect.any(Object),
    );
  });

  it("returns false when data sharing is off", () => {
    const { settingsDataSharingSelector } = jest.requireMock(
      "popup/ducks/settings",
    );
    settingsDataSharingSelector.mockReturnValue(false);
    expect(emitMetric(METRIC_NAMES.accountFunded)).toBe(false);
    expect(amplitude.track).not.toHaveBeenCalled();
    settingsDataSharingSelector.mockReturnValue(true);
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
    (publicKeySelector as unknown as jest.Mock).mockReturnValue(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
    );
    const ctx = buildCommonContext({} as never);
    const serialized = JSON.stringify(ctx);
    expect(serialized).not.toContain("GAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(ctx).not.toHaveProperty("publicKey");
  });
});

describe("consent hydration (startup)", () => {
  it("defers app.opened while data-sharing is disallowed, then emits exactly once when it becomes allowed", async () => {
    let mod: typeof import("helpers/metrics");
    let store: { subscribe: jest.Mock };
    let settingsMod: { settingsDataSharingSelector: jest.Mock };
    let track: jest.Mock;
    jest.isolateModules(() => {
      mod = require("helpers/metrics");
      store = require("popup/App").store;
      settingsMod = require("popup/ducks/settings");
      track = (require("@amplitude/analytics-browser") as typeof amplitude)
        .track as jest.Mock;
    });

    // Persisted preference hasn't hydrated yet → disallowed at init.
    settingsMod!.settingsDataSharingSelector.mockReturnValue(false);
    track!.mockClear();
    store!.subscribe.mockClear();

    await mod!.initAmplitude();

    // Nothing emitted while consent is disallowed.
    expect(
      track!.mock.calls.find((c) => c[0] === "app.opened"),
    ).toBeUndefined();

    // Consent now resolves to allowed; the store subscription fires.
    settingsMod!.settingsDataSharingSelector.mockReturnValue(true);
    const subCb =
      store!.subscribe.mock.calls[store!.subscribe.mock.calls.length - 1][0];
    subCb();

    expect(track!.mock.calls.filter((c) => c[0] === "app.opened")).toHaveLength(
      1,
    );

    // Idempotent: further store changes don't re-emit.
    subCb();
    expect(track!.mock.calls.filter((c) => c[0] === "app.opened")).toHaveLength(
      1,
    );
  });

  it("does not send or cache Identify while data-sharing is disallowed, then sends once allowed", async () => {
    let mod: typeof import("helpers/metrics");
    let settingsMod: { settingsDataSharingSelector: jest.Mock };
    let identify: jest.Mock;
    jest.isolateModules(() => {
      mod = require("helpers/metrics");
      settingsMod = require("popup/ducks/settings");
      identify = (require("@amplitude/analytics-browser") as typeof amplitude)
        .identify as jest.Mock;
    });
    const accounts = [
      { publicKey: "G1", hardwareWalletType: "", imported: false },
    ] as never;

    settingsMod!.settingsDataSharingSelector.mockReturnValue(true);
    await mod!.initAmplitude();
    identify!.mockClear();

    // Opted out: no Identify, and (critically) the fingerprint is NOT cached.
    settingsMod!.settingsDataSharingSelector.mockReturnValue(false);
    mod!.syncIdentifyTraits(accounts);
    expect(identify!).not.toHaveBeenCalled();

    // Opt in: the same traits must now reach Amplitude (proving nothing was
    // cached while opted out — otherwise the dirty-check would suppress it).
    settingsMod!.settingsDataSharingSelector.mockReturnValue(true);
    mod!.syncIdentifyTraits(accounts);
    expect(identify!).toHaveBeenCalled();
  });

  it("does not cache the fingerprint if identify() throws, so the next call retries", async () => {
    let mod: typeof import("helpers/metrics");
    let settingsMod: { settingsDataSharingSelector: jest.Mock };
    let identify: jest.Mock;
    jest.isolateModules(() => {
      mod = require("helpers/metrics");
      settingsMod = require("popup/ducks/settings");
      identify = (require("@amplitude/analytics-browser") as typeof amplitude)
        .identify as jest.Mock;
    });
    const accounts = [
      { publicKey: "G1", hardwareWalletType: "", imported: false },
    ] as never;

    settingsMod!.settingsDataSharingSelector.mockReturnValue(true);
    await mod!.initAmplitude();
    identify!.mockClear();

    // First sync throws mid-dispatch — the fingerprint must NOT be cached.
    identify!.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    expect(() => mod!.syncIdentifyTraits(accounts)).not.toThrow();
    expect(identify!).toHaveBeenCalledTimes(1);

    // Same traits again: because the throw left nothing cached, the dirty-check
    // does not short-circuit and the Identify retries.
    mod!.syncIdentifyTraits(accounts);
    expect(identify!).toHaveBeenCalledTimes(2);
  });
});

describe("emitScreenViewed (screen.viewed consolidation)", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    // emitMetric only reaches amplitude.track once the SDK has initialized.
    await initAmplitude();
    (amplitude.track as jest.Mock).mockClear();
  });

  it("exposes the canonical screenViewed event name", () => {
    expect(METRIC_NAMES.screenViewed).toBe("screen.viewed");
  });

  it("emits the single canonical event with screen_name, flow, and surface", () => {
    emitScreenViewed("send_payment_amount", { flow: "send" });

    expect(amplitude.track).toHaveBeenCalledTimes(1);
    const [name, body] = (amplitude.track as jest.Mock).mock.calls[0];
    expect(name).toBe("screen.viewed");
    expect(body).toMatchObject({
      screen_name: "send_payment_amount",
      flow: "send",
      schema_version: "4",
    });
    // surface comes from the Slice-A common context (getSurface()).
    expect(body.surface).toBeDefined();
  });

  it("passes through preserved extra props (domain / operations) and step", () => {
    emitScreenViewed("sign_transaction", {
      flow: "signing",
      domain: "example",
      subdomain: "example.org",
      number_of_operations: 3,
      operationTypes: ["payment"],
    });

    const [, body] = (amplitude.track as jest.Mock).mock.calls[0];
    expect(body).toMatchObject({
      screen_name: "sign_transaction",
      flow: "signing",
      domain: "example",
      subdomain: "example.org",
      number_of_operations: 3,
      operationTypes: ["payment"],
    });
  });

  it("emits a step property for completion/success screens", () => {
    emitScreenViewed("recover_account_success", {
      flow: "onboarding",
      step: "success",
    });

    const [, body] = (amplitude.track as jest.Mock).mock.calls[0];
    expect(body).toMatchObject({
      screen_name: "recover_account_success",
      step: "success",
    });
  });

  it("omits flow and step when not provided", () => {
    emitScreenViewed("account");

    const [, body] = (amplitude.track as jest.Mock).mock.calls[0];
    expect(body.screen_name).toBe("account");
    expect(body).not.toHaveProperty("flow");
    expect(body).not.toHaveProperty("step");
  });

  it("never emits a legacy 'loaded screen:' event name", () => {
    emitScreenViewed("welcome", { flow: "onboarding" });

    const names = (amplitude.track as jest.Mock).mock.calls.map((c) => c[0]);
    expect(names).not.toHaveLength(0);
    expect(names.every((n: string) => !n.startsWith("loaded screen:"))).toBe(
      true,
    );
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
      schema_version: "4",
    });
    expect(call![1].surface).toBeDefined();
  });
});

describe("color_scheme common property (#18)", () => {
  afterEach(() => {
    document.body.className = "";
  });

  it("stamps the rendered scheme from the body class", () => {
    document.body.className = "sds-theme-light";
    expect(buildCommonContext({} as never).color_scheme).toBe("light");

    document.body.className = "sds-theme-dark";
    expect(buildCommonContext({} as never).color_scheme).toBe("dark");
  });

  it("defaults to light when no theme class is applied yet", () => {
    document.body.className = "";
    expect(buildCommonContext({} as never).color_scheme).toBe("light");
  });
});
