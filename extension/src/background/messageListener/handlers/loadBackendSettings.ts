import {
  getFeatureFlags,
  getUserNotification,
  getIsRpcHealthy,
} from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { Store } from "redux";

export const loadBackendSettings = async ({
  localStore,
  sessionStore,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const featureFlags = await getFeatureFlags();
  const isRpcHealthy = await getIsRpcHealthy({ localStore, sessionStore });
  const userNotification = await getUserNotification();

  return {
    isSorobanPublicEnabled: featureFlags.useSorobanPublic,
    isRpcHealthy,
    userNotification,
  };
};
