import { GetTokenIdsMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KEY_ID, TOKEN_ID_LIST } from "constants/localStorageTypes";

export const getTokenIds = async ({
  request,
  localStore,
}: {
  request: GetTokenIdsMessage;
  localStore: DataStorageAccess;
}) => {
  const { network } = request;
  const tokenIdsByNetwork = (await localStore.getItem(TOKEN_ID_LIST)) || {};
  const tokenIdsByKey = tokenIdsByNetwork[network] || {};
  const keyId = (await localStore.getItem(KEY_ID)) || "";

  return { tokenIdList: tokenIdsByKey[keyId] || [] };
};
