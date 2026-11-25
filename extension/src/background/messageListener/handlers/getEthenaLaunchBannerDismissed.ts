import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { ETHENA_LAUNCH_BANNER_DISMISSED } from "constants/localStorageTypes";

export const getEthenaLaunchBannerDismissed = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ isDismissed: boolean }> => {
  const dismissed = await localStore.getItem(ETHENA_LAUNCH_BANNER_DISMISSED);
  return { isDismissed: !!dismissed };
};
