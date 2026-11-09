import { SwapQuoteMode, SwapQuotesResponse } from "../types/backend-api";
import { postSwapBackend } from "./postSwapBackend";

export type SwapQuotesErrorKind = "badRequest" | "unavailable";

export class SwapQuotesError extends Error {
  kind: SwapQuotesErrorKind;

  constructor(kind: SwapQuotesErrorKind, message: string) {
    super(message);
    this.name = "SwapQuotesError";
    this.kind = kind;
  }
}

export const getSwapQuotes = ({
  network,
  account,
  mode,
  fromAsset,
  toAsset,
  amount,
}: {
  network: string;
  account: string;
  mode: SwapQuoteMode;
  fromAsset: string;
  toAsset: string;
  amount: string;
}): Promise<SwapQuotesResponse> =>
  postSwapBackend({
    path: `/swap/quotes?network=${network}`,
    body: { account, mode, fromAsset, toAsset, amount },
    isValid: (data): data is SwapQuotesResponse =>
      Array.isArray((data as SwapQuotesResponse | undefined)?.routes),
    // A 400 is the input (e.g. an unfunded account), not an outage.
    quietStatuses: { 400: "badRequest" as const },
    toError: (kind, message) => new SwapQuotesError(kind, message),
    unreachableMessage: "Failed to reach swap quotes",
    failedMessage: "Failed to fetch swap quotes",
  });
