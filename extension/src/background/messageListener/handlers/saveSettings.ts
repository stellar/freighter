import browser from "webextension-polyfill";
import { Store } from "redux";

import { SaveSettingsMessage } from "@shared/api/types/message-request";
import {
  coerceAutoLockTimeoutMinutes,
  isValidAutoLockTimeoutMinutes,
} from "@shared/constants/autoLock";
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
import {
  clearSession,
  SESSION_ALARM_NAME,
  SessionTimer,
} from "background/helpers/session";
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
}) => {
  const {
    isDataSharingAllowed,
    isMemoValidationEnabled,
    isHideDustEnabled,
    isOpenSidebarByDefault,
    autoLockTimeoutMinutes,
  } = request;

  if (!isValidAutoLockTimeoutMinutes(autoLockTimeoutMinutes)) {
    return { error: "Invalid autoLockTimeoutMinutes" };
  }

  // Capture the previous timeout *before* writing the new one so we can
  // reason about elapsed-idle time against the alarm currently in flight.
  const previousAutoLockTimeoutMinutes = coerceAutoLockTimeoutMinutes(
    await localStore.getItem(AUTO_LOCK_TIMEOUT_MINUTES_ID),
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
    autoLockTimeoutMinutes,
  );

  // A new auto-lock timeout takes effect immediately, but only if the
  // wallet is currently unlocked. When shortening the timeout, the user
  // may already have been idle longer than the new threshold — in that
  // case we lock immediately rather than schedule an alarm in the past.
  // `wasLocked` is propagated to the popup so its `auth.hasPrivateKey`
  // can flip without waiting for the next `useGetAppData` poll.
  let wasLocked = false;
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);
  const isUnlocked = await hasPrivateKeySelector(
    sessionStore.getState() as SessionState,
  );
  if (isUnlocked) {
    const existingAlarm = await browser.alarms.get(SESSION_ALARM_NAME);
    if (!existingAlarm) {
      // Recovery edge: the worker just woke and the alarm hasn't been
      // re-observed yet (or this is the first save after unlock).
      // Don't synthesize an immediate lock; just rearm with the new
      // timeout.
      await sessionTimer.resetSession();
    } else {
      const newDelayMs = autoLockTimeoutMinutes * 60_000;
      const oldDelayMs = previousAutoLockTimeoutMinutes * 60_000;
      const remainingMs = existingAlarm.scheduledTime - Date.now();
      const elapsedIdleMs = Math.max(0, oldDelayMs - remainingMs);
      if (elapsedIdleMs >= newDelayMs) {
        await clearSession({ sessionStore, localStore });
        await sessionTimer.stopSession();
        wasLocked = true;
      } else {
        await sessionTimer.resetSession();
      }
    }
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
    wasLocked,
  };
};
