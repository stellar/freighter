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
  console.log("[saveDebugOverride handler] Called with request:", request);
  const { overriddenBlockaidResponse } = request;

  if (overriddenBlockaidResponse === null) {
    console.log("[saveDebugOverride handler] Removing from localStorage");
    await localStore.remove(OVERRIDDEN_BLOCKAID_RESPONSE_ID);
  } else {
    console.log(
      "[saveDebugOverride handler] Saving to localStorage:",
      overriddenBlockaidResponse,
    );
    await localStore.setItem(
      OVERRIDDEN_BLOCKAID_RESPONSE_ID,
      overriddenBlockaidResponse,
    );
    const saved = await localStore.getItem(OVERRIDDEN_BLOCKAID_RESPONSE_ID);
    console.log("[saveDebugOverride handler] Verified saved value:", saved);
  }

  const result = { overriddenBlockaidResponse };
  console.log("[saveDebugOverride handler] Returning:", result);
  return result;
};
