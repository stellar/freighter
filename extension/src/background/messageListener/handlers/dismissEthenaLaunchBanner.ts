import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { ETHENA_LAUNCH_BANNER_DISMISSED } from "constants/localStorageTypes";

export const dismissEthenaLaunchBanner = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ isDismissed: boolean }> => {
  await localStore.setItem(ETHENA_LAUNCH_BANNER_DISMISSED, true);
  return { isDismissed: true };
};
