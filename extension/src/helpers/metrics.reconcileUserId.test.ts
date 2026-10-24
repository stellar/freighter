// config/jest/setupTests.tsx globally stubs "helpers/metrics" (and
// "popup/App") for every test file so unrelated suites don't have to deal
// with Amplitude/store internals. This file resolves to the same module
// (by absolute path) via the relative "./metrics" import below, so we must
// un-mock it here to exercise the real implementation.
jest.unmock("helpers/metrics");

import * as amplitude from "@amplitude/analytics-browser";
import * as Sentry from "@sentry/browser";

import { getAnalyticsUserId } from "@shared/api/internal";
import { METRICS_USER_ID } from "constants/localStorageTypes";
import {
  initAmplitude,
  reconcileAnalyticsUserId,
  resetAnalyticsUserIdReconciliation,
} from "./metrics";

jest.mock("@amplitude/analytics-browser", () => ({
  init: jest.fn(),
  setUserId: jest.fn(),
  identify: jest.fn(),
  Identify: jest.fn().mockImplementation(() => ({ set: jest.fn() })),
  setOptOut: jest.fn(),
  track: jest.fn(),
  flush: jest.fn(),
}));

jest.mock("@sentry/browser", () => ({
  setUser: jest.fn(),
}));

jest.mock("@shared/api/internal", () => ({
  getAnalyticsUserId: jest.fn(),
}));

jest.mock("popup/App", () => ({
  store: {
    getState: jest.fn().mockReturnValue({}),
    subscribe: jest.fn(),
  },
}));

jest.mock("helpers/experimentClient", () => ({
  initExperimentClient: jest.fn(),
}));

jest.mock("popup/ducks/settings", () => ({
  settingsDataSharingSelector: jest.fn().mockReturnValue(true),
  settingsNetworkDetailsSelector: jest.fn().mockReturnValue({
    network: "TESTNET",
  }),
}));

jest.mock("popup/ducks/accountServices", () => ({
  publicKeySelector: jest.fn().mockReturnValue(""),
}));

const mockGetAnalyticsUserId = getAnalyticsUserId as jest.Mock;

