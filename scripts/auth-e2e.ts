/*
 * Runnable end-to-end check of the per-request backend JWT against a locally
 * running freighter-backend-v2.
 *
 * Usage:
 *   1. In freighter-backend-v2:  make run        # serves on :3002 by default
 *   2. From this repo:           npx tsx scripts/auth-e2e.ts
 *
 * Env:
 *   BACKEND_V2_URL     default http://localhost:3002
 *   AUTH_E2E_MNEMONIC  default: the #2769 vector mnemonic (known userId)
 *
 * Exits non-zero if any case fails.
 */
import { Buffer } from "buffer";

import { buildAuthJwt } from "../@shared/api/helpers/buildAuthJwt";
import { deriveAuthKeypair } from "../@shared/api/helpers/deriveAuthKeypair";

const BASE = process.env.BACKEND_V2_URL ?? "http://localhost:3002";
const MNEMONIC =
  process.env.AUTH_E2E_MNEMONIC ??
  "illness spike retreat truth genius clock brain pass fit cave bargain toe";
const PATH = "/api/v1/auth/whoami";

let failures = 0;
const check = (name: string, ok: boolean, detail = ""): void => {
  // eslint-disable-next-line no-console
  console.log(
    `  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`,
  );
  if (!ok) failures += 1;
};

const get = (jwt: string): Promise<Response> =>
  fetch(`${BASE}${PATH}`, { headers: { Authorization: `Bearer ${jwt}` } });

const runCase = async (
  name: string,
  fn: () => Promise<{ ok: boolean; detail?: string }>,
): Promise<void> => {
  try {
    const { ok, detail } = await fn();
    check(name, ok, detail);
  } catch (e) {
    check(name, false, `request threw: ${(e as Error).message}`);
  }
};

const main = async (): Promise<void> => {
  const { keypair, userId } = await deriveAuthKeypair(MNEMONIC);
  // eslint-disable-next-line no-console
  console.log(`backend: ${BASE}\nuserId:  ${userId}\n`);

  await runCase("valid JWT -> 200 + matching userId", async () => {
    const r = await get(
      await buildAuthJwt({ keypair, method: "GET", path: PATH }),
    );
    const json =
      r.status === 200
        ? ((await r.json()) as { authenticated?: boolean; userId?: string })
        : null;
    return {
      ok:
        r.status === 200 &&
        json?.authenticated === true &&
        json?.userId === userId,
      detail: `status=${r.status}`,
    };
  });

  await runCase("tampered bodyHash -> 401", async () => {
    const r = await get(
      await buildAuthJwt({
        keypair,
        method: "GET",
        path: PATH,
        body: "tamper",
      }),
    );
    return { ok: r.status === 401, detail: `status=${r.status}` };
  });

  await runCase("bad signature -> 401", async () => {
    const [h, p, s] = (
      await buildAuthJwt({ keypair, method: "GET", path: PATH })
    ).split(".");
    const sig = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
    sig[0] ^= 0xff;
    const badSig = sig
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const r = await get(`${h}.${p}.${badSig}`);
    return { ok: r.status === 401, detail: `status=${r.status}` };
  });

  await runCase("expired token -> 401", async () => {
    const r = await get(
      await buildAuthJwt({
        keypair,
        method: "GET",
        path: PATH,
        now: Date.now() - 60_000,
      }),
    );
    return { ok: r.status === 401, detail: `status=${r.status}` };
  });

  if (failures > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `\n(${failures} failed — is the backend up at ${BASE}? start it with 'make run' in freighter-backend-v2)`,
    );
  }
  // eslint-disable-next-line no-console
  console.log(`\n${failures === 0 ? "ALL PASSED" : `${failures} FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
};

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(
    `\nE2E run failed (is the backend up at ${BASE}? start it with 'make run' in freighter-backend-v2)\n`,
    e,
  );
  process.exit(1);
});
