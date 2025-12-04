import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { OVERRIDDEN_BLOCKAID_RESPONSE_ID } from "constants/localStorageTypes";

export const getDebugOverride = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}): Promise<{
  overriddenBlockaidResponse: string | null;
}> => {
  // Only load from localStorage in dev mode
  const isDev = process.env.DEV_EXTENSION === "true" || !process.env.PRODUCTION;
  if (!isDev) {
    return { overriddenBlockaidResponse: null };
  }

  const value =
    (await localStore.getItem(OVERRIDDEN_BLOCKAID_RESPONSE_ID)) ?? null;
  return { overriddenBlockaidResponse: value };
};
