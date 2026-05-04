import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { RECENT_PROTOCOLS } from "constants/localStorageTypes";

import { clearRecentProtocols } from "../handlers/clearRecentProtocols";

describe("clearRecentProtocols", () => {
  beforeEach(async () => {
    await mockDataStorage.remove(RECENT_PROTOCOLS);
  });

  it("returns an empty list and removes the stored key", async () => {
    await mockDataStorage.setItem(RECENT_PROTOCOLS, [
      { websiteUrl: "https://a.example", lastAccessed: 1 },
    ]);

    const result = await clearRecentProtocols({ localStore: mockDataStorage });
    expect(result).toEqual({ recentProtocols: [] });
    expect(await mockDataStorage.getItem(RECENT_PROTOCOLS)).toBeUndefined();
  });

  it("is a no-op when storage is already empty", async () => {
    const result = await clearRecentProtocols({ localStore: mockDataStorage });
    expect(result).toEqual({ recentProtocols: [] });
  });
});
