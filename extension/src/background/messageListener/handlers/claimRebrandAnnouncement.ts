import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { REBRAND_ANNOUNCEMENT_STATUS_ID } from "constants/localStorageTypes";
import { REBRAND_ANNOUNCEMENT_STATUS } from "constants/rebrandAnnouncement";

// Every surface unlocked by the same broadcast asks at once. Serialising the
// read-and-write means only the first one is told to show the announcement.
let claimQueue: Promise<unknown> = Promise.resolve();

export const claimRebrandAnnouncement = ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ shouldShowRebrandAnnouncement: boolean }> => {
  const claim = claimQueue.then(async () => {
    const status = await localStore.getItem(REBRAND_ANNOUNCEMENT_STATUS_ID);

    if (status !== REBRAND_ANNOUNCEMENT_STATUS.PENDING) {
      return { shouldShowRebrandAnnouncement: false };
    }

    await localStore.setItem(
      REBRAND_ANNOUNCEMENT_STATUS_ID,
      REBRAND_ANNOUNCEMENT_STATUS.SEEN,
    );

    return { shouldShowRebrandAnnouncement: true };
  });

  claimQueue = claim.catch(() => undefined);

  return claim;
};
