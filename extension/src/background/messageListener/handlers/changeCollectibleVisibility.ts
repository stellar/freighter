import { ChangeCollectibleVisibilityMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "../../helpers/dataStorageAccess";
import { getHiddenCollectibles } from "./getHiddenCollectibles";
import { HIDDEN_COLLECTIBLES } from "../../../constants/localStorageTypes";

export const changeCollectibleVisibility = async ({
  request,
  localStore,
}: {
  request: ChangeCollectibleVisibilityMessage;
  localStore: DataStorageAccess;
}) => {
  const { collectibleVisibility } = request;

  const { hiddenCollectibles } = await getHiddenCollectibles({ localStore });
  hiddenCollectibles[collectibleVisibility.collectible] =
    collectibleVisibility.visibility;

  await localStore.setItem(HIDDEN_COLLECTIBLES, hiddenCollectibles);
  return { hiddenCollectibles };
};
