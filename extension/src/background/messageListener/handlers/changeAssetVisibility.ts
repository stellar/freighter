import { ChangeAssetVisibilityMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getHiddenAssets } from "../helpers/get-hidden-assets";
import { HIDDEN_ASSETS } from "constants/localStorageTypes";

export const changeAssetVisibility = async ({
  request,
  localStore,
}: {
  request: ChangeAssetVisibilityMessage;
  localStore: DataStorageAccess;
}) => {
  const { assetVisibility } = request;

  const { hiddenAssets } = await getHiddenAssets({ localStore });
  hiddenAssets[assetVisibility.issuer] = assetVisibility.visibility;

  await localStore.setItem(HIDDEN_ASSETS, hiddenAssets);
  return { hiddenAssets };
};
