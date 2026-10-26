import { Store } from "redux";

import { GetHiddenCollectiblesMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getHiddenCollectibles as getAccountHiddenCollectibles } from "../helpers/hidden-collectibles";

export const getHiddenCollectibles = async ({
  request,
  localStore,
  sessionStore,
}: {
  request: GetHiddenCollectiblesMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const { publicKey, network } = request;

  return getAccountHiddenCollectibles({
    publicKey,
    network,
    localStore,
    sessionStore,
  });
};
