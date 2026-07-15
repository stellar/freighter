import { test, expect } from "@playwright/test";
import { Buffer } from "buffer";

import { buildAuthJwt } from "../../../@shared/api/helpers/buildAuthJwt";
import { deriveAuthKeypair } from "../../../@shared/api/helpers/deriveAuthKeypair";

/*
 * End-to-end round-trip of the per-request backend JWT (#2770) against a live
 * freighter-backend-v2. Pure HTTP via Playwright's `request` fixture — no
 * browser/extension needed. Gated on IS_INTEGRATION_MODE so it never runs in the
 * normal (stubbed) e2e/CI pass.
 *
 * Run:  IS_INTEGRATION_MODE=true yarn workspace extension test:e2e authJwt
 * Env:  BACKEND_V2_URL    (default: staging, https://freighter-backend-v2-stg.stellar.org)
 *       AUTH_E2E_MNEMONIC (default: the #2769 vector mnemonic, known userId)
 */
const isIntegrationMode = process.env.IS_INTEGRATION_MODE === "true";
const BASE =
  process.env.BACKEND_V2_URL ?? "https://freighter-backend-v2-stg.stellar.org";
const MNEMONIC =
  process.env.AUTH_E2E_MNEMONIC ??
  "illness spike retreat truth genius clock brain pass fit cave bargain toe";
const PATH = "/api/v1/auth/whoami";

const toBase64Url = (bytes: Buffer): string =>
  bytes
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

test.describe("backend auth JWT round-trip (#2770)", () => {
  test.skip(
    !isIntegrationMode,
    "Requires a live freighter-backend-v2; run with IS_INTEGRATION_MODE=true",
  );

  test("valid JWT -> 200 with matching userId", async ({ request }) => {
    const { keypair, userId } = await deriveAuthKeypair(MNEMONIC);
    const jwt = await buildAuthJwt({ keypair, method: "GET", path: PATH });

    const res = await request.get(`${BASE}${PATH}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ authenticated: true, userId });
  });

  test("tampered body -> 401", async ({ request }) => {
    const { keypair } = await deriveAuthKeypair(MNEMONIC);
    // Sign a JWT whose bodyHash is for "tamper", but send an empty GET body, so
    // the server's recomputed (empty) body hash won't match the claim.
    const jwt = await buildAuthJwt({
      keypair,
      method: "GET",
      path: PATH,
      body: "tamper",
    });

    const res = await request.get(`${BASE}${PATH}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    expect(res.status()).toBe(401);
  });

  test("bad signature -> 401", async ({ request }) => {
    const { keypair } = await deriveAuthKeypair(MNEMONIC);
    const [header, payload, sig] = (
      await buildAuthJwt({ keypair, method: "GET", path: PATH })
    ).split(".");
    const sigBytes = Buffer.from(
      sig.replace(/-/g, "+").replace(/_/g, "/"),
      "base64",
    );
    sigBytes[0] ^= 0xff;
    const tampered = `${header}.${payload}.${toBase64Url(sigBytes)}`;

    const res = await request.get(`${BASE}${PATH}`, {
      headers: { Authorization: `Bearer ${tampered}` },
    });

    expect(res.status()).toBe(401);
  });

  test("expired token -> 401", async ({ request }) => {
    const { keypair } = await deriveAuthKeypair(MNEMONIC);
    // Backdate well beyond lifetime (15s) + skew (5s).
    const jwt = await buildAuthJwt({
      keypair,
      method: "GET",
      path: PATH,
      now: Date.now() - 60_000,
    });

    const res = await request.get(`${BASE}${PATH}`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });

    expect(res.status()).toBe(401);
  });
});
