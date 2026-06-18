import { SERVICE_TYPES } from "@shared/constants/services";
import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { RECENT_PROTOCOLS } from "constants/localStorageTypes";

import { addRecentProtocol } from "../handlers/addRecentProtocol";

const MAX_RECENT = 5;

const request = (websiteUrl: string) => ({
  type: SERVICE_TYPES.ADD_RECENT_PROTOCOL as const,
  activePublicKey: "",
  websiteUrl,
});

describe("addRecentProtocol", () => {
  beforeEach(async () => {
    await mockDataStorage.remove(RECENT_PROTOCOLS);
  });

  it("adds to an empty recent list", async () => {
    const result = await addRecentProtocol({
      request: request("https://blend.capital"),
      localStore: mockDataStorage,
    });

    expect(result.recentProtocols).toHaveLength(1);
    expect(result.recentProtocols[0]).toMatchObject({
      websiteUrl: "https://blend.capital",
    });
    expect(typeof result.recentProtocols[0].lastAccessed).toBe("number");
  });

  it("prepends new entries so the most recent is first", async () => {
    await addRecentProtocol({
      request: request("https://a.example"),
      localStore: mockDataStorage,
    });
    const result = await addRecentProtocol({
      request: request("https://b.example"),
      localStore: mockDataStorage,
    });

    expect(result.recentProtocols.map((e) => e.websiteUrl)).toEqual([
      "https://b.example",
      "https://a.example",
    ]);
  });

  it("dedups by websiteUrl and moves the existing entry to the front", async () => {
    await addRecentProtocol({
      request: request("https://a.example"),
      localStore: mockDataStorage,
    });
    await addRecentProtocol({
      request: request("https://b.example"),
      localStore: mockDataStorage,
    });
    const result = await addRecentProtocol({
      request: request("https://a.example"),
      localStore: mockDataStorage,
    });

    expect(result.recentProtocols.map((e) => e.websiteUrl)).toEqual([
      "https://a.example",
      "https://b.example",
    ]);
    expect(result.recentProtocols).toHaveLength(2);
  });

  it("caps the list at MAX_RECENT entries", async () => {
    for (let i = 0; i < MAX_RECENT + 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await addRecentProtocol({
        request: request(`https://proto-${i}.example`),
        localStore: mockDataStorage,
      });
    }

    const result = await addRecentProtocol({
      request: request("https://newest.example"),
      localStore: mockDataStorage,
    });

    expect(result.recentProtocols).toHaveLength(MAX_RECENT);
    expect(result.recentProtocols[0].websiteUrl).toBe("https://newest.example");
  });

  it("persists the updated list to storage", async () => {
    await addRecentProtocol({
      request: request("https://blend.capital"),
      localStore: mockDataStorage,
    });

    const stored = await mockDataStorage.getItem(RECENT_PROTOCOLS);
    expect(stored).toEqual([
      expect.objectContaining({ websiteUrl: "https://blend.capital" }),
    ]);
  });
});