describe("reconcileAnalyticsUserId (canonical id)", () => {
  beforeAll(() => {
    // Flip the module-level `hasInitialized` flag once so the
    // `hasInitialized && AMPLITUDE_KEY` guard in reconcileAnalyticsUserId
    // can be exercised. AMPLITUDE_KEY is stubbed truthy in the jest env
    // (see config/jest/setupTests.tsx).
    initAmplitude();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Clear the once-per-session guard so each case starts from an
    // un-reconciled session (mirrors a fresh unlock).
    resetAnalyticsUserIdReconciliation();
  });

  it("overwrites a random persisted id with the auth id and re-identifies", async () => {
    localStorage.setItem(METRICS_USER_ID, "4873921"); // existing random id
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "a".repeat(64),
      confirmed: true,
    });

    await reconcileAnalyticsUserId();

    expect(localStorage.getItem(METRICS_USER_ID)).toBe("a".repeat(64));
    expect(amplitude.setUserId).toHaveBeenCalledWith("a".repeat(64));
    expect(Sentry.setUser).toHaveBeenCalledWith({ id: "a".repeat(64) });
  });

  it("is a no-op when the persisted id already equals the auth id", async () => {
    localStorage.setItem(METRICS_USER_ID, "a".repeat(64));
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "a".repeat(64),
      confirmed: true,
    });

    await reconcileAnalyticsUserId();

    expect(amplitude.setUserId).not.toHaveBeenCalled();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it("is a no-op when locked (null auth id) — keeps the bootstrap id", async () => {
    localStorage.setItem(METRICS_USER_ID, "4873921");
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: null,
      confirmed: false,
    });

    await reconcileAnalyticsUserId();

    expect(localStorage.getItem(METRICS_USER_ID)).toBe("4873921");
    expect(amplitude.setUserId).not.toHaveBeenCalled();
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it("never throws into callers when the background message fails", async () => {
    localStorage.setItem(METRICS_USER_ID, "4873921");
    mockGetAnalyticsUserId.mockRejectedValue(new Error("no background"));

    await expect(reconcileAnalyticsUserId()).resolves.toBeUndefined();
    expect(localStorage.getItem(METRICS_USER_ID)).toBe("4873921");
    expect(amplitude.setUserId).not.toHaveBeenCalled();
  });

  it("does NOT call Sentry.setUser when data-sharing is off, but still persists + re-identifies amplitude", async () => {
    const { settingsDataSharingSelector } = jest.requireMock(
      "popup/ducks/settings",
    ) as {
      settingsDataSharingSelector: jest.Mock;
    };
    settingsDataSharingSelector.mockReturnValue(false);

    localStorage.setItem(METRICS_USER_ID, "4873921");
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "b".repeat(64),
      confirmed: true,
    });

    await reconcileAnalyticsUserId();

    expect(localStorage.getItem(METRICS_USER_ID)).toBe("b".repeat(64));
    expect(amplitude.setUserId).toHaveBeenCalledWith("b".repeat(64));
    expect(Sentry.setUser).not.toHaveBeenCalled();
  });

  it("calls Sentry.setUser when data-sharing is on", async () => {
    const { settingsDataSharingSelector } = jest.requireMock(
      "popup/ducks/settings",
    ) as {
      settingsDataSharingSelector: jest.Mock;
    };
    settingsDataSharingSelector.mockReturnValue(true);

    localStorage.setItem(METRICS_USER_ID, "4873921");
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "c".repeat(64),
      confirmed: true,
    });

    await reconcileAnalyticsUserId();

    expect(Sentry.setUser).toHaveBeenCalledWith({ id: "c".repeat(64) });
  });

  it("reconciles once per session: skips the background round-trip on repeat calls", async () => {
    localStorage.setItem(METRICS_USER_ID, "4873921");
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "d".repeat(64),
      confirmed: true,
    });

    await reconcileAnalyticsUserId();
    await reconcileAnalyticsUserId();
    await reconcileAnalyticsUserId();

    // Only the first call hits the (expensive) background handler.
    expect(mockGetAnalyticsUserId).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(METRICS_USER_ID)).toBe("d".repeat(64));
  });

  it("does not latch the guard while locked, so a later unlock still reconciles", async () => {
    localStorage.setItem(METRICS_USER_ID, "4873921");
    // Locked: background returns a null auth id.
    mockGetAnalyticsUserId.mockResolvedValueOnce({
      analyticsUserId: null,
      confirmed: false,
    });
    await reconcileAnalyticsUserId();
    expect(localStorage.getItem(METRICS_USER_ID)).toBe("4873921");

    // Now unlocked: the auth id resolves and reconciliation proceeds.
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "e".repeat(64),
      confirmed: true,
    });
    await reconcileAnalyticsUserId();

    expect(mockGetAnalyticsUserId).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(METRICS_USER_ID)).toBe("e".repeat(64));
  });

  it("re-reconciles after the guard is reset on lock", async () => {
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "f".repeat(64),
      confirmed: true,
    });

    await reconcileAnalyticsUserId();
    expect(mockGetAnalyticsUserId).toHaveBeenCalledTimes(1);

    // Simulate a lock transition (SessionLockListener → SESSION_LOCKED).
    resetAnalyticsUserIdReconciliation();

    await reconcileAnalyticsUserId();
    expect(mockGetAnalyticsUserId).toHaveBeenCalledTimes(2);
  });

  it("adopts a provisional id but keeps asking until the server confirms one", async () => {
    // A secret-key-only wallet before its first link: the pinned key's
    // source id replaces the random bootstrap id.
    localStorage.setItem(METRICS_USER_ID, "4873921");
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "1".repeat(64),
      confirmed: false,
    });

    await reconcileAnalyticsUserId();
    await reconcileAnalyticsUserId();

    expect(mockGetAnalyticsUserId).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(METRICS_USER_ID)).toBe("1".repeat(64));

    // The first link resolved the key to an existing user: overwrite with
    // that user's id. No event is sent.
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "2".repeat(64),
      confirmed: true,
    });
    await reconcileAnalyticsUserId();
    await reconcileAnalyticsUserId();

    expect(mockGetAnalyticsUserId).toHaveBeenCalledTimes(3);
    expect(localStorage.getItem(METRICS_USER_ID)).toBe("2".repeat(64));
    expect(amplitude.setUserId).toHaveBeenLastCalledWith("2".repeat(64));
    expect(amplitude.track).not.toHaveBeenCalled();
  });

  it("ignores a provisional answer that arrives after another call confirmed", async () => {
    localStorage.setItem(METRICS_USER_ID, "4873921");
    let resolveStale: (value: unknown) => void = () => {};
    mockGetAnalyticsUserId
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveStale = resolve;
        }),
      )
      .mockResolvedValueOnce({
        analyticsUserId: "5".repeat(64),
        confirmed: true,
      });

    const stale = reconcileAnalyticsUserId();
    await reconcileAnalyticsUserId();
    resolveStale({ analyticsUserId: "4".repeat(64), confirmed: false });
    await stale;

    expect(localStorage.getItem(METRICS_USER_ID)).toBe("5".repeat(64));
    expect(amplitude.setUserId).toHaveBeenLastCalledWith("5".repeat(64));
    expect(Sentry.setUser).toHaveBeenLastCalledWith({ id: "5".repeat(64) });
  });

  it("drops an answer that arrives after the session was reset", async () => {
    localStorage.setItem(METRICS_USER_ID, "4873921");
    let resolveStale: (value: unknown) => void = () => {};
    mockGetAnalyticsUserId.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveStale = resolve;
      }),
    );

    const stale = reconcileAnalyticsUserId();
    // Locked while the call was in flight; the wallet may be replaced next.
    resetAnalyticsUserIdReconciliation();
    resolveStale({ analyticsUserId: "6".repeat(64), confirmed: true });
    await stale;

    expect(localStorage.getItem(METRICS_USER_ID)).toBe("4873921");
    expect(amplitude.setUserId).not.toHaveBeenCalled();

    // The session was not settled by the stale answer: the next call asks.
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "7".repeat(64),
      confirmed: true,
    });
    await reconcileAnalyticsUserId();
    expect(mockGetAnalyticsUserId).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem(METRICS_USER_ID)).toBe("7".repeat(64));
  });

  it("adopts the cached id while locked without settling the session", async () => {
    localStorage.setItem(METRICS_USER_ID, "4873921");
    mockGetAnalyticsUserId.mockResolvedValue({
      analyticsUserId: "3".repeat(64),
      confirmed: true,
    });

    await reconcileAnalyticsUserId({ settle: false });
    expect(localStorage.getItem(METRICS_USER_ID)).toBe("3".repeat(64));

    // The next (unlocked) call still asks: a wallet replaced from the lock
    // screen would have a different id.
    await reconcileAnalyticsUserId();
    expect(mockGetAnalyticsUserId).toHaveBeenCalledTimes(2);
  });
});
