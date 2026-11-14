import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { HAS_SEEN_ETHENA_LAUNCH_PROMO } from "constants/localStorageTypes";

import { claimEthenaLaunchPromo } from "../handlers/claimEthenaLaunchPromo";

describe("claimEthenaLaunchPromo", () => {
  beforeEach(async () => {
    await mockDataStorage.remove(HAS_SEEN_ETHENA_LAUNCH_PROMO);
  });

  it("says yes once to any wallet that hasn't seen it, then remembers", async () => {
    const first = await claimEthenaLaunchPromo({
      localStore: mockDataStorage,
    });
    const second = await claimEthenaLaunchPromo({
      localStore: mockDataStorage,
    });

    expect(first).toEqual({ shouldShowEthenaLaunchPromo: true });
    expect(second).toEqual({ shouldShowEthenaLaunchPromo: false });
    expect(await mockDataStorage.getItem(HAS_SEEN_ETHENA_LAUNCH_PROMO)).toBe(
      true,
    );
  });

  it("says no once it's been seen", async () => {
    await mockDataStorage.setItem(HAS_SEEN_ETHENA_LAUNCH_PROMO, true);

    const result = await claimEthenaLaunchPromo({
      localStore: mockDataStorage,
    });

    expect(result).toEqual({ shouldShowEthenaLaunchPromo: false });
  });

  it("lets only one of several concurrent surfaces show it", async () => {
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
