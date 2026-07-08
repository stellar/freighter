import { hash } from "stellar-sdk";

export const ONRAMP_TOKEN_PATH = "/api/v1/onramp/token";
export const ONRAMP_PROOF_TTL_S = 15;
// Domain tag folded into the signed bytes (must match backend src/auth/verifier.ts
// ADDRESS_PROOF_DOMAIN). Signers sign encodeSep53Message(ADDRESS_PROOF_DOMAIN +
// canonical); the public signMessage path refuses messages beginning with it.
// Named generically (address-proof, not onramp): it lives in the signed bytes, so
// a rename would be a wire-breaking v2.
export const ADDRESS_PROOF_DOMAIN = "freighter:address-proof:v1\n";

export interface OnrampClaims {
  sub: string;
  method: string;
  path: string;
  body_hash: string;
  exp: number;
}

export const canonicalizeJson = (value: unknown): string => {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`;
  }
  const obj = value as Record<string, unknown>;
  const entries = Object.keys(obj)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonicalizeJson(obj[k])}`);
  return `{${entries.join(",")}}`;
};

// stellar-sdk `hash` is sha256.
export const sha256Hex = (data: string): string =>
  hash(Buffer.from(data, "utf8")).toString("hex");

export const buildOnrampClaims = ({
  publicKey,
  body,
  nowSeconds,
}: {
  publicKey: string;
  body: unknown;
  nowSeconds: number;
}): OnrampClaims => ({
  sub: publicKey,
  method: "POST",
  path: ONRAMP_TOKEN_PATH,
  body_hash: sha256Hex(canonicalizeJson(body)),
  exp: nowSeconds + ONRAMP_PROOF_TTL_S,
});

// The `buffer` polyfill bundled into the extension/service-worker does not
// support the "base64url" encoding (Node-only), so encoding directly throws
// "Unknown encoding: base64url" at runtime. Transcode from base64 instead;
// the result is byte-identical to Node's unpadded base64url.
const toBase64Url = (buf: Buffer): string =>
  buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

// Assembles the `address_proof` body-field value: `<payload>.<sig>` (unpadded
// base64url, dot-separated). No scheme literal — the proof travels as a POST-body
// field, not an Authorization header (that header is reserved for v2's JWT).
export const assembleProofToken = (
  canonicalPayload: string,
  signature: Buffer,
): string =>
  `${toBase64Url(Buffer.from(canonicalPayload, "utf8"))}.${toBase64Url(signature)}`;
