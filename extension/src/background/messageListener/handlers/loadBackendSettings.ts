import {
  getFeatureFlags,
  getUserNotification,
} from "background/helpers/account";

export const loadBackendSettings = async () => {
  const featureFlags = await getFeatureFlags();
  const isRpcHealthy = true;
  const userNotification = await getUserNotification();

  return {
    isSorobanPublicEnabled: featureFlags.useSorobanPublic,
    isRpcHealthy,
    userNotification,
  };
};
