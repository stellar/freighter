import { EditCustomNetworkMessage } from "@shared/api/types/message-request";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getSavedNetworks } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { NETWORK_ID, NETWORKS_LIST_ID } from "constants/localStorageTypes";

export const editCustomNetwork = async ({
  request,
  localStore,
}: {
  request: EditCustomNetworkMessage;
  localStore: DataStorageAccess;
}) => {
  const { networkDetails, networkIndex } = request;

  const savedNetworks = await getSavedNetworks({ localStore });
  const activeNetworkDetails =
    (await localStore.getItem(NETWORK_ID)) || MAINNET_NETWORK_DETAILS;
  const activeIndex =
    savedNetworks.findIndex(
      ({ networkName: savedNetworkName }) =>
        savedNetworkName === activeNetworkDetails.networkName,
    ) || 0;

  savedNetworks.splice(networkIndex, 1, networkDetails);

  await localStore.setItem(NETWORKS_LIST_ID, savedNetworks);

  if (activeIndex === networkIndex) {
    // editing active network, so we need to update this in storage
    await localStore.setItem(NETWORK_ID, savedNetworks[activeIndex]);
  }

  return {
    networksList: savedNetworks,
    networkDetails: savedNetworks[activeIndex],
  };
};
