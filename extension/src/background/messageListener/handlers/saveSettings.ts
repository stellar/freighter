import { SaveSettingsMessage } from "@shared/api/types/message-request";
import {
  getAllowList,
  getFeatureFlags,
  getIsHideDustEnabled,
  getIsMemoValidationEnabled,
  getIsNonSSLEnabled,
  getNetworkDetails,
  getNetworksList,
} from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  DATA_SHARING_ID,
  IS_HIDE_DUST_ENABLED_ID,
  IS_OPEN_SIDEBAR_BY_DEFAULT_ID,
  IS_VALIDATING_MEMO_ID,
} from "constants/localStorageTypes";

export const saveSettings = async ({
  request,
  localStore,
}: {
  request: SaveSettingsMessage;
  localStore: DataStorageAccess;
}) => {
  const {
    isDataSharingAllowed,
    isMemoValidationEnabled,
    isHideDustEnabled,
    isOpenSidebarByDefault,
  } = request;

  await localStore.setItem(DATA_SHARING_ID, isDataSharingAllowed);
  await localStore.setItem(IS_VALIDATING_MEMO_ID, isMemoValidationEnabled);
  await localStore.setItem(IS_HIDE_DUST_ENABLED_ID, isHideDustEnabled);
  await localStore.setItem(
    IS_OPEN_SIDEBAR_BY_DEFAULT_ID,
    isOpenSidebarByDefault,
  );

  // Apply sidebar behavior immediately on Chrome
  if (chrome.sidePanel?.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: isOpenSidebarByDefault })
      .catch((e) => console.error("Failed to set panel behavior:", e));
  }

  const networkDetails = await getNetworkDetails({ localStore });
  const isRpcHealthy = true;
  const featureFlags = await getFeatureFlags();

  return {
    allowList: await getAllowList({ localStore }),
    isDataSharingAllowed,
    isMemoValidationEnabled: await getIsMemoValidationEnabled({ localStore }),
    networkDetails,
    networksList: await getNetworksList({ localStore }),
    isRpcHealthy,
    isSorobanPublicEnabled: featureFlags.useSorobanPublic,
    isNonSSLEnabled: await getIsNonSSLEnabled({ localStore }),
    isHideDustEnabled: await getIsHideDustEnabled({ localStore }),
    isOpenSidebarByDefault:
      ((await localStore.getItem(IS_OPEN_SIDEBAR_BY_DEFAULT_ID)) as boolean) ??
      false,
  };
};
