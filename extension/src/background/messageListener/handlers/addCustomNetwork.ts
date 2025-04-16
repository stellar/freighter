import { AddCustomNetworkMessage } from "@shared/api/types/message-request";
import { NetworkDetails } from "@shared/constants/stellar";
import { getSavedNetworks } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { NETWORKS_LIST_ID } from "constants/localStorageTypes";

export const addCustomNetwork = async ({
  request,
  localStore,
}: {
  request: AddCustomNetworkMessage;
  localStore: DataStorageAccess;
}) => {
  const { networkDetails } = request;
  const savedNetworks = await getSavedNetworks({ localStore });

  // Network Name already used
  if (
    savedNetworks.find(
      ({ networkName }: { networkName: string }) =>
        networkName === networkDetails.networkName,
    )
  ) {
    return {
      error: "Network name is already in use",
    };
  }

  const networksList: NetworkDetails[] = [...savedNetworks, networkDetails];

  await localStore.setItem(NETWORKS_LIST_ID, networksList);

  return {
    networksList,
  };
};
