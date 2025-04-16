import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { HIDDEN_ASSETS } from "constants/localStorageTypes";

export const getHiddenAssets = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  const hiddenAssets = (await localStore.getItem(HIDDEN_ASSETS)) || {};
  return { hiddenAssets };
};
