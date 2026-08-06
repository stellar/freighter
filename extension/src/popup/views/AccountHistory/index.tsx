import React from "react";
import { useSelector } from "react-redux";

import { isCustomNetwork } from "@shared/helpers/stellar";
import {
  historyV2Selector,
  isRemoteConfigInitializedSelector,
} from "popup/ducks/remoteConfig";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";
import { Loading } from "popup/components/Loading";

import { AccountHistoryLegacy } from "./AccountHistoryLegacy";
import { AccountHistoryV2 } from "./AccountHistoryV2";

/**
 * Routes between the legacy (v1, operation-centric) history and the redesigned
 * (v2, state-change-driven) history. This is the only place the choice is made
 * — neither view falls back to the other at runtime, and neither reaches for
 * the other's API.
 *
 * Custom networks always get the legacy view: the v2 backend only indexes
 * pubnet and testnet, while the legacy view reads Horizon and RPC directly
 * (see getAccountHistoryStandalone) and so still works against an arbitrary
 * network. Everything else follows the use_history_v2 Amplitude flag.
 *
 * Flags start out unresolved and default to off, so wait for them before
 * mounting either view: rendering on the default would mount the legacy view
 * and fire its Horizon request, only to swap it out when the flag lands.
 */
export const AccountHistory = () => {
  const isRemoteConfigInitialized = useSelector(
    isRemoteConfigInitializedSelector,
  );
  const useHistoryV2 = useSelector(historyV2Selector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  if (!isRemoteConfigInitialized) {
    return <Loading />;
  }

  return useHistoryV2 && !isCustomNetwork(networkDetails) ? (
    <AccountHistoryV2 />
  ) : (
    <AccountHistoryLegacy />
  );
};
