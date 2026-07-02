import { Store } from "redux";
import { captureException } from "@sentry/browser";

import {
  AddTokenMessage,
  AddTokenResponse,
  ResponseQueue,
  TokenQueue,
} from "@shared/api/types/message-request";
import { isSacContractExecutable } from "@shared/helpers/soroban/token";
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
      let hasError = Boolean(response.error);

      if (hasError) {
        // Storage failed. For SAC/classic tokens a trustline was already
        // submitted and succeeded on-chain (the real operation), so don't
        // decline the dApp over a local write failure. SEP-41 tokens have no
        // trustline — this write is the whole operation — so surface it.
        const isTrustlineBacked = await isSacContractExecutable(
          tokenQueueItem.token.contractId,
          networkDetails,
        ).catch(() => false);
        if (isTrustlineBacked) {
          hasError = false;
        }
      }

      tokenResponse.response(!hasError);

      if (hasError) {
        return { error: response.error };
      }

      return {};
    }

    captureException(`addToken: no matching response found for uuid ${uuid}`);
  }

  return { error: "Session timed out" };
};
