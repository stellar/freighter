import { Buffer } from "buffer";
import { Keypair } from "stellar-sdk";

/** Platform tag recorded in the JWT `iss` claim (logging/metrics on the server). */
export const ISS = "freighter-extension";
/** Token lifetime in seconds; the server enforces exp - iat <= 15s. */
export const JWT_LIFETIME_SECONDS = 15;

export interface BuildAuthJwtParams {
  keypair: Keypair;
  method: string;
  /** Full request-target including any query string, e.g. "/api/v1/auth/whoami". */
  path: string;
  /** Raw request body; omit for GET (hashes the empty byte array). */
  body?: string;
  /** Injectable clock in ms epoch; defaults to Date.now(). */
  now?: number;
}

const toBytes = (body?: string): Uint8Array =>
  body === undefined ? new Uint8Array() : new TextEncoder().encode(body);

// URL-safe base64 with padding stripped.
const base64url = (bytes: Uint8Array): string =>
  Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const sha256Hex = async (body?: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", toBytes(body));
  return Buffer.from(digest).toString("hex");
};

const encodeSegment = (value: unknown): string =>
  base64url(new TextEncoder().encode(JSON.stringify(value)));

/**
 * Builds a fresh compact EdDSA JWS bound to this exact request. The caller
 * supplies the auth keypair (from deriveAuthKeypair). Never cached.
 */
export const buildAuthJwt = async ({
  keypair,
  method,
  path,
  body,
  now,
}: BuildAuthJwtParams): Promise<string> => {
  const iat = Math.floor((now ?? Date.now()) / 1000);
  const payload = {
    sub: keypair.rawPublicKey().toString("hex"),
    iss: ISS,
    iat,
    exp: iat + JWT_LIFETIME_SECONDS,
    bodyHash: await sha256Hex(body),
    methodAndPath: `${method.toUpperCase()} ${path}`,
  };
  const signingInput = `${encodeSegment({ alg: "EdDSA", typ: "JWT" })}.${encodeSegment(payload)}`;
  const signature = keypair.sign(Buffer.from(signingInput, "utf8"));
  return `${signingInput}.${base64url(signature)}`;
};
