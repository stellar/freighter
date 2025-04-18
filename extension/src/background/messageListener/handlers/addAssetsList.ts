import { AddAssetsListMessage } from "@shared/api/types/message-request";
import { getAssetsLists } from "background/helpers/account";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { ASSETS_LISTS_ID } from "constants/localStorageTypes";

export const addAssetsList = async ({
  request,
  localStore,
}: {
  request: AddAssetsListMessage;
  localStore: DataStorageAccess;
}) => {
  const { assetsList, network } = request;

  const currentAssetsLists = await getAssetsLists({ localStore });

  if (
    currentAssetsLists[network].some(
      (list: { url: string }) => list.url === assetsList.url,
    )
  ) {
    return {
      error: "Asset list already exists",
    };
  }

  currentAssetsLists[network].push(assetsList);

  await localStore.setItem(ASSETS_LISTS_ID, currentAssetsLists);

  return { assetsLists: await getAssetsLists({ localStore }) };
};
