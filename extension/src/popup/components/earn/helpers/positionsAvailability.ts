import { Store } from "redux";

import { isEarnSupportedNetwork } from "@shared/constants/blend";
import { NetworkDetails } from "@shared/constants/stellar";
import { AppState } from "popup/App";
import {
  positionsEnabledSelector,
  waitForRemoteConfig,
} from "popup/ducks/remoteConfig";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

/**
 * Whether Home has a Positions tab: the `positions_enabled` flag is on, on a
 * network where Earn has a pool. The tab row and the Home view both ask this.
 */
export const canShowPositionsSelector = (state: AppState): boolean =>
  positionsEnabledSelector(state) &&
  isEarnSupportedNetwork(settingsNetworkDetailsSelector(state));

/**
 * The same rule for a read about to start on `networkDetails`, once the flags
 * have loaded. False means no positions, pools or earn-options request.
 */
export const waitForPositionsAvailable = async (
  store: Store<AppState>,
  networkDetails: NetworkDetails,
): Promise<boolean> => {
  if (!isEarnSupportedNetwork(networkDetails)) {
    return false;
  }
  await waitForRemoteConfig(store);
  return positionsEnabledSelector(store.getState());
};
