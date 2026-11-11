import { captureException } from "@sentry/browser";

import { fetchBackendV2 } from "./fetchBackendV2";
import { redactErrorBody } from "./redactErrorBody";

/**
 * POSTs to a freighter-backend-v2 swap route and unwraps `data`. An
 * unreachable backend, an unexpected status or an invalid 200 is "unavailable"
 * and reported to Sentry; statuses in `quietStatuses` map to their kind and are
 * not reported, since they describe the request rather than an outage.
 * `report: false` leaves reporting to the caller.
 */
export const postSwapBackend = async <T, K extends string>({
  path,
  body,
  isValid,
  quietStatuses,
  toError,
  unreachableMessage,
  failedMessage,
  report = true,
}: {
  path: string;
  body: unknown;
  isValid: (data: unknown) => data is T;
  quietStatuses: Record<number, K>;
  toError: (kind: K | "unavailable", message: string) => Error;
  unreachableMessage: string;
  failedMessage: string;
  report?: boolean;
}): Promise<T> => {
  let status: number;
  let responseBody: unknown;
  try {
    ({ status, body: responseBody } = await fetchBackendV2({
      method: "POST",
      path,
      body: JSON.stringify(body),
    }));
  } catch (e) {
    const message = `${unreachableMessage} - ${e instanceof Error ? e.message : String(e)}`;
    if (report) captureException(message);
    throw toError("unavailable", message);
  }

  const data = (responseBody as { data?: unknown } | null)?.data;
  if (status === 200 && isValid(data)) {
    return data;
  }

  const message = `${failedMessage} - ${status}: ${redactErrorBody(responseBody)}`;
  const quietKind = quietStatuses[status];
  if (quietKind) {
    throw toError(quietKind, message);
  }
  if (report) captureException(message);
  throw toError("unavailable", message);
};
