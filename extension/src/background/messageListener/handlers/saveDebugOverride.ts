import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { OVERRIDDEN_BLOCKAID_RESPONSE_ID } from "constants/localStorageTypes";

export interface SaveBlockaidDebugOverrideMessage {
  overriddenBlockaidResponse: string | null;
}

const getIsDev = (): boolean => {
  return process.env.DEV_EXTENSION === "true" || !process.env.PRODUCTION;
};

export const saveBlockaidOverrideState = async ({
  request,
  localStore,
}: {
  request: SaveBlockaidDebugOverrideMessage;
  localStore: DataStorageAccess;
}) => {
  if (!getIsDev()) {
    return { overriddenBlockaidResponse: null };
  }

  console.log(
    "[saveBlockaidOverrideState handler] Called with request:",
    request,
  );
  const { overriddenBlockaidResponse } = request;

  if (overriddenBlockaidResponse === null) {
    console.log(
      "[saveBlockaidOverrideState handler] Removing from localStorage",
    );
    await localStore.remove(OVERRIDDEN_BLOCKAID_RESPONSE_ID);
  } else {
    console.log(
      "[saveBlockaidOverrideState handler] Saving to localStorage:",
      overriddenBlockaidResponse,
    );
    await localStore.setItem(
      OVERRIDDEN_BLOCKAID_RESPONSE_ID,
      overriddenBlockaidResponse,
    );
    const saved = await localStore.getItem(OVERRIDDEN_BLOCKAID_RESPONSE_ID);
    console.log(
      "[saveBlockaidOverrideState handler] Verified saved value:",
      saved,
    );
  }

  const result = { overriddenBlockaidResponse };
  console.log("[saveBlockaidOverrideState handler] Returning:", result);
  return result;
};
