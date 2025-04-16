import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { LAST_USED_ACCOUNT } from "constants/localStorageTypes";

export const loadLastUsedAccount = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  const lastUsedAccount = (await localStore.getItem(LAST_USED_ACCOUNT)) || "";
  return { lastUsedAccount };
};
