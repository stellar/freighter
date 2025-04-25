import { RemoveCustomNetworkMessage } from "@shared/api/types/message-request";
import { getSavedNetworks } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { NETWORKS_LIST_ID } from "constants/localStorageTypes";

export const removeCustomNetwork = async ({
  request,
  localStore,
}: {
  request: RemoveCustomNetworkMessage;
  localStore: DataStorageAccess;
}) => {
  const { networkName } = request;

  const savedNetworks = await getSavedNetworks({ localStore });
  const networkIndex = savedNetworks.findIndex(
    ({ networkName: savedNetworkName }) => savedNetworkName === networkName,
  );

  savedNetworks.splice(networkIndex, 1);

  await localStore.setItem(NETWORKS_LIST_ID, savedNetworks);

  return {
    networksList: savedNetworks,
  };
};
