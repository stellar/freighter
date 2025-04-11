import { SaveExperimentalFeaturesMessage } from "@shared/api/types/message-request";
import {
  FUTURENET_NETWORK_DETAILS,
  MAINNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import {
  getIsExperimentalModeEnabled,
  getIsHashSigningEnabled,
  getIsNonSSLEnabled,
  getNetworkDetails,
  getNetworksList,
} from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  IS_EXPERIMENTAL_MODE_ID,
  IS_HASH_SIGNING_ENABLED_ID,
  IS_NON_SSL_ENABLED_ID,
  NETWORK_ID,
  NETWORKS_LIST_ID,
} from "constants/localStorageTypes";

export const saveExperimentalFeatures = async ({
  request,
  localStore,
}: {
  request: SaveExperimentalFeaturesMessage;
  localStore: DataStorageAccess;
}) => {
  const { isExperimentalModeEnabled, isHashSigningEnabled, isNonSSLEnabled } =
    request;

  await localStore.setItem(IS_HASH_SIGNING_ENABLED_ID, isHashSigningEnabled);
  await localStore.setItem(IS_NON_SSL_ENABLED_ID, isNonSSLEnabled);

  const currentIsExperimentalModeEnabled = await getIsExperimentalModeEnabled();

  if (isExperimentalModeEnabled !== currentIsExperimentalModeEnabled) {
    /* Disable Mainnet access and automatically switch the user to Futurenet
      if user is enabling experimental mode and vice-versa */
    const currentNetworksList = await getNetworksList();

    const defaultNetworkDetails = isExperimentalModeEnabled
      ? FUTURENET_NETWORK_DETAILS
      : MAINNET_NETWORK_DETAILS;

    currentNetworksList.splice(0, 1, defaultNetworkDetails);

    await localStore.setItem(NETWORKS_LIST_ID, currentNetworksList);
    await localStore.setItem(NETWORK_ID, defaultNetworkDetails);
  }

  await localStore.setItem(IS_EXPERIMENTAL_MODE_ID, isExperimentalModeEnabled);

  return {
    isExperimentalModeEnabled: await getIsExperimentalModeEnabled(),
    isHashSigningEnabled: await getIsHashSigningEnabled(),
    isNonSSLEnabled: await getIsNonSSLEnabled(),
    networkDetails: await getNetworkDetails(),
    networksList: await getNetworksList(),
  };
};
