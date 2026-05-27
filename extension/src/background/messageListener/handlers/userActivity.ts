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
 * Pings originate from `useActivityPing`, which fires (throttled to
 * one per 5 s) on direct user input — `mousedown`, `keydown`,
 * `touchstart`, `wheel` — inside any Freighter surface (popup,
 * sidebar, standalone signing window, grant-access window). Surface
 * mounts deliberately do NOT ping: a dApp-spawned signing popup is
 * programmatic, not proof of user presence, and a mount-ping would
 * let a malicious dApp keep the session alive indefinitely.
 *
 * The popup-side `isUnlocked` it gates on is a delayed reflection of
 * the background's session state (it depends on `loadAccount` having
 * dispatched `saveAccount` into the popup's redux store). The
 * background is the source of truth, so this handler authoritatively
 * re-checks whether the wallet is currently unlocked before rearming
 * the idle alarm. A ping that arrives on a locked wallet is dropped:
 * there is no live session to extend.
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

  if (!hotUnlocked && !hwUnlocked) {
    return { ok: false };
  }

  await sessionTimer.resetSession();
  return { ok: true };
};
