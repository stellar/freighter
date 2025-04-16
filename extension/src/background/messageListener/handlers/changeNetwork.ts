import { Store } from "redux";

import { ChangeNetworkMessage } from "@shared/api/types/message-request";
import { getSavedNetworks, subscribeAccount } from "background/helpers/account";
import { publicKeySelector } from "background/ducks/session";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { NETWORK_ID } from "constants/localStorageTypes";

export const changeNetwork = async ({
  request,
  sessionStore,
  localStore,
}: {
  request: ChangeNetworkMessage;
  sessionStore: Store;
  localStore: DataStorageAccess;
}) => {
  const { networkName } = request;
  const currentState = sessionStore.getState();

  const savedNetworks = await getSavedNetworks({ localStore });
  const publicKey = publicKeySelector(currentState);
  const networkDetails =
    savedNetworks.find(
      ({ networkName: savedNetworkName }) => savedNetworkName === networkName,
    ) || MAINNET_NETWORK_DETAILS;

  await localStore.setItem(NETWORK_ID, networkDetails);
  await subscribeAccount({ publicKey, localStore });

  const isRpcHealthy = true;

  return { networkDetails, isRpcHealthy };
};
