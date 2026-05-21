import { Store } from "redux";

import {
  buildHasPrivateKeySelector,
  SessionState,
} from "background/ducks/session";
import { SessionTimer } from "background/helpers/session";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

/**
 * Handle a USER_ACTIVITY ping from an extension page.
 *
 * When the wallet is unlocked, this rearms the idle auto-lock alarm
 * via `sessionTimer.resetSession()`. "Unlocked" means either the
 * hot-wallet `hashKey` is present OR a hardware wallet is active and
 * not idle-locked — `buildHasPrivateKeySelector` is the canonical
 * predicate, used by the popup router for the same purpose.
 *
 * When locked we reject the ping — a stale activity listener in a
 * still-mounted extension page must not re-arm the alarm after the
 * user has signed out or auto-locked elsewhere.
 *
 * Caller-side, `popupMessageListener` additionally gates this message
 * behind `isFromExtensionPage` so dApp content scripts cannot extend
 * an unlocked session.
 */
export const userActivity = async ({
  sessionStore,
  sessionTimer,
  localStore,
}: {
  sessionStore: Store;
  sessionTimer: SessionTimer;
  localStore: DataStorageAccess;
}) => {
  const hasPrivateKeySelector = buildHasPrivateKeySelector(localStore);
  const isUnlocked = await hasPrivateKeySelector(
    sessionStore.getState() as SessionState,
  );
  if (!isUnlocked) {
    return { ok: false };
  }

  await sessionTimer.resetSession();
  return { ok: true };
};
