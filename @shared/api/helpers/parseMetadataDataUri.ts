import { MAX_METADATA_BYTES } from "./fetchMetadataJson";

// `data:application/json[;param...],` — group 1 holds the parameters. The
// payload may itself contain commas, so only the first one ends the header.
const JSON_DATA_URI_HEADER = /^data:application\/json((?:;[^;,]*)*),/i;

/**
 * Whether a token URI carries its metadata inline as a `data:` URI rather
 * than pointing at a remote document.
 */
export const isMetadataDataUri = (uri: string) => /^data:/i.test(uri);

// Payloads are not always valid percent-encoding, so fall back to the payload
// as written when decoding fails.
const decodePercentEncoded = (payload: string) => {
  try {
    return decodeURIComponent(payload);
  } catch {
    return payload;
  }
};

// Percent-decode before base64-decoding, as browsers do.
const decodeBase64 = (payload: string) => {
  const binary = atob(decodePercentEncoded(payload).trim());
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
};

// Raw JSON can contain percent escapes that decoding would corrupt, so parse
// the payload as written first and only decode it if that fails.
const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return JSON.parse(decodePercentEncoded(text));
  }
};

/**
 * Parses a JSON metadata document embedded in a `data:` URI, e.g.
 * `data:application/json,{"name":"..."}` or
 * `data:application/json;base64,eyJuYW1lIjoi...`.
 *
 * The inline counterpart of fetchMetadataJson: no network call is made, only
 * the `application/json` media type is accepted, the URI is capped at
 * MAX_METADATA_BYTES, and the document must be a JSON object. Throws on any
 * violation so callers can treat it like a failed fetch.
 */
export const parseMetadataDataUri = <T>(uri: string): T => {
  if (uri.length > MAX_METADATA_BYTES) {
    throw new Error(
      `parseMetadataDataUri: uri too large (max ${MAX_METADATA_BYTES} bytes)`,
    );
  }

  const header = JSON_DATA_URI_HEADER.exec(uri);
  if (!header) {
    throw new Error(
      "parseMetadataDataUri: uri is not a data:application/json URI",
    );
  }

  const payload = uri.slice(header[0].length);
  const parsed = parseJson(
    /;base64$/i.test(header[1]) ? decodeBase64(payload) : payload,
  );
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("parseMetadataDataUri: document is not a JSON object");
  }

  return parsed as T;
};
