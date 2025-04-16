import {
  getAllowList,
  getAssetsLists,
  getFeatureFlags,
  getIsExperimentalModeEnabled,
  getIsHashSigningEnabled,
  getIsHideDustEnabled,
  getIsMemoValidationEnabled,
  getIsNonSSLEnabled,
  getNetworkDetails,
  getNetworksList,
  getUserNotification,
  verifySorobanRpcUrls,
} from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { DATA_SHARING_ID } from "constants/localStorageTypes";
import { getHiddenAssets } from "../helpers/get-hidden-assets";

export const loadSettings = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  await verifySorobanRpcUrls();

  const isDataSharingAllowed =
    (await localStore.getItem(DATA_SHARING_ID)) ?? true;
  const featureFlags = await getFeatureFlags();
  const isRpcHealthy = true;
  const userNotification = await getUserNotification();
  const isHashSigningEnabled = await getIsHashSigningEnabled();
  const assetsLists = await getAssetsLists();
  const isNonSSLEnabled = await getIsNonSSLEnabled();
  const isHideDustEnabled = await getIsHideDustEnabled();
  const { hiddenAssets } = await getHiddenAssets({ localStore });

  return {
    allowList: await getAllowList(),
    isDataSharingAllowed,
    isMemoValidationEnabled: await getIsMemoValidationEnabled(),
    isExperimentalModeEnabled: await getIsExperimentalModeEnabled(),
    isHashSigningEnabled,
    networkDetails: await getNetworkDetails(),
    networksList: await getNetworksList(),
    isSorobanPublicEnabled: featureFlags.useSorobanPublic,
    isRpcHealthy,
    userNotification,
    assetsLists,
    isNonSSLEnabled,
    isHideDustEnabled,
    hiddenAssets,
  };
};
