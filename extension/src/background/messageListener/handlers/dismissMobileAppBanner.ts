import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { MOBILE_APP_BANNER_DISMISSED } from "constants/localStorageTypes";

export const dismissMobileAppBanner = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ isDismissed: boolean }> => {
  await localStore.setItem(MOBILE_APP_BANNER_DISMISSED, true);
  const isDismissed = await localStore.getItem(MOBILE_APP_BANNER_DISMISSED);
  return { isDismissed: !!isDismissed };
};
