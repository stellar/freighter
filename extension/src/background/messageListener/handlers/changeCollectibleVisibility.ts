import { Store } from "redux";

import { ChangeCollectibleVisibilityMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { setCollectibleVisibility } from "../helpers/hidden-collectibles";

export const changeCollectibleVisibility = async ({
  request,
  localStore,
  sessionStore,
}: {
  request: ChangeCollectibleVisibilityMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const { collectibleVisibility, publicKey, network } = request;

  return setCollectibleVisibility({
    publicKey,
    network,
    collectible: collectibleVisibility.collectible,
    visibility: collectibleVisibility.visibility,
    localStore,
    sessionStore,
  });
};
