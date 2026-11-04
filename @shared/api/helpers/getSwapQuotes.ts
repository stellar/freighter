import { captureException } from "@sentry/browser";

import { SwapQuoteMode, SwapQuotesResponse } from "../types/backend-api";
import { fetchBackendV2 } from "./fetchBackendV2";
import { redactErrorBody } from "./redactErrorBody";

export type SwapQuotesErrorKind = "badRequest" | "unavailable";

export class SwapQuotesError extends Error {
  kind: SwapQuotesErrorKind;

  constructor(kind: SwapQuotesErrorKind, message: string) {
    super(message);
    this.name = "SwapQuotesError";
    this.kind = kind;
  }
}

export const getSwapQuotes = async ({
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
}): Promise<SwapQuotesResponse> => {
  const { status, body } = await fetchBackendV2({
    method: "POST",
    path: `/swap/quotes?network=${network}`,
    body: JSON.stringify({ account, mode, fromAsset, toAsset, amount }),
  });

  const data = (body as { data?: SwapQuotesResponse } | null)?.data;
  if (status === 200 && Array.isArray(data?.routes)) {
    return data;
  }

  const message = `Failed to fetch swap quotes - ${status}: ${redactErrorBody(body)}`;
  // A 400 is the input (e.g. an unfunded account), not an outage.
  if (status === 400) {
    throw new SwapQuotesError("badRequest", message);
  }
  captureException(message);
  throw new SwapQuotesError("unavailable", message);
};
