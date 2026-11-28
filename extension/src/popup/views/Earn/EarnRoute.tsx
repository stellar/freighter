import React, { JSX } from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

import { SettingsState } from "@shared/api/types";
import { isEarnSupportedNetwork } from "@shared/constants/blend";
import { Loading } from "popup/components/Loading";
import { ROUTES } from "popup/constants/routes";
import {
  earnDepositSelector,
  isRemoteConfigInitializedSelector,
} from "popup/ducks/remoteConfig";
import {
  settingsNetworkDetailsSelector,
  settingsStateSelector,
} from "popup/ducks/settings";

/**
 * Holds the Earn route to what the Home tile is held to: the `earn_deposit`
 * flag, and a network with a pool. The tile is not the only way in. A typed or
 * restored `#/earn`, or the tab Earn opens for itself, arrives without it.
 *
 * The flag reads as off until the flags have loaded, so this waits for them
 * rather than turning every fresh load away. The network is known once the
 * settings have loaded, which Earn does itself on a fresh load, so it is
 * checked from then on.
 */
export const EarnRoute = ({ children }: { children: JSX.Element }) => {
  const isRemoteConfigInitialized = useSelector(
    isRemoteConfigInitializedSelector,
  );
  const isEarnDepositEnabled = useSelector(earnDepositSelector);
  const settingsState = useSelector(settingsStateSelector);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);

  if (!isRemoteConfigInitialized) {
    return <Loading />;
  }

  const isUnsupportedNetwork =
    settingsState === SettingsState.SUCCESS &&
    !isEarnSupportedNetwork(networkDetails);
  if (!isEarnDepositEnabled || isUnsupportedNetwork) {
    return <Navigate to={ROUTES.account} replace />;
  }

  return children;
};
