import {
  RejectSigningRequestMessage,
  ResponseQueue,
  TransactionQueue,
  BlobQueue,
  EntryQueue,
  TokenQueue,
  RequestAccessResponse,
  SignTransactionResponse,
  SignBlobResponse,
  SignAuthEntryResponse,
  AddTokenResponse,
  SetAllowedStatusResponse,
} from "@shared/api/types/message-request";
import { captureException } from "@sentry/browser";

type AnySigningResponse =
  | RequestAccessResponse
  | SignTransactionResponse
  | SignBlobResponse
  | SignAuthEntryResponse
  | AddTokenResponse
  | SetAllowedStatusResponse
  | undefined;

interface AllQueues {
  responseQueue: ResponseQueue<AnySigningResponse>;
  transactionQueue: TransactionQueue;
  blobQueue: BlobQueue;
  authEntryQueue: EntryQueue;
  tokenQueue: TokenQueue;
}

/**
 * Removes a UUID from every queue (responseQueue, transactionQueue, blobQueue,
 * authEntryQueue, tokenQueue), resolving the dapp's pending promise with
 * `undefined`. Returns true if a matching response was found and resolved.
 *
 * Shared by the REJECT_SIGNING_REQUEST handler and the sidebar disconnect
 * cleanup so queue-cleanup logic stays in one place.
 */
export const removeUuidFromAllQueues = (
  uuid: string,
  {
    responseQueue,
    transactionQueue,
    blobQueue,
    authEntryQueue,
    tokenQueue,
  }: AllQueues,
): boolean => {
  let foundResponse = false;

  // Resolve (reject) the dapp's pending promise
  const responseIndex = responseQueue.findIndex((item) => item.uuid === uuid);
  if (responseIndex !== -1) {
    const responseQueueItem = responseQueue.splice(responseIndex, 1)[0];
    responseQueueItem.response(undefined);
    foundResponse = true;
  }

  // Clean up all data queues so stale entries don't accumulate
  const txIndex = transactionQueue.findIndex((item) => item.uuid === uuid);
  if (txIndex !== -1) transactionQueue.splice(txIndex, 1);

  const blobIndex = blobQueue.findIndex((item) => item.uuid === uuid);
  if (blobIndex !== -1) blobQueue.splice(blobIndex, 1);

  const authIndex = authEntryQueue.findIndex((item) => item.uuid === uuid);
  if (authIndex !== -1) authEntryQueue.splice(authIndex, 1);

  const tokenIndex = tokenQueue.findIndex((item) => item.uuid === uuid);
  if (tokenIndex !== -1) tokenQueue.splice(tokenIndex, 1);

  return foundResponse;
};

/**
 * Rejects a pending signing request by UUID, removing it from every queue.
 * This ensures the dapp's promise resolves immediately rather than waiting
 * for the TTL timeout.
 */
export const rejectSigningRequest = ({
  request,
  responseQueue,
  transactionQueue,
  blobQueue,
  authEntryQueue,
  tokenQueue,
}: {
  request: RejectSigningRequestMessage;
} & AllQueues) => {
  const { uuid } = request;

  if (!uuid) {
    captureException("rejectSigningRequest: missing uuid in request");
    return {};
  }

  const foundResponse = removeUuidFromAllQueues(uuid, {
    responseQueue,
    transactionQueue,
    blobQueue,
    authEntryQueue,
    tokenQueue,
  });

  if (!foundResponse) {
    captureException(
      `rejectSigningRequest: no matching response found for uuid ${uuid}`,
    );
  }

  return {};
};
