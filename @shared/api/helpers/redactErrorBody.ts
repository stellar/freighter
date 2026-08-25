import { scrubStrKeys } from "@shared/helpers/stellarStrKey";

// Matches the cap and sentinel used by the popup's bounded fetch reader
// (extension/src/popup/helpers/fetch.ts) so error snippets read the same
// wherever they surface. That module is unexported and lives under
// extension/src, which @shared cannot import, hence the duplicated constants.
const MAX_BODY_CHARS = 200;
const TRUNCATED_SUFFIX = "…[truncated]";

/**
 * Serialize a response body for a Sentry message: StrKeys redacted, length
 * capped.
 *
 * Sentry's `beforeSend` only rewrites `event.request.url`, so anything
 * interpolated into a `captureException` *message* ships verbatim. Bodies from
 * freighter-backend-v2 can echo the requested account (the balances fan-out
 * keys its results by `address`), and `callBackendV2` parses them with no size
 * limit — so both the scrub and the truncation are load-bearing.
 */
export const redactErrorBody = (body: unknown): string => {
  let serialized: string;
  try {
    serialized = JSON.stringify(body) ?? String(body);
  } catch {
    // Circular references and BigInts make JSON.stringify throw. A failed
    // serialization must not mask the HTTP failure we are reporting.
    return "[unserializable body]";
  }

  const scrubbed = scrubStrKeys(serialized) ?? serialized;
  return scrubbed.length > MAX_BODY_CHARS
    ? `${scrubbed.slice(0, MAX_BODY_CHARS)}${TRUNCATED_SUFFIX}`
    : scrubbed;
};
