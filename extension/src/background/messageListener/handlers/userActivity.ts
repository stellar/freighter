import { SessionTimer } from "background/helpers/session";

/**
 * Handle a USER_ACTIVITY ping from an extension page.
 *
 * Rearms the idle auto-lock alarm by delegating to
 * `sessionTimer.resetSession()`. The popup-side `useActivityPing` hook
 * only attaches event listeners while the wallet is unlocked, and
 * `popupMessageListener` gates this message behind `isFromExtensionPage`
 * so dApp content scripts cannot reach it — so a ping arriving here is
 * already proof of genuine user activity in an unlocked extension page.
 *
 * In the unlikely race where the wallet locks between the user's input
 * and the popup tearing down its listeners, an extra `resetSession()`
 * just (re)schedules an alarm that will fire on a locked session and
 * be a no-op when `clearSession` runs against state that's already
 * cleared.
 */
export const userActivity = async ({
  sessionTimer,
}: {
  sessionTimer: SessionTimer;
}) => {
  await sessionTimer.resetSession();
  return { ok: true };
};
