import { SwapTxRequest, SwapTxResponse } from "../types/backend-api";
import { postSwapBackend } from "./postSwapBackend";

// quoteMoved: the backend's 409 quote_moved, a fresh quote is needed.
export type SwapTxErrorKind = "quoteMoved" | "badRequest" | "unavailable";

export class SwapTxError extends Error {
  kind: SwapTxErrorKind;

  constructor(kind: SwapTxErrorKind, message: string) {
    super(message);
    this.name = "SwapTxError";
    this.kind = kind;
  }
}

export const buildSwapTx = ({
  network,
  ...request
}: SwapTxRequest & { network: string }): Promise<SwapTxResponse> =>
  postSwapBackend({
    path: `/swap/tx?network=${network}`,
    body: request,
    isValid: (data): data is SwapTxResponse => {
      const xdr = (data as SwapTxResponse | undefined)?.xdr;
      return typeof xdr === "string" && !!xdr;
    },
    quietStatuses: {
      400: "badRequest" as const,
      409: "quoteMoved" as const,
    },
    toError: (kind, message) => new SwapTxError(kind, message),
    unreachableMessage: "Failed to reach swap tx",
    failedMessage: "Failed to build swap tx",
  });
