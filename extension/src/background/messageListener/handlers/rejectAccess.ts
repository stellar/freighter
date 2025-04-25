import { ResponseQueue } from "@shared/api/types/message-request";

export const rejectAccess = ({
  responseQueue,
}: {
  responseQueue: ResponseQueue;
}) => {
  const response = responseQueue.pop();
  if (response) {
    response();
  }
};
