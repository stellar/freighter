import { RemoveCollectibleMessage } from "@shared/api/types/message-request";
import { CollectibleContract } from "@shared/api/types/types";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { COLLECTIBLES_ID } from "constants/localStorageTypes";

/**
 * Removing a collectible is a local delete, not an on-chain operation: a
 * collectible is only ever an entry this wallet tracks, so there is no
 * trustline to close and nothing to sign. The inverse of `addCollectible`.
 */
export const removeCollectible = async ({
  request,
  localStore,
}: {
  request: RemoveCollectibleMessage;
  localStore: DataStorageAccess;
}) => {
  const { network, publicKey, collectibleContractAddress, collectibleTokenId } =
    request;

  const collectibles = (await localStore.getItem(COLLECTIBLES_ID)) || {};
  const networkCollectibles = collectibles[network] || {};
  const accountCollectibles: CollectibleContract[] =
    networkCollectibles[publicKey] || [];

  const collectibleContract = accountCollectibles.find(
    (contract) => contract.id === collectibleContractAddress,
  );

  if (!collectibleContract?.tokenIds.includes(collectibleTokenId)) {
    return { error: "Collectible not found" };
  }

  collectibleContract.tokenIds = collectibleContract.tokenIds.filter(
    (tokenId) => tokenId !== collectibleTokenId,
  );

  // Drop the contract once its last token goes, so an empty collection does
  // not linger in the list as a headerless, rowless group.
  const remaining = collectibleContract.tokenIds.length
    ? accountCollectibles
    : accountCollectibles.filter(
        (contract) => contract.id !== collectibleContractAddress,
      );

  await localStore.setItem(COLLECTIBLES_ID, {
    ...collectibles,
    [network]: {
      ...networkCollectibles,
      [publicKey]: remaining,
    },
  });

  return { collectiblesList: remaining };
};
