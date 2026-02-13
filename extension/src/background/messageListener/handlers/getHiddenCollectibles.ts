import { DataStorageAccess } from "../../helpers/dataStorageAccess";
import { HIDDEN_COLLECTIBLES } from "../../../constants/localStorageTypes";

export const getHiddenCollectibles = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  const hiddenCollectibles =
    (await localStore.getItem(HIDDEN_COLLECTIBLES)) || {};
  return { hiddenCollectibles };
};
