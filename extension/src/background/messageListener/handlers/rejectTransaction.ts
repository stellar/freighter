import {
  ResponseQueue,
  TransactionQueue,
} from "@shared/api/types/message-request";

export const rejectTransaction = ({
  transactionQueue,
  responseQueue,
}: {
  transactionQueue: TransactionQueue;
  responseQueue: ResponseQueue;
}) => {
  transactionQueue.pop();
  const response = responseQueue.pop();
  if (response) {
    response();
  }
};
