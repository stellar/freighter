import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { HAS_SEEN_DISCOVER_WELCOME } from "constants/localStorageTypes";

import { getDiscoverWelcomeSeen } from "../handlers/getDiscoverWelcomeSeen";

describe("getDiscoverWelcomeSeen", () => {
  beforeEach(async () => {
    await mockDataStorage.remove(HAS_SEEN_DISCOVER_WELCOME);
  });

  it("returns false when the flag has never been set", async () => {
    const result = await getDiscoverWelcomeSeen({
      localStore: mockDataStorage,
    });
    expect(result).toEqual({ hasSeenDiscoverWelcome: false });
  });

  it("returns true once the flag has been persisted", async () => {
    await mockDataStorage.setItem(HAS_SEEN_DISCOVER_WELCOME, true);

    const result = await getDiscoverWelcomeSeen({
      localStore: mockDataStorage,
    });
    expect(result).toEqual({ hasSeenDiscoverWelcome: true });
  });
});
