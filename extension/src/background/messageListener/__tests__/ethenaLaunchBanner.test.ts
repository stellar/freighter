import { mockDataStorage } from "background/messageListener/helpers/test-helpers";
import { ETHENA_LAUNCH_BANNER_DISMISSED } from "constants/localStorageTypes";

import { getEthenaLaunchBannerDismissed } from "../handlers/getEthenaLaunchBannerDismissed";
import { dismissEthenaLaunchBanner } from "../handlers/dismissEthenaLaunchBanner";

describe("Ethena launch banner dismissal", () => {
  beforeEach(async () => {
    await mockDataStorage.remove(ETHENA_LAUNCH_BANNER_DISMISSED);
  });

  it("reports the banner as not dismissed until it is", async () => {
    const result = await getEthenaLaunchBannerDismissed({
      localStore: mockDataStorage,
    });
    expect(result).toEqual({ isDismissed: false });
  });

  it("persists a dismissal and reports it from then on", async () => {
    const dismissed = await dismissEthenaLaunchBanner({
      localStore: mockDataStorage,
    });
    const lookup = await getEthenaLaunchBannerDismissed({
      localStore: mockDataStorage,
    });

    expect(dismissed).toEqual({ isDismissed: true });
    expect(lookup).toEqual({ isDismissed: true });
    expect(await mockDataStorage.getItem(ETHENA_LAUNCH_BANNER_DISMISSED)).toBe(
      true,
    );
  });
});
