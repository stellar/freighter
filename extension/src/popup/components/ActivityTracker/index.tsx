import { useSelector } from "react-redux";

import { hasPrivateKeySelector } from "popup/ducks/accountServices";
import { useActivityPing } from "popup/helpers/hooks/useActivityPing";

/**
 * Thin redux-aware wrapper that drives the idle activity ping. Lives
 * inside `<Provider>` (mounted by `popup/App.tsx`) so it has access to
 * `hasPrivateKeySelector`, which is the canonical "wallet is unlocked"
 * signal across popup, sidebar, and standalone signing/grant-access
 * windows — all of which mount the same App.
 */
export const ActivityTracker = () => {
  const isUnlocked = useSelector(hasPrivateKeySelector);
  useActivityPing(isUnlocked);
  return null;
};
