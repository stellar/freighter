import { Store } from "redux";

import { ResponseQueue, TokenQueue } from "@shared/api/types/message-request";
import { publicKeySelector } from "background/ducks/session";
import { getNetworkDetails } from "background/helpers/account";
import { addTokenWithContractId } from "../helpers/add-token-contract-id";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const addToken = async ({
  localStore,
  sessionStore,
  tokenQueue,
  responseQueue,
}: {
  localStore: DataStorageAccess;
  sessionStore: Store;
  tokenQueue: TokenQueue;
  responseQueue: ResponseQueue;
}) => {
  const publicKey = publicKeySelector(sessionStore.getState());
  const networkDetails = await getNetworkDetails({ localStore });

  if (publicKey.length) {
    const tokenInfo = tokenQueue.pop();

    if (!tokenInfo?.contractId) {
      throw Error("Missing contract id");
    }

    const response = await addTokenWithContractId({
      args: {
        contractId: tokenInfo.contractId,
        network: networkDetails.network,
        publicKey,
      },
      localStore,
    });

    const tokenResponse = responseQueue.pop();

    if (typeof tokenResponse === "function") {
      // We're only interested here if it was a success or not
      tokenResponse(!response.error);
      return {};
    }
  }

  return { error: "Session timed out" };
};
