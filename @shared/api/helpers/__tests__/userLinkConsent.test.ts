import { Buffer } from "buffer";
import { Keypair, xdr } from "stellar-sdk";

import { SecretSourceType } from "@shared/api/types";

import { buildAuthJwt, issuedAtSeconds } from "../buildAuthJwt";
import {
  LINK_PROOF_DOMAIN,
  LINK_PROOF_VECTORS,
} from "./fixtures/linkProofVectors";
import {
  buildLinkConsentMessage,
  signLinkConsent,
  USER_LINK_CONSENT_DOMAIN,
} from "../userLinkConsent";

const kindOf = (kind: string) =>
  kind === "phrase" ? SecretSourceType.PHRASE : SecretSourceType.SECRET_KEY;

describe("link consent against the backend vectors", () => {
  it("uses the backend's domain prefix", () => {
    expect(USER_LINK_CONSENT_DOMAIN).toBe(LINK_PROOF_DOMAIN);
  });

  it("covers both kinds with positive vectors", () => {
    const kinds = LINK_PROOF_VECTORS.filter((v) => v.expectVerify).map(
      (v) => v.kind,
    );
    expect(new Set(kinds)).toEqual(new Set(["phrase", "secret_key"]));
  });

  describe.each(LINK_PROOF_VECTORS)("$name", (vector) => {
    const keypair = Keypair.fromRawEd25519Seed(Buffer.from(vector.seed, "hex"));
    const message = buildLinkConsentMessage({
      id: vector.id,
      kind: kindOf(vector.kind),
      signingSourceId: vector.signingSourceId,
      iat: vector.iat,
    });

    it("derives the vector's id from its seed", () => {
      expect(xdr.encodeBytes(keypair.rawPublicKey(), "hex")).toBe(vector.id);
    });

    it("builds the vector's message bytes", () => {
      expect(message).toBe(vector.message);
    });

    if (vector.expectVerify) {
      it("reproduces the signature byte for byte", () => {
        expect(signLinkConsent({ keypair, message })).toBe(vector.sig);
      });
    } else {
      it("fails verification over the altered message", () => {
        expect(
          keypair.verify(
            Buffer.from(message, "utf8"),
            Buffer.from(vector.sig, "base64"),
          ),
        ).toBe(false);
      });
    }
  });
});

describe("buildLinkConsentMessage", () => {
  const a = "a".repeat(64);
  const b = "b".repeat(64);

  it("gives distinct field tuples distinct bytes", () => {
    const tuples = [
      { id: a, kind: SecretSourceType.PHRASE, signingSourceId: b, iat: 1 },
      { id: b, kind: SecretSourceType.PHRASE, signingSourceId: a, iat: 1 },
      { id: a, kind: SecretSourceType.SECRET_KEY, signingSourceId: b, iat: 1 },
      { id: a, kind: SecretSourceType.PHRASE, signingSourceId: b, iat: 11 },
      { id: a, kind: SecretSourceType.PHRASE, signingSourceId: a, iat: 1 },
      // A character moved across the id/signer boundary. Plain concatenation
      // would give these two the same bytes.
      {
        id: `${a.slice(1)}b`,
        kind: SecretSourceType.PHRASE,
        signingSourceId: b.slice(1),
        iat: 1,
      },
      {
        id: a.slice(1),
        kind: SecretSourceType.PHRASE,
        signingSourceId: b,
        iat: 1,
      },
      // Against the iat 11 tuple above: the iat's leading digit moved into
      // the signer.
      {
        id: a,
        kind: SecretSourceType.PHRASE,
        signingSourceId: `${b}1`,
        iat: 1,
      },
    ];
    // Every tuple above differs from the others in at least one field.
    expect(new Set(tuples.map((t) => JSON.stringify(t))).size).toBe(
      tuples.length,
    );
    expect(new Set(tuples.map(buildLinkConsentMessage)).size).toBe(
      tuples.length,
    );
  });
});

describe("issuedAtSeconds", () => {
  it("floors, never rounds", () => {
    expect(issuedAtSeconds(1_761_000_000_999)).toBe(1_761_000_000);
  });

  it("matches the iat buildAuthJwt signs for the same clock reading", async () => {
    const now = 1_761_000_000_999;
    const jwt = await buildAuthJwt({
      keypair: Keypair.fromRawEd25519Seed(Buffer.alloc(32, 7)),
      method: "POST",
      path: "/api/v1/user/link",
      body: "{}",
      now,
    });
    const claims = JSON.parse(
      Buffer.from(
        jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
    );
    expect(claims.iat).toBe(issuedAtSeconds(now));
  });
});
