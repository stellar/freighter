import { SERVICE_TYPES } from "@shared/constants/services";
import { sendMessageToBackground } from "./extensionMessaging";

export interface FetchBackendV2Result {
  status: number;
  /**
   * Parsed JSON body from callBackendV2 (includes non-2xx error payloads);
   * null if the body wasn't JSON.
   */
  body: unknown;
}

/**
 * Popup-side wrapper for the FETCH_BACKEND_V2 background message — the single
 * entry point to the freighter-backend-v2 chokepoint (#2879). It owns the
 * message shape and the typed result so call sites don't re-declare (and drift
 * on) them; add a new v2 caller by calling this, not by copy-pasting the
 * message.
 *
 * The background handler returns either `{ status, body }` (from callBackendV2)
 * or `{ error }` when it rejects an unauthorized sender. Any non-`{ status }`
 * reply is normalized to a synthetic non-2xx result so every caller degrades
 * identically (a defined `{ status, body }`) instead of destructuring off an
 * unexpected shape. Only the sender-rejection error maps to 401; any other
 * error (or a missing response) maps to 500 so callers don't misread an
 * unrelated failure as an auth problem.
 */
export const fetchBackendV2 = async ({
  method,
  path,
  body,
}: {
  method: string;
  /** Path relative to INDEXER_V2_URL, INCLUDING any query string. */
  path: string;
  body?: string;
}): Promise<FetchBackendV2Result> => {
  const response = await sendMessageToBackground<
    FetchBackendV2Result | { error: string }
  >({
    type: SERVICE_TYPES.FETCH_BACKEND_V2,
    activePublicKey: null,
    method,
    path,
    body,
  });

  if (!response) {
    return { status: 500, body: { error: "No response from background" } };
  }
  if ("error" in response) {
    const status = response.error === "Unauthorized" ? 401 : 500;
    return { status, body: { error: response.error } };
  }
  return response;
};
