import {
  HandleSignedHWPayloadMessage,
  ResponseQueue,
  SignedHwPayloadResponse,
} from "@shared/api/types/message-request";
import { captureException } from "@sentry/browser";

import { SessionTimer } from "background/helpers/session";

export const handleSignedHwPayload = async ({
  request,
  responseQueue,
  sessionTimer,
}: {
  request: HandleSignedHWPayloadMessage;
  responseQueue: ResponseQueue<SignedHwPayloadResponse>;
  sessionTimer: SessionTimer;
}) => {
  const { signedPayload, uuid } = request;

  if (!uuid) {
    captureException("handleSignedHwPayload: missing uuid in request");
    return { error: "Transaction not found" };
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
    // A user just completed a hardware-wallet signature — that is a
    // real user action, so extend the idle session. We only rearm on
    // the success branch; a malformed request or a missing queue
    // entry is never a legitimate signal of user presence and must
    // not be allowed to extend the deadline.
    await sessionTimer.resetSession();
    transactionResponse.response(signedPayload);
    return {};
  }

  captureException(
    `handleSignedHwPayload: no matching response found for uuid ${uuid}`,
  );
  return { error: "Session timed out" };
};
