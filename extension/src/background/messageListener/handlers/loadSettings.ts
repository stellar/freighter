import {
  getAllowList,
  getAssetsLists,
  getIsExperimentalModeEnabled,
  getIsHashSigningEnabled,
  getIsHideDustEnabled,
  getIsMemoValidationEnabled,
  getIsNonSSLEnabled,
  getNetworkDetails,
  getNetworksList,
  verifySorobanRpcUrls,
  getOverriddenBlockaidResponse,
} from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  DATA_SHARING_ID,
  IS_OPEN_SIDEBAR_BY_DEFAULT_ID,
} from "constants/localStorageTypes";
import { getHiddenAssets } from "../helpers/get-hidden-assets";

export const loadSettings = async ({
  localStore,
}: {
  localStore: DataStorageAccess;
}) => {
  await verifySorobanRpcUrls({ localStore });

  const isDataSharingAllowed =
    (await localStore.getItem(DATA_SHARING_ID)) ?? true;
  const isHashSigningEnabled = await getIsHashSigningEnabled({ localStore });
  const assetsLists = await getAssetsLists({ localStore });
  const isNonSSLEnabled = await getIsNonSSLEnabled({ localStore });
  const isHideDustEnabled = await getIsHideDustEnabled({ localStore });
  const isOpenSidebarByDefault =
    (await localStore.getItem(IS_OPEN_SIDEBAR_BY_DEFAULT_ID)) === "true";
  const { hiddenAssets } = await getHiddenAssets({ localStore });
  const overriddenBlockaidResponse = await getOverriddenBlockaidResponse({
    localStore,
  });

  return {
    allowList: await getAllowList({ localStore }),
    isDataSharingAllowed,
    isMemoValidationEnabled: await getIsMemoValidationEnabled({ localStore }),
    isExperimentalModeEnabled: await getIsExperimentalModeEnabled({
      localStore,
    }),
    isHashSigningEnabled,
    networkDetails: await getNetworkDetails({ localStore }),
    networksList: await getNetworksList({ localStore }),
    assetsLists,
    isNonSSLEnabled,
    isHideDustEnabled,
    isOpenSidebarByDefault,
    hiddenAssets,
    overriddenBlockaidResponse,
  };
};
