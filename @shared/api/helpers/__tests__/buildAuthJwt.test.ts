import { Buffer } from "buffer";
import { Keypair } from "stellar-sdk";

import { buildAuthJwt, ISS, JWT_LIFETIME_SECONDS } from "../buildAuthJwt";

const KP = Keypair.fromRawEd25519Seed(Buffer.alloc(32, 7));
const NOW = 1_700_000_000_000; // fixed ms epoch
const PATH = "/api/v1/auth/whoami";

const decodeSegment = (seg: string): Record<string, unknown> =>
  JSON.parse(
    Buffer.from(seg.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString(
      "utf8",
    ),
  );

describe("buildAuthJwt", () => {
  it("uses an EdDSA JWS header", async () => {
    const jwt = await buildAuthJwt({
      keypair: KP,
      method: "GET",
      path: PATH,
      now: NOW,
    });
    expect(decodeSegment(jwt.split(".")[0])).toEqual({
      alg: "EdDSA",
      typ: "JWT",
    });
  });

  it("sets the documented claims", async () => {
    const jwt = await buildAuthJwt({
      keypair: KP,
      method: "GET",
      path: PATH,
      now: NOW,
    });
    const claims = decodeSegment(jwt.split(".")[1]);
    expect(claims.sub).toBe(KP.rawPublicKey().toString("hex"));
    expect(claims.iss).toBe(ISS);
    expect(claims.iat).toBe(Math.floor(NOW / 1000));
    expect((claims.exp as number) - (claims.iat as number)).toBe(
      JWT_LIFETIME_SECONDS,
    );
    expect(claims.methodAndPath).toBe("GET /api/v1/auth/whoami");
  });

  it("hashes an absent body to the empty-input SHA-256", async () => {
    const jwt = await buildAuthJwt({
      keypair: KP,
      method: "GET",
      path: PATH,
      now: NOW,
    });
    expect(decodeSegment(jwt.split(".")[1]).bodyHash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });

  it("hashes a non-empty body with hex SHA-256", async () => {
    const jwt = await buildAuthJwt({
      keypair: KP,
      method: "PUT",
      path: "/x",
      body: "hello",
      now: NOW,
    });
    expect(decodeSegment(jwt.split(".")[1]).bodyHash).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("produces a signature that verifies over the signing input", async () => {
    const jwt = await buildAuthJwt({
      keypair: KP,
      method: "GET",
      path: PATH,
      now: NOW,
    });
    const [h, p, s] = jwt.split(".");
    const sig = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    expect(KP.verify(Buffer.from(`${h}.${p}`, "utf8"), sig)).toBe(true);
  });

  it("emits url-safe base64 with no padding", async () => {
    const jwt = await buildAuthJwt({
      keypair: KP,
      method: "GET",
      path: PATH,
      now: NOW,
    });
    expect(jwt).not.toMatch(/[+/=]/);
  });
});
