import {
  HandleSignedHWPayloadMessage,
  ResponseQueue,
  SignedHwPayloadResponse,
} from "@shared/api/types/message-request";
import { captureException } from "@sentry/browser";

export const handleSignedHwPayload = ({
  request,
  responseQueue,
}: {
  request: HandleSignedHWPayloadMessage;
  responseQueue: ResponseQueue<SignedHwPayloadResponse>;
}) => {
  const { signedPayload, uuid } = request;

  if (!uuid) {
    captureException("handleSignedHwPayload: missing uuid in request");
    return { error: "Missing uuid" };
  }

  const responseIndex = responseQueue.findIndex((item) => item.uuid === uuid);
  const transactionResponse =
    responseIndex !== -1
      ? responseQueue.splice(responseIndex, 1)[0]
      : undefined;

  if (
    transactionResponse &&
    typeof transactionResponse.response === "function"
  ) {
    transactionResponse.response(signedPayload);
    return {};
  }

  captureException(
    `handleSignedHwPayload: no matching response found for uuid ${uuid}`,
  );
  return { error: "Session timed out" };
};
