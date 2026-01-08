import { AddCollectibleMessage } from "@shared/api/types/message-request";
import { CollectibleContract } from "@shared/api/types/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { COLLECTIBLES_ID } from "constants/localStorageTypes";

export const addCollectible = async ({
  request,
  localStore,
}: {
  request: AddCollectibleMessage;
  localStore: DataStorageAccess;
}) => {
  const { network, publicKey, collectibleContractAddress, collectibleTokenId } =
    request;

  const collectibles = (await localStore.getItem(COLLECTIBLES_ID)) || {};
  const networkCollectibles = collectibles[network] || {};

  const accountCollectibles: CollectibleContract[] =
    networkCollectibles[publicKey] || [];

  // does collectible contract already exist?
  const collectibleContract = accountCollectibles.find(
    (contract) => contract.id === collectibleContractAddress,
  );
  if (collectibleContract?.tokenIds.includes(collectibleTokenId)) {
    return { error: "Collectible contract already exists" };
  }

  if (collectibleContract) {
    collectibleContract.tokenIds.push(collectibleTokenId);
  } else {
    accountCollectibles.push({
      id: collectibleContractAddress,
      tokenIds: [collectibleTokenId],
    });
  }

  await localStore.setItem(COLLECTIBLES_ID, {
    ...collectibles,
    [network]: {
      ...networkCollectibles,
      [publicKey]: accountCollectibles,
    },
  });

  return { collectiblesList: accountCollectibles };
};
