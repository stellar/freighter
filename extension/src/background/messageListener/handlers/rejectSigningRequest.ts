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

/**
 * Rejects a pending signing request by UUID, removing it from every queue
 * (responseQueue, transactionQueue, blobQueue, authEntryQueue, tokenQueue).
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
  responseQueue: ResponseQueue<AnySigningResponse>;
  transactionQueue: TransactionQueue;
  blobQueue: BlobQueue;
  authEntryQueue: EntryQueue;
  tokenQueue: TokenQueue;
}) => {
  const { uuid } = request;

  if (!uuid) {
    captureException("rejectSigningRequest: missing uuid in request");
    return {};
  }

  // Resolve (reject) the dapp's pending promise
  const responseIndex = responseQueue.findIndex((item) => item.uuid === uuid);
  if (responseIndex !== -1) {
    const responseQueueItem = responseQueue.splice(responseIndex, 1)[0];
    responseQueueItem.response(undefined);
  } else {
    captureException(
      `rejectSigningRequest: no matching response found for uuid ${uuid}`,
    );
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

  return {};
};
