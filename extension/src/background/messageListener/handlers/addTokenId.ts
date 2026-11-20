import { AddTokenIdMessage } from "@shared/api/types/message-request";
import { addTokenWithContractId } from "../helpers/add-token-contract-id";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const addTokenId = async ({
  request,
  localStore,
}: {
  request: AddTokenIdMessage;
  localStore: DataStorageAccess;
}) => {
  const { tokenId, network } = request;

  const response = await addTokenWithContractId({
    args: {
      contractId: tokenId,
      network,
    },
    localStore,
  });

  return response;
};
