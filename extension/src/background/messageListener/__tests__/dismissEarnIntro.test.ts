import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { HAS_SEEN_EARN_INTRO } from "constants/localStorageTypes";

import { dismissEarnIntro } from "../handlers/dismissEarnIntro";
import { getEarnIntroSeen } from "../handlers/getEarnIntroSeen";

describe("dismissEarnIntro", () => {
  beforeEach(async () => {
    await mockDataStorage.remove(HAS_SEEN_EARN_INTRO);
  });

  it("persists the flag and reports it seen", async () => {
    const result = await dismissEarnIntro({ localStore: mockDataStorage });

    expect(result).toEqual({ hasSeenEarnIntro: true });
    expect(await mockDataStorage.getItem(HAS_SEEN_EARN_INTRO)).toBe(true);
  });

  it("is what makes the intro skip on the next flow entry", async () => {
    await dismissEarnIntro({ localStore: mockDataStorage });

    expect(await getEarnIntroSeen({ localStore: mockDataStorage })).toEqual({
      hasSeenEarnIntro: true,
    });
  });

  it("is idempotent", async () => {
    await dismissEarnIntro({ localStore: mockDataStorage });
    const result = await dismissEarnIntro({ localStore: mockDataStorage });

    expect(result).toEqual({ hasSeenEarnIntro: true });
  });
});
