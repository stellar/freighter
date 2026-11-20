import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { HAS_SEEN_EARN_INTRO } from "constants/localStorageTypes";

export const dismissEarnIntro = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ hasSeenEarnIntro: boolean }> => {
  await localStore.setItem(HAS_SEEN_EARN_INTRO, true);
  return { hasSeenEarnIntro: true };
};
