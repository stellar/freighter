import { test, expect, APIRequestContext } from "@playwright/test";
import { Buffer } from "buffer";
import { execFileSync } from "child_process";
import { generateMnemonic, mnemonicToSeedSync } from "bip39";
import StellarHDWallet from "stellar-hd-wallet";
import { Keypair } from "stellar-sdk";

import {
  buildAuthJwt,
  issuedAtSeconds,
} from "../../../@shared/api/helpers/buildAuthJwt";
import {
  deriveAuthKeypair,
  deriveSourceIdentity,
} from "../../../@shared/api/helpers/deriveAuthKeypair";
import {
  buildLinkConsentMessage,
  MAX_LINK_SOURCES,
  signLinkConsent,
} from "../../../@shared/api/helpers/userLinkConsent";
import { SecretSourceType } from "../../../@shared/api/types/types";

/*
 * Identity continuity and clustering (#70) against a live freighter-backend-v2,
 * driven over HTTP the way the extension's linker drives it: every request is
 * signed by the wallet's pinned source, and every source in a /user/link body
 * signs its own consent. No browser, so it covers the multi-phrase cases the
 * UI can't produce yet. Gated on IS_INTEGRATION_MODE.
 *
 * Run:  IS_INTEGRATION_MODE=true yarn workspace extension test:e2e userClusters
 * Env:  BACKEND_V2_URL            (default: http://localhost:3002)
 *       BACKEND_V2_DB_CONTAINER   (optional, e.g. freighter-backend-postgres):
 *                                 also asserts row ownership and counts in
 *                                 Postgres via `docker exec psql`.
 *
 * Every phrase in the clustering steps is random per run, and each link that
 * should add a source first checks the source is unlinked. Reruns against the
 * same database therefore test new rows, never ones a previous run left. Only
 * the shipped-id test uses the `abandon ... about` vector, and it asserts the
 * root alone, which never moves once set.
 */
const isIntegrationMode = process.env.IS_INTEGRATION_MODE === "true";
const BASE = process.env.BACKEND_V2_URL ?? "http://localhost:3002";
const DB_CONTAINER = process.env.BACKEND_V2_DB_CONTAINER;
const USER_PATH = "/api/v1/user";
const LINK_PATH = "/api/v1/user/link";

const SHIPPED_PHRASE =
  "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
// The `metrics_user_id` of every shipped wallet holding SHIPPED_PHRASE. Frozen.
const SHIPPED_USER_ID =
  "ec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797";

interface Source {
  id: string;
  kind: SecretSourceType;
  keypair: Keypair;
}

interface UserBody {
  userId: string;
  sources: { id: string; kind: string }[];
  conflicts?: string[];
}

const phraseSource = async (mnemonic: string): Promise<Source> => {
  const { userId, keypair } = await deriveAuthKeypair(mnemonic);
  return { id: userId, kind: SecretSourceType.PHRASE, keypair };
};

const keySource = async (account: Keypair): Promise<Source> => {
  const { sourceId, keypair } = await deriveSourceIdentity(
    account.rawSecretKey(),
  );
  return { id: sourceId, kind: SecretSourceType.SECRET_KEY, keypair };
};

// The account at m/44'/148'/index', as addAccount derives it.
const accountKeypair = (mnemonic: string, index: number): Keypair =>
  StellarHDWallet.fromSeed(
    Buffer.from(mnemonicToSeedSync(mnemonic)),
  ).getKeypair(index);

const accountSource = (mnemonic: string, index: number) =>
  keySource(accountKeypair(mnemonic, index));

