import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { OVERRIDDEN_BLOCKAID_RESPONSE_ID } from "constants/localStorageTypes";

export interface SaveBlockaidDebugOverrideMessage {
  overriddenBlockaidResponse: string | null;
}

export const saveDebugOverride = async ({
  request,
  localStore,
}: {
  request: SaveBlockaidDebugOverrideMessage;
  localStore: DataStorageAccess;
}) => {
  const { overriddenBlockaidResponse } = request;

  // Only save to localStorage in dev mode
  const isDev = process.env.DEV_EXTENSION === "true" || !process.env.PRODUCTION;
  if (!isDev) {
    return { overriddenBlockaidResponse: null };
  }

  if (overriddenBlockaidResponse === null) {
    await localStore.remove(OVERRIDDEN_BLOCKAID_RESPONSE_ID);
  } else {
    await localStore.setItem(
      OVERRIDDEN_BLOCKAID_RESPONSE_ID,
      overriddenBlockaidResponse,
    );
  }

  return { overriddenBlockaidResponse };
};
