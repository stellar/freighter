import {
  HandleSignedHWPayloadMessage,
  ResponseQueue,
  SignedHwPayloadResponse,
} from "@shared/api/types/message-request";

export const handleSignedHwPayload = ({
  request,
  responseQueue,
}: {
  request: HandleSignedHWPayloadMessage;
  responseQueue: ResponseQueue<SignedHwPayloadResponse>;
}) => {
  const { signedPayload } = request;

  const transactionResponse = responseQueue.pop();

  if (typeof transactionResponse === "function") {
    transactionResponse(signedPayload);
    return {};
  }

  return { error: "Session timed out" };
};
