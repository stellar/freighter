import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { OVERRIDDEN_BLOCKAID_RESPONSE_ID } from "constants/localStorageTypes";

const getIsDev = (): boolean => {
  return process.env.DEV_EXTENSION === "true" || !process.env.PRODUCTION;
};

export const getBlockaidOverrideState = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{
  overriddenBlockaidResponse: string | null;
}> => {
  if (!getIsDev()) {
    return { overriddenBlockaidResponse: null };
  }

  const value =
    (await localStore.getItem(OVERRIDDEN_BLOCKAID_RESPONSE_ID)) ?? null;
  return { overriddenBlockaidResponse: value };
};
