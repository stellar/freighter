import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { HAS_SEEN_EARN_INTRO } from "constants/localStorageTypes";

import { getEarnIntroSeen } from "../handlers/getEarnIntroSeen";

describe("getEarnIntroSeen", () => {
  beforeEach(async () => {
    await mockDataStorage.remove(HAS_SEEN_EARN_INTRO);
  });

  it("returns false when the flag has never been set", async () => {
    const result = await getEarnIntroSeen({ localStore: mockDataStorage });
    expect(result).toEqual({ hasSeenEarnIntro: false });
  });

  it("returns true once the flag has been persisted", async () => {
    await mockDataStorage.setItem(HAS_SEEN_EARN_INTRO, true);

    const result = await getEarnIntroSeen({ localStore: mockDataStorage });
    expect(result).toEqual({ hasSeenEarnIntro: true });
  });
});
