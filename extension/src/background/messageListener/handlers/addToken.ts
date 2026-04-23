import { Store } from "redux";
import { captureException } from "@sentry/browser";

import {
  AddTokenMessage,
  AddTokenResponse,
  ResponseQueue,
  TokenQueue,
} from "@shared/api/types/message-request";
import { publicKeySelector } from "background/ducks/session";
import { getNetworkDetails } from "background/helpers/account";
import { addTokenWithContractId } from "../helpers/add-token-contract-id";
import { DataStorageAccess } from "background/helpers/dataStorageAccess";

export const addToken = async ({
  request,
  localStore,
  sessionStore,
  tokenQueue,
  responseQueue,
}: {
  request: AddTokenMessage;
  localStore: DataStorageAccess;
  sessionStore: Store;
  tokenQueue: TokenQueue;
  responseQueue: ResponseQueue<AddTokenResponse>;
}) => {
  const { uuid } = request;

  if (!uuid) {
    captureException("addToken: missing uuid in request");
    return { error: "Transaction not found" };
  }

  const publicKey = publicKeySelector(sessionStore.getState());
  const networkDetails = await getNetworkDetails({ localStore });

  if (publicKey.length) {
    const tokenIndex = tokenQueue.findIndex((item) => item.uuid === uuid);
    const tokenQueueItem =
      tokenIndex !== -1 ? tokenQueue.splice(tokenIndex, 1)[0] : undefined;

    if (!tokenQueueItem?.token?.contractId) {
      throw Error("Missing contract id");
    }

    const response = await addTokenWithContractId({
      args: {
        contractId: tokenQueueItem.token.contractId,
        network: networkDetails.network,
        publicKey,
      },
      localStore,
    });

    const responseIndex = responseQueue.findIndex((item) => item.uuid === uuid);
    const tokenResponse =
      responseIndex !== -1
        ? responseQueue.splice(responseIndex, 1)[0]
        : undefined;

    if (tokenResponse && typeof tokenResponse.response === "function") {
      tokenResponse.response(!response.error);
      return {};
    }

    captureException(`addToken: no matching response found for uuid ${uuid}`);
  }

  return { error: "Session timed out" };
};
