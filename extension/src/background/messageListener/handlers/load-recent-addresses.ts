import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { RECENT_ADDRESSES } from "constants/localStorageTypes";

export const loadRecentAddresses = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  const storedData = (await localStore.getItem(RECENT_ADDRESSES)) || [];
  const recentAddresses = storedData;
  return { recentAddresses };
};
