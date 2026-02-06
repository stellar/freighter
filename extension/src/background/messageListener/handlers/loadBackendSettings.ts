import {
  getFeatureFlags,
  getUserNotification,
  getIsRpcHealthy,
} from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const loadBackendSettings = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  const featureFlags = await getFeatureFlags();
  const isRpcHealthy = await getIsRpcHealthy(localStore);
  const userNotification = await getUserNotification();

  return {
    isSorobanPublicEnabled: featureFlags.useSorobanPublic,
    isRpcHealthy,
    userNotification,
  };
};
