import {
  ResponseQueue,
  RejectAccessResponse,
} from "@shared/api/types/message-request";

export const rejectAccess = ({
  responseQueue,
}: {
  responseQueue: ResponseQueue<RejectAccessResponse>;
}) => {
  const response = responseQueue.pop();
  if (response) {
    response(undefined);
  }
};
