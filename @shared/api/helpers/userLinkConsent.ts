import { Buffer } from "buffer";
import { Keypair } from "stellar-sdk";

import { SecretSourceType } from "@shared/api/types";

/*
  The consent each source signs for POST /api/v1/user/link. The JWT only
  proves possession of some key, so every source in the body proves its own
  consent: a signature by that source's key over a message bound to the
  caller's `sub` and the JWT's `iat` (unified-user-model/v2.md "Linking must
  be proven, not asserted").

  The format is a cross-platform contract pinned by the backend's
  link_proof_vectors.json (see linkProofVectors.ts). A change needs a new
  domain prefix on both sides, never an edit here.
*/

export const USER_LINK_CONSENT_DOMAIN = "freighter-user-link-v2";

/**
 * The server rejects a body above this many sources with 400. Mirrors the
 * backend's users.MaxLinkSources; change both together.
 */
export const MAX_LINK_SOURCES = 32;

export interface UserLinkSource {
  id: string;
  kind: SecretSourceType;
  /** Standard base64 ed25519 signature over the consent message. */
  sig: string;
}

export interface UserLinkBody {
  sources: UserLinkSource[];
}

/**
 * The bytes a source signs, newline-delimited:
 * `freighter-user-link-v2\nsource\n<id>\n<kind>\n<signingSourceId>\n<iat>`.
 * `signingSourceId` is the JWT `sub` and `iat` the JWT's own issued-at in
 * whole seconds (issuedAtSeconds). Neither goes in the body; the server reads
 * both from the verified JWT. No field can hold a newline (ids are hex, kind
 * is an enum, iat is an integer), so distinct tuples give distinct messages.
 */
export const buildLinkConsentMessage = ({
  id,
  kind,
  signingSourceId,
  iat,
}: {
  id: string;
  kind: SecretSourceType;
  signingSourceId: string;
  iat: number;
}): string =>
  [
    USER_LINK_CONSENT_DOMAIN,
    "source",
    id,
    kind,
    signingSourceId,
    String(iat),
  ].join("\n");

/** Signs a consent message with the source's own key, as standard base64. */
export const signLinkConsent = ({
  keypair,
  message,
}: {
  keypair: Keypair;
  message: string;
}): string =>
  Buffer.from(keypair.sign(Buffer.from(message, "utf8"))).toString("base64");
