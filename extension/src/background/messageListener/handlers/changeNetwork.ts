import { ChangeNetworkMessage } from "@shared/api/types/message-request";
import { getSavedNetworks } from "background/helpers/account";
import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { NETWORK_ID } from "constants/localStorageTypes";

export const changeNetwork = async ({
  request,
  localStore,
}: {
  request: ChangeNetworkMessage;
  localStore: DataStorageAccess;
}) => {
  const { networkName } = request;

  const savedNetworks = await getSavedNetworks({ localStore });
  const networkDetails =
    savedNetworks.find(
      ({ networkName: savedNetworkName }) => savedNetworkName === networkName,
    ) || MAINNET_NETWORK_DETAILS;

  await localStore.setItem(NETWORK_ID, networkDetails);

  const isRpcHealthy = true;

  return { networkDetails, isRpcHealthy };
};
