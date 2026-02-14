import {
  ResponseQueue,
  TransactionQueue,
  RejectTransactionMessage,
  RejectTransactionResponse,
} from "@shared/api/types/message-request";
import { captureException } from "@sentry/browser";

export const rejectTransaction = ({
  request,
  transactionQueue,
  responseQueue,
}: {
  request: RejectTransactionMessage;
  transactionQueue: TransactionQueue;
  responseQueue: ResponseQueue<RejectTransactionResponse>;
}) => {
  const { uuid } = request;

  if (!uuid) {
    captureException("rejectTransaction: missing uuid in request");
    return;
  }

  const txQueueIndex = transactionQueue.findIndex((item) => item.uuid === uuid);
  if (txQueueIndex !== -1) {
    transactionQueue.splice(txQueueIndex, 1);
  }

  const responseIndex = responseQueue.findIndex((item) => item.uuid === uuid);
  const responseQueueItem =
    responseIndex !== -1
      ? responseQueue.splice(responseIndex, 1)[0]
      : undefined;
  if (responseQueueItem) {
    responseQueueItem.response(undefined);
  } else {
    captureException(
      `rejectTransaction: no matching response found for uuid ${uuid}`,
    );
  }
};
