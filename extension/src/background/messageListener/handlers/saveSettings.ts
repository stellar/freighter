import { Store } from "redux";

import { SaveSettingsMessage } from "@shared/api/types/message-request";
import { SaveSettingsResponse } from "@shared/api/types/types";
import { coerceAutoLockTimeoutMinutes } from "@shared/constants/autoLock";
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
  buildHasPrivateKeySelector,
  SessionState,
} from "background/ducks/session";
import { SessionTimer } from "background/helpers/session";
import {
  AUTO_LOCK_TIMEOUT_MINUTES_ID,
  DATA_SHARING_ID,
  IS_HIDE_DUST_ENABLED_ID,
  IS_OPEN_SIDEBAR_BY_DEFAULT_ID,
  IS_VALIDATING_MEMO_ID,
} from "constants/localStorageTypes";

export const saveSettings = async ({
  request,
  localStore,
  sessionStore,
  sessionTimer,
}: {
  request: SaveSettingsMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  sessionTimer: SessionTimer;
}): Promise<SaveSettingsResponse> => {
  const {
    isDataSharingAllowed,
    isMemoValidationEnabled,
    isHideDustEnabled,
    isOpenSidebarByDefault,
    autoLockTimeoutMinutes,
  } = request;

  // `autoLockTimeoutMinutes` originates from the Preferences `<Select>`,
  // whose options are populated from `VALID_AUTO_LOCK_TIMEOUT_MINUTES`
  // and coerced through `coerceAutoLockTimeoutMinutes` before dispatch.
  // We coerce again here as defence-in-depth: a malformed value (e.g.
  // from a future client revision or a corrupted message) is clamped to
  // the default rather than rejected, since the response type has no
  // error variant the popup could surface to the user.
  const safeAutoLockTimeoutMinutes = coerceAutoLockTimeoutMinutes(
    autoLockTimeoutMinutes,
  );

  await localStore.setItem(DATA_SHARING_ID, isDataSharingAllowed);
  await localStore.setItem(IS_VALIDATING_MEMO_ID, isMemoValidationEnabled);
  await localStore.setItem(IS_HIDE_DUST_ENABLED_ID, isHideDustEnabled);
  await localStore.setItem(
    IS_OPEN_SIDEBAR_BY_DEFAULT_ID,
    isOpenSidebarByDefault,
  );
  await localStore.setItem(
    AUTO_LOCK_TIMEOUT_MINUTES_ID,
    safeAutoLockTimeoutMinutes,
  );

  // Saving settings is itself a user action, so it counts as activity:
  // rearm the idle timer with the new timeout rather than synthesizing
  // an immediate lock when the new threshold is shorter than the elapsed
  // idle time. Only rearm if the wallet is currently unlocked — for a
  // locked wallet there is no session to protect and we'd just leave a
  // stray alarm pending.
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);
  const isUnlocked = await hasPrivateKeySelector(
    sessionStore.getState() as SessionState,
  );
  if (isUnlocked) {
    await sessionTimer.resetSession();
  }

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
    autoLockTimeoutMinutes: coerceAutoLockTimeoutMinutes(
      await localStore.getItem(AUTO_LOCK_TIMEOUT_MINUTES_ID),
    ),
  };
};
