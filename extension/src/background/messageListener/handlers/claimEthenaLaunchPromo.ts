import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { HAS_SEEN_ETHENA_LAUNCH_PROMO } from "constants/localStorageTypes";

// Every surface unlocked by the same broadcast asks at once. Serialising the
// read-and-write means only the first one is told to show the promo.
let claimQueue: Promise<unknown> = Promise.resolve();

// Every wallet sees the one-time launch promo once, whether it's an existing
// install or a new one: the first claim gets it, and marks it seen.
export const claimEthenaLaunchPromo = ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ shouldShowEthenaLaunchPromo: boolean }> => {
  const claim = claimQueue.then(async () => {
    if (await localStore.getItem(HAS_SEEN_ETHENA_LAUNCH_PROMO)) {
      return { shouldShowEthenaLaunchPromo: false };
    }

    await localStore.setItem(HAS_SEEN_ETHENA_LAUNCH_PROMO, true);

    return { shouldShowEthenaLaunchPromo: true };
  });

  claimQueue = claim.catch(() => undefined);

  return claim;
};
