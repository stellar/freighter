import React from "react";
import { useSelector } from "react-redux";

import { isCustomNetwork } from "@shared/helpers/stellar";
import { PASSPHRASE_TO_V2_NETWORK } from "@shared/constants/stellar";
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
 * Two conditions route to the legacy view regardless of the flag, and both are
 * needed:
 *  - Custom networks (network === CUSTOM_NETWORK): the user pointed the wallet
 *    at their own Horizon/RPC, so serve history from *that* network via the
 *    legacy view (getAccountHistoryStandalone reads it directly) — even when
 *    the custom network reuses a pubnet/testnet passphrase that the v2 backend
 *    could technically answer for.
 *  - Passphrases absent from PASSPHRASE_TO_V2_NETWORK: the v2 backend only
 *    indexes pubnet and testnet, and getAccountHistoryV2 throws for anything
 *    else. Futurenet is the case isCustomNetwork misses — it is a built-in
 *    network, not CUSTOM_NETWORK, so without this check the flag being on
 *    would mount AccountHistoryV2 and every fetch would error where legacy
 *    Horizon history works.
 * Everything else follows the use_history_v2 Amplitude flag.
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

  const isV2Servable =
    !isCustomNetwork(networkDetails) &&
    Boolean(PASSPHRASE_TO_V2_NETWORK[networkDetails.networkPassphrase]);

  return useHistoryV2 && isV2Servable ? (
    <AccountHistoryV2 />
  ) : (
    <AccountHistoryLegacy />
  );
};
