import { GetHiddenAssetsMessage } from "@shared/api/types/message-request";
import { getNetworkDetails } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getHiddenAssets as getScopedHiddenAssets } from "../helpers/get-hidden-assets";

export const getHiddenAssets = async ({
  request,
  localStore,
}: {
  request: GetHiddenAssetsMessage;
  localStore: DataStorageAccess;
}) => {
  const { activePublicKey } = request;
  // The background owns NETWORK_ID, so resolve the network here rather than
  // letting the popup pass one that could disagree with it.
  const { networkName } = await getNetworkDetails({ localStore });

  return getScopedHiddenAssets({
    localStore,
    publicKey: activePublicKey,
    networkName,
  });
};
