import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { HAS_SEEN_EARN_INTRO } from "constants/localStorageTypes";

export const getEarnIntroSeen = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ hasSeenEarnIntro: boolean }> => {
  const seen = await localStore.getItem(HAS_SEEN_EARN_INTRO);
  return { hasSeenEarnIntro: !!seen };
};
