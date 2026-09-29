import { ChangeCollectibleVisibilityMessage } from "@shared/api/types/message-request";
import { getNetworkDetails } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { resolveHiddenCollectiblesStore } from "../helpers/get-hidden-collectibles";
import { HIDDEN_COLLECTIBLES } from "constants/localStorageTypes";

export const changeCollectibleVisibility = async ({
  request,
  localStore,
}: {
  request: ChangeCollectibleVisibilityMessage;
  localStore: DataStorageAccess;
}) => {
  const { collectibleVisibility, activePublicKey } = request;
  const { networkName } = await getNetworkDetails({ localStore });

  // Resolved, not read: storage may still hold the pre-5.47.0 flat map, and
  // spreading an empty store over it would erase every earlier hide.
  const store = await resolveHiddenCollectiblesStore({
    localStore,
    publicKey: activePublicKey,
  });
  const byNetwork = store[networkName] || {};
  const hiddenCollectibles = {
    ...byNetwork[activePublicKey],
    [collectibleVisibility.collectible]: collectibleVisibility.visibility,
  };

  await localStore.setItem(HIDDEN_COLLECTIBLES, {
    ...store,
    [networkName]: {
      ...byNetwork,
      [activePublicKey]: hiddenCollectibles,
    },
  });

  // Return only this account's leaf, so a caller cannot accidentally treat the
  // whole store as a visibility map. `networkName` rides along because the
  // request does not carry one: the popup mirrors this leaf under a network
  // key, and a switch that commits while this write is in flight would
  // otherwise leave it filing the map under the network it *was* on.
  return { hiddenCollectibles, networkName };
};
