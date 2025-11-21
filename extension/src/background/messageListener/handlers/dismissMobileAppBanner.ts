import { DataStorageAccess } from "background/helpers/dataStorageAccess";

const STORAGE_KEY = "mobileAppBannerDismissed";

export const dismissMobileAppBanner = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<void> => {
  await localStore.setItem(STORAGE_KEY, true);
};
