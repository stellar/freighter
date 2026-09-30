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

  const { hiddenAssets } = await getScopedHiddenAssets({
    localStore,
    publicKey: activePublicKey,
    networkName,
  });

  // `networkName` rides along because the request does not carry one, so the
  // response is the only thing that can say which network answered. The read
  // above happens after an `await`, so a network switch that commits mid-flight
  // returns the new network's map; the popup keys its mirror off this value
  // rather than the one it was on when it asked.
  return { hiddenAssets, networkName };
};
