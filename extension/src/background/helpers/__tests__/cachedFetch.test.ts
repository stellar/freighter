import { cachedFetch } from "../cachedFetch";

// Mock dataStorageAccess
const mockStorage: { [key: string]: unknown } = {};

jest.mock("../dataStorageAccess", () => ({
  dataStorageAccess: () => ({
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage[key])),
    setItem: jest.fn((key: string, value: unknown) => {
      mockStorage[key] = value;
      return Promise.resolve();
    }),
  }),
  browserLocalStorage: {},
}));

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("cachedFetch", () => {
  const testUrl = "https://api.example.com/data";
  const storageKey = "test_cache";
  const validResponse = {
    _embedded: {
      records: [{ address: "G123", tags: ["memo-required"] }],
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Clear mock storage
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  it("should fetch and cache data when cache is stale", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(validResponse),
    });

    // Set stale cache date (8 days ago)
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    mockStorage[`${storageKey}_date`] = eightDaysAgo.toString();

    const result = await cachedFetch(testUrl, storageKey);

    expect(mockFetch).toHaveBeenCalledWith(testUrl);
    expect(result).toEqual(validResponse);
  });

  it("should not cache HTTP error responses", async () => {
    const existingCache = { _embedded: { records: [{ address: "existing" }] } };
    mockStorage[storageKey] = existingCache;

    // Set stale cache date
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    mockStorage[`${storageKey}_date`] = eightDaysAgo.toString();

    // Return HTTP 500 error
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Internal Server Error" }),
    });

    const result = await cachedFetch(testUrl, storageKey);

    expect(mockFetch).toHaveBeenCalledWith(testUrl);
    // Should return existing cache, not the error response
    expect(result).toEqual(existingCache);
  });

  it("should not cache rate limit (429) responses", async () => {
    const existingCache = { _embedded: { records: [{ address: "existing" }] } };
    mockStorage[storageKey] = existingCache;

    // Set stale cache date
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    mockStorage[`${storageKey}_date`] = eightDaysAgo.toString();

    // Return HTTP 429 rate limit
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: () => Promise.resolve({ error: "Too Many Requests" }),
    });

    const result = await cachedFetch(testUrl, storageKey);

    expect(mockFetch).toHaveBeenCalledWith(testUrl);
    // Should return existing cache
    expect(result).toEqual(existingCache);
  });

  it("should preserve existing cache on network error", async () => {
    const existingCache = { _embedded: { records: [{ address: "existing" }] } };
    mockStorage[storageKey] = existingCache;

    // Set stale cache date
    const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
    mockStorage[`${storageKey}_date`] = eightDaysAgo.toString();

    // Simulate network failure
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const result = await cachedFetch(testUrl, storageKey);

    expect(mockFetch).toHaveBeenCalledWith(testUrl);
    // Should return existing cache
    expect(result).toEqual(existingCache);
  });

  it("should return cached data without fetching when cache is fresh", async () => {
    const cachedData = { _embedded: { records: [{ address: "cached" }] } };
    mockStorage[storageKey] = cachedData;

    // Set fresh cache date (1 day ago)
    const oneDayAgo = Date.now() - 1 * 24 * 60 * 60 * 1000;
    mockStorage[`${storageKey}_date`] = oneDayAgo.toString();

    const result = await cachedFetch(testUrl, storageKey);

    // Should not fetch when cache is fresh
    expect(mockFetch).not.toHaveBeenCalled();
    expect(result).toEqual(cachedData);
  });
});