const link = async (
  request: APIRequestContext,
  signer: Source,
  others: Source[],
) => {
  // One clock reading for the JWT and every consent, as link-sources.ts does.
  const now = Date.now();
  const iat = issuedAtSeconds(now);
  const body = JSON.stringify({
    sources: [signer, ...others].map(({ id, kind, keypair }) => ({
      id,
      kind,
      sig: signLinkConsent({
        keypair,
        message: buildLinkConsentMessage({
          id,
          kind,
          signingSourceId: signer.id,
          iat,
        }),
      }),
    })),
  });
  const jwt = await buildAuthJwt({
    keypair: signer.keypair,
    method: "POST",
    path: LINK_PATH,
    body,
    now,
  });
  const res = await request.post(`${BASE}${LINK_PATH}`, {
    headers: {
      Authorization: `Bearer ${jwt}`,
      "Content-Type": "application/json",
    },
    data: body,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status(), data: json?.data as UserBody | undefined };
};

const getUser = async (request: APIRequestContext, signer: Source) => {
  const jwt = await buildAuthJwt({
    keypair: signer.keypair,
    method: "GET",
    path: USER_PATH,
  });
  const res = await request.get(`${BASE}${USER_PATH}`, {
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const json = await res.json().catch(() => null);
  return { status: res.status(), data: json?.data as UserBody | undefined };
};

const idsOf = (body?: UserBody) => (body?.sources ?? []).map(({ id }) => id);

// A link asserted to add these sources can only prove it if they start unlinked.
const expectUnlinked = async (
  request: APIRequestContext,
  sources: Source[],
) => {
  for (const source of sources) {
    expect((await getUser(request, source)).status).toBe(404);
  }
};

// Source ids are hex, so they are safe to inline into SQL.
const sql = (query: string): string =>
  execFileSync(
    "docker",
    [
      "exec",
      DB_CONTAINER!,
      "psql",
      "-U",
      "freighter",
      "-d",
      "freighter",
      "-tAc",
      query,
    ],
    { encoding: "utf8" },
  ).trim();

const ownerOf = (sourceId: string) =>
  sql(
    `SELECT u.canonical_source_id FROM user_sources s JOIN users u ON u.id = s.user_id WHERE s.source_id = '${sourceId}'`,
  );

const rowCounts = () => ({
  users: Number(sql("SELECT count(*) FROM users")),
  sources: Number(sql("SELECT count(*) FROM user_sources")),
});

test.describe("user clusters and identity continuity (#70)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(
    !isIntegrationMode,
    "Requires a live freighter-backend-v2; run with IS_INTEGRATION_MODE=true",
  );

  let phraseA: string;
  let a: Source;
  let a0: Source;
  let a1: Source; // "account 2": exported and imported elsewhere
  let a2: Source; // "account 3": added after the export

  test.beforeAll(async () => {
    phraseA = generateMnemonic();
    a = await phraseSource(phraseA);
    [a0, a1, a2] = await Promise.all(
      [0, 1, 2].map((i) => accountSource(phraseA, i)),
    );
  });

  // Idempotent: a root never moves, so this holds on every rerun.
  test("a shipped phrase roots at the analytics id it already reports", async ({
    request,
  }) => {
    const shipped = await phraseSource(SHIPPED_PHRASE);
    expect(shipped.id).toBe(SHIPPED_USER_ID);

    const res = await link(request, shipped, []);
    expect(res.status).toBe(200);
    expect(res.data?.userId).toBe(SHIPPED_USER_ID);
    expect((await getUser(request, shipped)).data?.userId).toBe(
      SHIPPED_USER_ID,
    );
  });

  test("1. phrase A with two accounts roots a new user at A", async ({
    request,
  }) => {
    await expectUnlinked(request, [a, a0, a1]);

    const res = await link(request, a, [a0, a1]);
    expect(res.status).toBe(200);
    expect(res.data?.userId).toBe(a.id);
    expect(idsOf(res.data)).toEqual(
      expect.arrayContaining([a.id, a0.id, a1.id]),
    );
    expect(res.data?.conflicts).toEqual([]);

    const user = await getUser(request, a);
    expect(user.status).toBe(200);
    expect(user.data?.userId).toBe(a.id);
  });

  test("2-3. a wallet holding only account 2's exported S... resolves to A", async ({
    request,
  }) => {
    // Profile B's only source is the imported key, so it signs as that key.
    const imported = await keySource(
      Keypair.fromSecret(accountKeypair(phraseA, 1).secret()),
    );
    expect(imported.id).toBe(a1.id);

    // Before B links anything, the server already places the key in A.
    const user = await getUser(request, imported);
    expect(user.status).toBe(200);
    expect(user.data?.userId).toBe(a.id);

    // The import's own link call settles it as a member, not a conflict.
    const res = await link(request, imported, []);
    expect(res.status).toBe(200);
    expect(res.data?.userId).toBe(a.id);
    expect(res.data?.conflicts).toEqual([]);
  });

  test("4. a new phrase added in B joins A's cluster", async ({ request }) => {
    const p = generateMnemonic();
    const pPhrase = await phraseSource(p);
    const p0 = await accountSource(p, 0);
    await expectUnlinked(request, [pPhrase, p0]);

    // B is still pinned to the imported key, so that key signs the link.
    const res = await link(request, a1, [pPhrase, p0]);
    expect(res.status).toBe(200);
    expect(res.data?.userId).toBe(a.id);
    expect(idsOf(res.data)).toEqual(
      expect.arrayContaining([pPhrase.id, p0.id]),
    );

    // Both profiles still resolve to A.
    expect((await getUser(request, a)).data?.userId).toBe(a.id);
    expect((await getUser(request, pPhrase)).data?.userId).toBe(a.id);
  });

  test("5. a fresh phrase that imports account 2 keeps its own cluster and gets a conflict", async ({
    request,
  }) => {
    const c = generateMnemonic();
    const cPhrase = await phraseSource(c);
    const c0 = await accountSource(c, 0);
    await expectUnlinked(request, [cPhrase, c0]);

    // Onboarding C: its first link roots a new user at C.
    const created = await link(request, cPhrase, [c0]);
    expect(created.status).toBe(200);
    expect(created.data?.userId).toBe(cPhrase.id);

    const before = DB_CONTAINER ? rowCounts() : null;

    // Importing account 2 into C: C's pinned phrase signs, account 2 consents.
    const res = await link(request, cPhrase, [a1]);
    expect(res.status).toBe(200);
    expect(res.data?.userId).toBe(cPhrase.id);
    expect(res.data?.conflicts).toEqual([a1.id]);
    expect(idsOf(res.data)).not.toContain(a1.id);

    // The claimed key never moves, and C's `sub` still resolves to C.
    expect((await getUser(request, a1)).data?.userId).toBe(a.id);
    expect((await getUser(request, cPhrase)).data?.userId).toBe(cPhrase.id);

    if (DB_CONTAINER) {
      expect(ownerOf(a1.id)).toBe(a.id);
      // C and c0 were already linked and a1 conflicted, so nothing is written.
      expect(rowCounts()).toEqual(before);
      expect(ownerOf(c0.id)).toBe(cPhrase.id);
    }
  });

  test("6. account 3 added in A shows up for B too", async ({ request }) => {
    await expectUnlinked(request, [a2]);

    const res = await link(request, a, [a2]);
    expect(res.status).toBe(200);
    expect(idsOf(res.data)).toContain(a2.id);

    // B signs as the imported account 2.
    const fromB = await getUser(request, a1);
    expect(fromB.data?.userId).toBe(a.id);
    expect(idsOf(fromB.data)).toContain(a2.id);
  });

  test("7. two phrases and a standalone key: the key alone resolves to the same user", async ({
    request,
  }) => {
    const d1 = await phraseSource(generateMnemonic());
    const d2 = await phraseSource(generateMnemonic());
    const k = await keySource(Keypair.random());
    await expectUnlinked(request, [d1, d2, k]);

    const res = await link(request, d1, [d2, k]);
    expect(res.status).toBe(200);
    expect(res.data?.userId).toBe(d1.id);

    // Profile E holds only the key.
    const user = await getUser(request, k);
    expect(user.status).toBe(200);
    expect(user.data?.userId).toBe(d1.id);
    expect(idsOf(user.data)).toEqual(
      expect.arrayContaining([d1.id, d2.id, k.id]),
    );

    if (DB_CONTAINER) {
      for (const { id } of [d1, d2, k]) {
        expect(ownerOf(id)).toBe(d1.id);
      }
    }
  });

  // Contract: the extension batches up to MAX_LINK_SOURCES per body
  // (user-link.ts), so the server must accept a body that size.
  test("the server accepts a full client batch of MAX_LINK_SOURCES", async ({
    request,
  }) => {
    const m = generateMnemonic();
    const phrase = await phraseSource(m);
    const accounts = await Promise.all(
      Array.from({ length: MAX_LINK_SOURCES - 1 }, (_, i) =>
        accountSource(m, i),
      ),
    );

    const res = await link(request, phrase, accounts);
    expect(res.status).toBe(200);
    expect(idsOf(res.data)).toHaveLength(MAX_LINK_SOURCES);
  });
});
