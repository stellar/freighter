import { Store } from "redux";

import { getIsHardwareWalletActive } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { SessionTimer } from "background/helpers/session";
import {
  hashKeySelector,
  isHardwareWalletLockedSelector,
  SessionState,
} from "background/ducks/session";

/**
 * Handle a USER_ACTIVITY ping from an extension page.
 *
 * Pings come from two sources inside `useActivityPing`:
 *  1. An unconditional mount ping fired by every Freighter surface
 *     (popup, sidebar, fullscreen) as it loads.
 *  2. Throttled user-input events while the popup believes the wallet
 *     is unlocked.
 *
 * Either way, the popup-side `isUnlocked` is a delayed reflection of
 * the background's session state (it depends on `loadAccount` having
 * dispatched `saveAccount` into the popup's redux store). The
 * background is the source of truth, so this handler authoritatively
 * checks whether the wallet is currently unlocked before rearming the
 * idle alarm. A ping that arrives on a locked wallet is dropped: there
 * is no live session to extend.
 *
 * Unlocked = either a hot-wallet session (`hashKey` is set) or an
 * active hardware-wallet session that has not been idle-locked.
 */
export const userActivity = async ({
  sessionTimer,
  sessionStore,
  localStore,
}: {
  sessionTimer: SessionTimer;
  sessionStore: Store;
  localStore: DataStorageAccess;
}) => {
  const state = sessionStore.getState() as SessionState;
  const hashKey = hashKeySelector(state);
  const hotUnlocked = !!hashKey?.key;
  const isHwActive = await getIsHardwareWalletActive({ localStore });
  const hwUnlocked = isHwActive && !isHardwareWalletLockedSelector(state);

  // eslint-disable-next-line no-console
  console.warn("[auto-lock] BG userActivity received", {
    ts: Date.now(),
    hotUnlocked,
    hwUnlocked,
    isHwActive,
  });

  if (!hotUnlocked && !hwUnlocked) {
    return { ok: false };
  }

  await sessionTimer.resetSession();
  return { ok: true };
};
