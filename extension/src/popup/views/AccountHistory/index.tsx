import React from "react";
import { useSelector } from "react-redux";

import { historyV2Selector } from "popup/ducks/remoteConfig";

import { AccountHistoryLegacy } from "./AccountHistoryLegacy";
import { AccountHistoryV2 } from "./AccountHistoryV2";

/**
 * Routes between the legacy (v1, operation-centric) history and the redesigned
 * (v2, state-change-driven) history based on the use_history_v2 Amplitude
 * flag. The v2 view itself falls back to the legacy view for networks the v2
 * backend doesn't serve (until the U8 Horizon adapter lands).
 */
export const AccountHistory = () => {
  const useHistoryV2 = useSelector(historyV2Selector);
  return useHistoryV2 ? <AccountHistoryV2 /> : <AccountHistoryLegacy />;
};
