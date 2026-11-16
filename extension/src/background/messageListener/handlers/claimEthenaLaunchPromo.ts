import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { ETHENA_LAUNCH_PROMO_STATUS_ID } from "constants/localStorageTypes";
import { ETHENA_LAUNCH_PROMO_STATUS } from "constants/ethenaLaunchPromo";

// Every surface unlocked by the same broadcast asks at once. Serialising the
// read-and-write means only the first one is told to show the promo.
let claimQueue: Promise<unknown> = Promise.resolve();

export const claimEthenaLaunchPromo = ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ shouldShowEthenaLaunchPromo: boolean }> => {
  const claim = claimQueue.then(async () => {
    const status = await localStore.getItem(ETHENA_LAUNCH_PROMO_STATUS_ID);

    if (status !== ETHENA_LAUNCH_PROMO_STATUS.PENDING) {
      return { shouldShowEthenaLaunchPromo: false };
    }

    await localStore.setItem(
      ETHENA_LAUNCH_PROMO_STATUS_ID,
      ETHENA_LAUNCH_PROMO_STATUS.SEEN,
    );

    return { shouldShowEthenaLaunchPromo: true };
  });

  claimQueue = claim.catch(() => undefined);

  return claim;
};
