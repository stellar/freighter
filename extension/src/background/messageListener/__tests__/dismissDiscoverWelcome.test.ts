import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { HAS_SEEN_DISCOVER_WELCOME } from "constants/localStorageTypes";

import { dismissDiscoverWelcome } from "../handlers/dismissDiscoverWelcome";

describe("dismissDiscoverWelcome", () => {
  beforeEach(async () => {
    await mockDataStorage.remove(HAS_SEEN_DISCOVER_WELCOME);
  });

  it("sets the flag to true and reports the persisted value", async () => {
    const result = await dismissDiscoverWelcome({
      localStore: mockDataStorage,
    });
    expect(result).toEqual({ hasSeenDiscoverWelcome: true });
    expect(await mockDataStorage.getItem(HAS_SEEN_DISCOVER_WELCOME)).toBe(true);
  });

  it("is idempotent on repeat calls", async () => {
    await dismissDiscoverWelcome({ localStore: mockDataStorage });
    const result = await dismissDiscoverWelcome({
      localStore: mockDataStorage,
    });
    expect(result).toEqual({ hasSeenDiscoverWelcome: true });
  });
});
