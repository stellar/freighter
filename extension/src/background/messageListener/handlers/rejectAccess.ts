import {
  RejectAccessMessage,
  ResponseQueue,
  RejectAccessResponse,
} from "@shared/api/types/message-request";
import { captureException } from "@sentry/browser";

export const rejectAccess = ({
  request,
  responseQueue,
}: {
  request: RejectAccessMessage;
  responseQueue: ResponseQueue<RejectAccessResponse>;
}) => {
  const { uuid } = request;

  if (!uuid) {
    captureException("rejectAccess: missing uuid in request");
    return;
  }

  const queueIndex = responseQueue.findIndex((item) => item.uuid === uuid);
  const responseQueueItem =
    queueIndex !== -1 ? responseQueue.splice(queueIndex, 1)[0] : undefined;
  if (responseQueueItem) {
    responseQueueItem.response(undefined);
  } else {
    captureException(
      `rejectAccess: no matching response found for uuid ${uuid}`,
    );
  }
};
