import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { ETHENA_LAUNCH_PROMO_STATUS_ID } from "constants/localStorageTypes";
import { ETHENA_LAUNCH_PROMO_STATUS } from "constants/ethenaLaunchPromo";

import { claimEthenaLaunchPromo } from "../handlers/claimEthenaLaunchPromo";

describe("claimEthenaLaunchPromo", () => {
  beforeEach(async () => {
    await mockDataStorage.remove(ETHENA_LAUNCH_PROMO_STATUS_ID);
  });

  it("says no when nothing has been recorded (fresh install)", async () => {
    const result = await claimEthenaLaunchPromo({
      localStore: mockDataStorage,
    });
    expect(result).toEqual({ shouldShowEthenaLaunchPromo: false });
  });

  it("says yes once for a pending wallet and marks it seen", async () => {
    await mockDataStorage.setItem(
      ETHENA_LAUNCH_PROMO_STATUS_ID,
      ETHENA_LAUNCH_PROMO_STATUS.PENDING,
    );

    const first = await claimEthenaLaunchPromo({
      localStore: mockDataStorage,
    });
    const second = await claimEthenaLaunchPromo({
      localStore: mockDataStorage,
    });

    expect(first).toEqual({ shouldShowEthenaLaunchPromo: true });
    expect(second).toEqual({ shouldShowEthenaLaunchPromo: false });
    expect(
      await mockDataStorage.getItem(ETHENA_LAUNCH_PROMO_STATUS_ID),
    ).toEqual(ETHENA_LAUNCH_PROMO_STATUS.SEEN);
  });

  it("lets only one of several concurrent surfaces show it", async () => {
    await mockDataStorage.setItem(
      ETHENA_LAUNCH_PROMO_STATUS_ID,
      ETHENA_LAUNCH_PROMO_STATUS.PENDING,
    );

    const results = await Promise.all([
      claimEthenaLaunchPromo({ localStore: mockDataStorage }),
      claimEthenaLaunchPromo({ localStore: mockDataStorage }),
      claimEthenaLaunchPromo({ localStore: mockDataStorage }),
    ]);

    expect(results.filter((r) => r.shouldShowEthenaLaunchPromo)).toHaveLength(
      1,
    );
  });
});
