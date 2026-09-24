import { GetHiddenCollectiblesMessage } from "@shared/api/types/message-request";
import { getNetworkDetails } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getHiddenCollectibles as getScopedHiddenCollectibles } from "../helpers/get-hidden-collectibles";

export const getHiddenCollectibles = async ({
  request,
  localStore,
}: {
  request: GetHiddenCollectiblesMessage;
  localStore: DataStorageAccess;
}) => {
  const { activePublicKey } = request;
  // The background owns NETWORK_ID, so resolve the network here rather than
  // letting the popup pass one that could disagree with it.
  const { networkName } = await getNetworkDetails({ localStore });

  return getScopedHiddenCollectibles({
    localStore,
    publicKey: activePublicKey,
    networkName,
  });
};
