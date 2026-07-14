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

import { getAccountIdHash } from "helpers/metrics";

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
