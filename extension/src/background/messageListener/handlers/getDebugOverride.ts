import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { OVERRIDDEN_BLOCKAID_RESPONSE_ID } from "constants/localStorageTypes";
import { isDev } from "@shared/helpers/dev";

export const getBlockaidOverrideState = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{
  overriddenBlockaidResponse: string | null;
}> => {
  if (!isDev) {
    return { overriddenBlockaidResponse: null };
  }

  const value =
    (await localStore.getItem(OVERRIDDEN_BLOCKAID_RESPONSE_ID)) ?? null;
  return { overriddenBlockaidResponse: value };
};
