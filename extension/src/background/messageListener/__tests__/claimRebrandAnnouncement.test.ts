import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { REBRAND_ANNOUNCEMENT_STATUS_ID } from "constants/localStorageTypes";
import { REBRAND_ANNOUNCEMENT_STATUS } from "constants/rebrandAnnouncement";

import { claimRebrandAnnouncement } from "../handlers/claimRebrandAnnouncement";

describe("claimRebrandAnnouncement", () => {
  beforeEach(async () => {
    await mockDataStorage.remove(REBRAND_ANNOUNCEMENT_STATUS_ID);
  });

  it("says no when nothing has been recorded (fresh install)", async () => {
    const result = await claimRebrandAnnouncement({
      localStore: mockDataStorage,
    });
    expect(result).toEqual({ shouldShowRebrandAnnouncement: false });
  });

  it("says yes once for a pending wallet and marks it seen", async () => {
    await mockDataStorage.setItem(
      REBRAND_ANNOUNCEMENT_STATUS_ID,
      REBRAND_ANNOUNCEMENT_STATUS.PENDING,
    );

    const first = await claimRebrandAnnouncement({
      localStore: mockDataStorage,
    });
    const second = await claimRebrandAnnouncement({
      localStore: mockDataStorage,
    });

    expect(first).toEqual({ shouldShowRebrandAnnouncement: true });
    expect(second).toEqual({ shouldShowRebrandAnnouncement: false });
    expect(
      await mockDataStorage.getItem(REBRAND_ANNOUNCEMENT_STATUS_ID),
    ).toEqual(REBRAND_ANNOUNCEMENT_STATUS.SEEN);
  });

  it("lets only one of several concurrent surfaces show it", async () => {
    await mockDataStorage.setItem(
      REBRAND_ANNOUNCEMENT_STATUS_ID,
      REBRAND_ANNOUNCEMENT_STATUS.PENDING,
    );

    const results = await Promise.all([
      claimRebrandAnnouncement({ localStore: mockDataStorage }),
      claimRebrandAnnouncement({ localStore: mockDataStorage }),
      claimRebrandAnnouncement({ localStore: mockDataStorage }),
    ]);

    expect(results.filter((r) => r.shouldShowRebrandAnnouncement)).toHaveLength(
      1,
    );
  });
});
