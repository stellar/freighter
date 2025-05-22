import {
  ResponseQueue,
  TransactionQueue,
  RejectTransactionResponse,
} from "@shared/api/types/message-request";

export const rejectTransaction = ({
  transactionQueue,
  responseQueue,
}: {
  transactionQueue: TransactionQueue;
  responseQueue: ResponseQueue<RejectTransactionResponse>;
}) => {
  transactionQueue.pop();
  const response = responseQueue.pop();
  if (response) {
    response(undefined);
  }
};
