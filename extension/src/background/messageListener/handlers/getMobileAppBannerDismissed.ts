import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { MOBILE_APP_BANNER_DISMISSED } from "constants/localStorageTypes";

export const getMobileAppBannerDismissed = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ isDismissed: boolean }> => {
  const dismissed = await localStore.getItem(MOBILE_APP_BANNER_DISMISSED);
  return { isDismissed: !!dismissed };
};
