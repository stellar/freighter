import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import browser from "webextension-polyfill";

import { SERVICE_TYPES } from "@shared/constants/services";
import { ROUTES } from "popup/constants/routes";
import { lockAccount } from "popup/ducks/accountServices";

/**
 * Listens for the background's `SESSION_LOCKED` broadcast (fired when
 * the idle auto-lock alarm elapses) and flips the popup over to the
 * unlock screen immediately, instead of leaving stale account/asset
 * views on screen until the next data refetch.
 *
 * Mounted inside `<HashRouter>` so it can use `useNavigate`. Every
 * Freighter UI surface (popup, sidebar, standalone signing window,
 * grant-access window) renders the same `<App>` → `<Router>` tree, so
 * one mount covers all of them.
 */
export const SessionLockListener = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (message: unknown) => {
      if (typeof message !== "object" || message === null) return undefined;
      const { type } = message as { type?: unknown };
      if (type !== SERVICE_TYPES.SESSION_LOCKED) return undefined;
      dispatch(lockAccount());
      navigate(ROUTES.unlockAccount);
      return undefined;
    };

    browser.runtime.onMessage.addListener(handler);
    return () => {
      browser.runtime.onMessage.removeListener(handler);
    };
  }, [dispatch, navigate]);

  return null;
};
