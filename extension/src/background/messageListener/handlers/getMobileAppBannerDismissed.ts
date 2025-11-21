import { DataStorageAccess } from "background/helpers/dataStorageAccess";

const STORAGE_KEY = "mobileAppBannerDismissed";

export const getMobileAppBannerDismissed = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{ isDismissed: boolean }> => {
  const dismissed = await localStore.getItem(STORAGE_KEY);
  return { isDismissed: !!dismissed };
};
