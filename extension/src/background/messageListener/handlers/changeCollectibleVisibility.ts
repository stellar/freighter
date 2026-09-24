import { ChangeCollectibleVisibilityMessage } from "@shared/api/types/message-request";
import { getNetworkDetails } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getHiddenCollectiblesStore } from "../helpers/get-hidden-collectibles";
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

  const store = await getHiddenCollectiblesStore({ localStore });
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
  // whole store as a visibility map.
  return { hiddenCollectibles };
};
