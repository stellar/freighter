import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { RECENT_PROTOCOLS } from "constants/localStorageTypes";

import { getRecentProtocols } from "../handlers/getRecentProtocols";

describe("getRecentProtocols", () => {
  beforeEach(async () => {
    await mockDataStorage.remove(RECENT_PROTOCOLS);
  });

  it("returns an empty list when storage is empty", async () => {
    const result = await getRecentProtocols({ localStore: mockDataStorage });
    expect(result).toEqual({ recentProtocols: [] });
  });

  it("returns the stored list when present", async () => {
    const entries = [
      { websiteUrl: "https://a.example", lastAccessed: 2 },
      { websiteUrl: "https://b.example", lastAccessed: 1 },
    ];
    await mockDataStorage.setItem(RECENT_PROTOCOLS, entries);

    const result = await getRecentProtocols({ localStore: mockDataStorage });
    expect(result).toEqual({ recentProtocols: entries });
  });
});
