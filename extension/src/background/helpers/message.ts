import { ExternalRequest, Response } from "@shared/api/types";

export const isResponse = (
  message: ExternalRequest | Response,
): message is Response => "messagedId" in message;

export const isExternalMessage = (
  message: ExternalRequest | Response,
): message is ExternalRequest => !("messagedId" in message);
