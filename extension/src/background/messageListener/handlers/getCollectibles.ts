import { GetCollectiblesMessage } from "@shared/api/types/message-request";
import { CollectibleContract } from "@shared/api/types/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { COLLECTIBLES_ID } from "constants/localStorageTypes";

export const getCollectibles = async ({
  request,
  localStore,
}: {
  request: GetCollectiblesMessage;
  localStore: DataStorageAccess;
}) => {
  const { publicKey, network } = request;

  const collectibles = (await localStore.getItem(COLLECTIBLES_ID)) || {};
  const networkCollectibles = collectibles[network] || {};

  const accountCollectibles: CollectibleContract[] =
    networkCollectibles[publicKey] || [];

  return { collectiblesList: accountCollectibles };
};
