import { Store } from "redux";

import { GetHiddenAssetsMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getHiddenAssets as getAccountHiddenAssets } from "../helpers/hidden-assets";

export const getHiddenAssets = async ({
  request,
  localStore,
  sessionStore,
}: {
  request: GetHiddenAssetsMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const { publicKey, network } = request;

  return getAccountHiddenAssets({
    publicKey,
    network,
    localStore,
    sessionStore,
  });
};
