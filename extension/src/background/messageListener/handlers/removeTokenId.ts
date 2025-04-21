import { RemoveTokenIdMessage } from "@shared/api/types/message-request";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { KEY_ID, TOKEN_ID_LIST } from "constants/localStorageTypes";

export const removeTokenId = async ({
  request,
  localStore,
}: {
  request: RemoveTokenIdMessage;
  localStore: DataStorageAccess;
}) => {
  const { contractId, network } = request;

  const tokenIdsList = (await localStore.getItem(TOKEN_ID_LIST)) || {};
  const tokenIdsByNetwork = tokenIdsList[network] || {};
  const keyId = (await localStore.getItem(KEY_ID)) || "";

  const accountTokenIdList = tokenIdsByNetwork[keyId] || [];
  const updatedTokenIdList = accountTokenIdList.filter(
    (id: string) => id !== contractId,
  );

  await localStore.setItem(TOKEN_ID_LIST, {
    ...tokenIdsList,
    [network]: {
      [keyId]: updatedTokenIdList,
    },
  });

  return { tokenIdList: updatedTokenIdList };
};
