import { DEFAULT_CACHE_STALE_MS, isCacheValid } from "helpers/request";

describe("isCacheValid", () => {
  const NOW = 1_800_000_000_000;

  beforeEach(() => {
    jest.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("defaults to the 3-minute window when no override is given", () => {
    expect(DEFAULT_CACHE_STALE_MS).toBe(180000);
    expect(isCacheValid({ updatedAt: NOW - DEFAULT_CACHE_STALE_MS + 1 })).toBe(
      true,
    );
    expect(isCacheValid({ updatedAt: NOW - DEFAULT_CACHE_STALE_MS })).toBe(
      false,
    );
  });

  it("honours a caller-supplied staleness window", () => {
    const fiveMinutes = 5 * 60 * 1000;
    // Stale under the default, still fresh under the price-history window.
    const updatedAt = NOW - DEFAULT_CACHE_STALE_MS - 1;
    expect(isCacheValid({ updatedAt })).toBe(false);
    expect(isCacheValid({ updatedAt }, fiveMinutes)).toBe(true);
    expect(isCacheValid({ updatedAt: NOW - fiveMinutes }, fiveMinutes)).toBe(
      false,
    );
  });

  it("treats a missing entry as invalid", () => {
    expect(isCacheValid(undefined)).toBe(false);
    expect(isCacheValid(undefined, 5 * 60 * 1000)).toBe(false);
  });
});
