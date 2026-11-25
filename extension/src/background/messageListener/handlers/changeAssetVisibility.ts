import { Store } from "redux";

import { ChangeAssetVisibilityMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { setAssetVisibility } from "../helpers/hidden-assets";

export const changeAssetVisibility = async ({
  request,
  localStore,
  sessionStore,
}: {
  request: ChangeAssetVisibilityMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
}) => {
  const { assetVisibility, publicKey, network } = request;

  return setAssetVisibility({
    publicKey,
    network,
    canonical: assetVisibility.issuer,
    visibility: assetVisibility.visibility,
    localStore,
    sessionStore,
  });
};
