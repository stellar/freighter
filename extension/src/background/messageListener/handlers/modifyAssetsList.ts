import { ModifyAssetsListMessage } from "@shared/api/types/message-request";
import {
  AssetsListKey,
  DEFAULT_ASSETS_LISTS,
} from "@shared/constants/soroban/asset-list";
import { getAssetsLists } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { ASSETS_LISTS_ID } from "constants/localStorageTypes";

export const modifyAssetsList = async ({
  request,
  localStore,
}: {
  request: ModifyAssetsListMessage;
  localStore: DataStorageAccess;
}) => {
  const { assetsList, network, isDeleteAssetsList } = request;

  const currentAssetsLists = await getAssetsLists();
  const networkAssetsLists = currentAssetsLists[network];

  const index = networkAssetsLists.findIndex(
    ({ url }: { url: string }) => url === assetsList.url,
  );

  if (
    index < DEFAULT_ASSETS_LISTS[network as AssetsListKey].length &&
    isDeleteAssetsList
  ) {
    // if a user is somehow able to trigger a delete on a default asset list, return an error
    return { error: "Unable to delete asset list" };
  }

  if (isDeleteAssetsList) {
    networkAssetsLists.splice(index, 1);
  } else {
    networkAssetsLists.splice(index, 1, assetsList);
  }

  await localStore.setItem(ASSETS_LISTS_ID, currentAssetsLists);

  return { assetsLists: await getAssetsLists() };
};
