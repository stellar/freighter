import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { USDT0_LAUNCH_BANNER_DISMISSED } from "constants/localStorageTypes";

export const dismissUsdt0LaunchBanner = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ isDismissed: boolean }> => {
  await localStore.setItem(USDT0_LAUNCH_BANNER_DISMISSED, true);
  const isDismissed = await localStore.getItem(USDT0_LAUNCH_BANNER_DISMISSED);
  return { isDismissed: !!isDismissed };
};
