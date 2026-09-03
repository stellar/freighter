import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { USDT0_LAUNCH_BANNER_DISMISSED } from "constants/localStorageTypes";

export const getUsdt0LaunchBannerDismissed = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ isDismissed: boolean }> => {
  const dismissed = await localStore.getItem(USDT0_LAUNCH_BANNER_DISMISSED);
  return { isDismissed: !!dismissed };
};
