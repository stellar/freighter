import { renderHook, waitFor, act } from "@testing-library/react";
import { DiscoverData } from "@shared/api/types";
import * as ApiInternal from "@shared/api/internal";

import { useDiscoverData } from "../useDiscoverData";

const blend = {
  description: "A lending protocol",
  name: "Blend",
  iconUrl: "https://example.com/blend.png",
  websiteUrl: "https://blend.capital",
  tags: ["Lending"],
  isBlacklisted: false,
  isTrending: true,
};
const soroswap = {
  description: "An exchange",
  name: "Soroswap",
  iconUrl: "https://example.com/soroswap.png",
  websiteUrl: "https://soroswap.finance",
  tags: ["Exchange"],
  isBlacklisted: false,
  isTrending: false,
};
const scam = {
  description: "Blacklisted",
  name: "Scam",
  iconUrl: "https://example.com/scam.png",
  websiteUrl: "https://scam.example",
  tags: ["Scam"],
  isBlacklisted: true,
  isTrending: true,
};

const mockProtocols: DiscoverData = [blend, soroswap, scam];

describe("useDiscoverData", () => {
  beforeEach(() => {
    jest.spyOn(ApiInternal, "getDiscoverData").mockResolvedValue(mockProtocols);
    jest.spyOn(ApiInternal, "getRecentProtocols").mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("starts in a loading state and transitions to loaded data", async () => {
    const { result } = renderHook(() => useDiscoverData());

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.dappsItems.map((p) => p.name)).toEqual([
      "Blend",
      "Soroswap",
    ]);
  });

  it("excludes blacklisted protocols from every derived list", async () => {
    jest
      .spyOn(ApiInternal, "getRecentProtocols")
      .mockResolvedValue([
        { websiteUrl: "https://scam.example", lastAccessed: Date.now() },
      ]);

    const { result } = renderHook(() => useDiscoverData());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.trendingItems.map((p) => p.name)).toEqual(["Blend"]);
    expect(result.current.recentItems).toEqual([]);
    expect(result.current.dappsItems.map((p) => p.name)).not.toContain("Scam");
  });

  it("returns derived lists with stable identity between renders", async () => {
    const { result, rerender } = renderHook(() => useDiscoverData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const first = {
      trending: result.current.trendingItems,
      recent: result.current.recentItems,
      dapps: result.current.dappsItems,
    };

    rerender();

    expect(result.current.trendingItems).toBe(first.trending);
    expect(result.current.recentItems).toBe(first.recent);
    expect(result.current.dappsItems).toBe(first.dapps);
  });

  it("enriches recent entries with full protocol data and preserves order", async () => {
    jest.spyOn(ApiInternal, "getRecentProtocols").mockResolvedValue([
      { websiteUrl: "https://soroswap.finance", lastAccessed: 2 },
      { websiteUrl: "https://blend.capital", lastAccessed: 1 },
    ]);

    const { result } = renderHook(() => useDiscoverData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.recentItems.map((p) => p.name)).toEqual([
      "Soroswap",
      "Blend",
    ]);
  });

  it("drops recent entries whose URLs are no longer in the allowed list", async () => {
    jest.spyOn(ApiInternal, "getRecentProtocols").mockResolvedValue([
      { websiteUrl: "https://blend.capital", lastAccessed: 1 },
      { websiteUrl: "https://gone.example", lastAccessed: 2 },
    ]);

    const { result } = renderHook(() => useDiscoverData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.recentItems.map((p) => p.websiteUrl)).toEqual([
      "https://blend.capital",
    ]);
  });

  it("surfaces the error when fetching fails", async () => {
    jest
      .spyOn(ApiInternal, "getDiscoverData")
      .mockRejectedValue(new Error("boom"));

    const { result } = renderHook(() => useDiscoverData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("refreshRecent pulls the latest entries without refetching discover data", async () => {
    const getDiscoverSpy = jest.spyOn(ApiInternal, "getDiscoverData");
    const getRecentSpy = jest
      .spyOn(ApiInternal, "getRecentProtocols")
      .mockResolvedValueOnce([])
      .mockResolvedValue([
        { websiteUrl: "https://blend.capital", lastAccessed: Date.now() },
      ]);

    const { result } = renderHook(() => useDiscoverData());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.recentItems).toHaveLength(0);

    await act(async () => {
      await result.current.refreshRecent();
    });

    expect(result.current.recentItems.map((p) => p.name)).toEqual(["Blend"]);
    expect(getRecentSpy).toHaveBeenCalledTimes(2);
    expect(getDiscoverSpy).toHaveBeenCalledTimes(1);
  });

  it("retry re-runs the fetch", async () => {
    const getDiscoverSpy = jest
      .spyOn(ApiInternal, "getDiscoverData")
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue(mockProtocols);

    const { result } = renderHook(() => useDiscoverData());
    await waitFor(() => expect(result.current.error).toBeTruthy());

    await act(async () => {
      await result.current.retry();
    });

    expect(result.current.error).toBeNull();
    expect(getDiscoverSpy).toHaveBeenCalledTimes(2);
  });
});
