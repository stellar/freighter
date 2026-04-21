import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { OVERRIDDEN_BLOCKAID_RESPONSE_ID } from "constants/localStorageTypes";
import { isDev } from "@shared/helpers/dev";

export interface SaveBlockaidDebugOverrideMessage {
  overriddenBlockaidResponse: string | null;
}

export const saveBlockaidOverrideState = async ({
  request,
  localStore,
}: {
  request: SaveBlockaidDebugOverrideMessage;
  localStore: DataStorageAccess;
}) => {
  if (!isDev) {
    return { overriddenBlockaidResponse: null };
  }

  const { overriddenBlockaidResponse } = request;

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
