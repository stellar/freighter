import { Buffer } from "buffer";
import { Keypair } from "stellar-sdk";

import { sessionSlice } from "background/ducks/session";
import { popupMessageListener } from "background/messageListener/popupMessageListener";
import { SERVICE_TYPES } from "@shared/constants/services";
import { INDEXER_V2_URL } from "@shared/constants/mercury";
import { getAnalyticsUserId } from "background/helpers/analyticsUserId";
import { linkWalletSources } from "background/helpers/link-sources";
import { migratePreV2Storage } from "background/helpers/pre-v2-migration";
import { getSigningIdentity } from "background/helpers/signing-identity";
import {
  mockDataStorage,
  mockSessionStore,
  mockKeyManager,
  mockStorageApi,
  MockBrowserAlarm,
} from "background/messageListener/helpers/test-helpers";
import {
  CANONICAL_USER_ID,
  PINNED_SOURCE_ID,
} from "constants/localStorageTypes";
import {
  PRE_V2_HW_PUBLIC_KEY,
  PRE_V2_IMPORTED_PUBLIC_KEY,
  PRE_V2_PASSWORD,
  PRE_V2_STORAGE,
} from "./fixtures/preV2Storage";

/*
  #70: a wallet that existed before the upgrade keeps emitting the analytics
  id it already had, through the upgrade and everything the user does after
  it. The popup copies whatever getAnalyticsUserId returns into
  `metrics_user_id` and Amplitude (helpers/metrics.ts reconcileAnalyticsUserId,
  covered by metrics.reconcileUserId.test.ts), so this pins that value at
  every step.

  The backend is a fake that applies the server's root rule: the first `sub`
  to link roots the user, and later sources join the signer's user. It reads
  `sub` from each request's JWT, so a request signed by any source other than
  the phrase would root the user elsewhere and fail here, not just a wrong
  cached value.
*/

// The pre-upgrade `metrics_user_id` of the fixture wallet: deriveAuthKeypair
// of its phrase, which the last single-phrase build reported. Frozen.
const PRE_UPGRADE_METRICS_USER_ID =
  "ec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797";

jest.mock("stellar-hd-wallet", () => {
  const { ACCOUNT_SOURCE_VECTORS: vectors } = jest.requireActual(
    "@shared/api/helpers/authKeypairVectors",
  );
  return {
    fromMnemonic: (mnemonic: string) => {
      const rows = vectors.find((v: any) => v.mnemonic === mnemonic).accounts;
      return {
        getPublicKey: (i: number) => rows[i]?.publicKey,
        getSecret: (i: number) => rows[i]?.secret,
      };
    },
  };
});

jest.mock("@sentry/browser", () => ({
  ...jest.requireActual("@sentry/browser"),
  captureException: jest.fn(),
}));

const subOf = (headers?: HeadersInit): string | null => {
  const auth = (headers as Record<string, string> | undefined)?.Authorization;
  if (!auth) {
    return null;
  }
  const payload = auth.split(" ")[1].split(".")[1];
  const json = Buffer.from(
    payload.replace(/-/g, "+").replace(/_/g, "/"),
    "base64",
  ).toString("utf8");
  return JSON.parse(json).sub;
};

const makeFakeBackend = () => {
  const owner = new Map<string, string>(); // source id -> root
  const kinds = new Map<string, string>();
  const signers: string[] = [];

  const cluster = (root: string) =>
    [...owner]
      .filter(([, r]) => r === root)
      .map(([id]) => ({ id, kind: kinds.get(id) }));

  const respond = (status: number, data?: object) =>
    new Response(data ? JSON.stringify({ data }) : null, { status });

  const fetchImpl = jest.fn(async (input: RequestInfo, init?: RequestInit) => {
    const url = String(input);
    if (!url.startsWith(INDEXER_V2_URL!)) {
      // Horizon and the rest: nothing here depends on them.
      return { json: () => Promise.resolve({}) } as unknown as Response;
    }
    const sub = subOf(init?.headers);
    if (!sub) {
      return respond(401);
    }
    signers.push(sub);
    const path = url.slice(INDEXER_V2_URL!.length);

    if (path === "/user/link" && init?.method === "POST") {
      const { sources } = JSON.parse(String(init.body)) as {
        sources: { id: string; kind: string }[];
      };
      const root = owner.get(sub) ?? sub;
      const conflicts: string[] = [];
      for (const { id, kind } of sources) {
        const current = owner.get(id);
        if (!current) {
          owner.set(id, root);
          kinds.set(id, kind);
        } else if (current !== root) {
          conflicts.push(id);
        }
      }
      return respond(200, { userId: root, sources: cluster(root), conflicts });
    }

    if (path === "/user") {
      const root = owner.get(sub);
      return root
        ? respond(200, { userId: root, sources: cluster(root) })
        : respond(404);
    }
    return respond(404);
  });

  return { fetchImpl, owner, signers, cluster };
};

const testAlarm = new MockBrowserAlarm(() => {});
const send = (request: object) =>
  popupMessageListener(
    request as any,
    mockSessionStore,
    mockDataStorage,
    mockKeyManager,
    testAlarm as any,
    { id: "fake-extension-id" },
  ) as Promise<{ error?: string }>;

// Every step's id check would still pass after a failed step, since the id is
// cached, so each step must also succeed.
const sendOk = async (request: object) => {
  expect((await send(request)).error).toBeUndefined();
};

const unlock = () =>
  sendOk({ type: SERVICE_TYPES.CONFIRM_PASSWORD, password: PRE_V2_PASSWORD });

const stores = { sessionStore: mockSessionStore, localStore: mockDataStorage };

// Triggers start the linker without awaiting it. A call while it runs joins
// that run and queues one more pass, so this settles every pending link.
const settleLinks = () => linkWalletSources(stores);

const analyticsId = () => getAnalyticsUserId(mockSessionStore, mockDataStorage);

// Once the server's id is cached, getAnalyticsUserId returns it without
// reading the session, locked or not. So also check the session: unlocked, it
// must sign as the pinned phrase; locked, it must hold no signer.
const expectSameId = async ({ unlocked }: { unlocked: boolean }) => {
  expect(await analyticsId()).toEqual({
    analyticsUserId: PRE_UPGRADE_METRICS_USER_ID,
    isConfirmed: true,
  });
  expect(await mockDataStorage.getItem(PINNED_SOURCE_ID)).toBe(
    PRE_UPGRADE_METRICS_USER_ID,
  );
  const identity = await getSigningIdentity(stores);
  if (unlocked) {
    expect(identity?.sourceId).toBe(PRE_UPGRADE_METRICS_USER_ID);
  } else {
    expect(identity).toBeNull();
  }
};

describe("analytics id continuity after an upgrade (#70)", () => {
  jest.setTimeout(120_000);

  let backend: ReturnType<typeof makeFakeBackend>;

  beforeAll(async () => {
    await mockStorageApi.clear();
    await mockStorageApi.set(PRE_V2_STORAGE);
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    backend = makeFakeBackend();
    global.fetch = backend.fetchImpl as unknown as typeof fetch;
  });

  it("is locked with no id after the update, so the popup keeps the stored one", async () => {
    await migratePreV2Storage({ localStore: mockDataStorage });

    // reconcileAnalyticsUserId ignores a null id: the pre-upgrade
    // `metrics_user_id` stays in place until the first unlock.
    expect(await analyticsId()).toEqual({
      analyticsUserId: null,
      isConfirmed: false,
    });
  });

  it("keeps the id through the first unlock and its first link", async () => {
    await unlock();
    await settleLinks();

    await expectSameId({ unlocked: true });
    // The phrase rooted the user, so the server's id is the old id.
    expect(backend.owner.get(PRE_UPGRADE_METRICS_USER_ID)).toBe(
      PRE_UPGRADE_METRICS_USER_ID,
    );
    expect(await mockDataStorage.getItem(CANONICAL_USER_ID)).toBe(
      PRE_UPGRADE_METRICS_USER_ID,
    );
  });

  it("keeps the id when an account is added", async () => {
    await sendOk({
      type: SERVICE_TYPES.ADD_ACCOUNT,
      password: PRE_V2_PASSWORD,
    });
    await settleLinks();
    await expectSameId({ unlocked: true });
  });

  it("keeps the id when a secret key is imported", async () => {
    await sendOk({
      type: SERVICE_TYPES.IMPORT_ACCOUNT,
      password: PRE_V2_PASSWORD,
      privateKey: Keypair.random().secret(),
    });
    await settleLinks();
    await expectSameId({ unlocked: true });
  });

  it.each([
    ["the imported account", PRE_V2_IMPORTED_PUBLIC_KEY],
    ["the hardware account", PRE_V2_HW_PUBLIC_KEY],
  ])("keeps the id with %s active", async (_, publicKey) => {
    await sendOk({ type: SERVICE_TYPES.MAKE_ACCOUNT_ACTIVE, publicKey });
    expect(mockSessionStore.getState().session.publicKey).toBe(publicKey);
    await expectSameId({ unlocked: true });
  });

  it("keeps the id while locked", async () => {
    await send({ type: SERVICE_TYPES.SIGN_OUT });
    await expectSameId({ unlocked: false });
  });

  it("keeps the id across another update and the unlock after it", async () => {
    // An update clears storage.session and reruns the install pass.
    mockSessionStore.dispatch(sessionSlice.actions.reset());
    await migratePreV2Storage({ localStore: mockDataStorage });
    await expectSameId({ unlocked: false });

    await unlock();
    await settleLinks();
    await expectSameId({ unlocked: true });
  });

  it("signed every request as the phrase, and every source joined its user", () => {
    expect(new Set(backend.signers)).toEqual(
      new Set([PRE_UPGRADE_METRICS_USER_ID]),
    );
    // One user, and every source the wallet holds is in it.
    expect(new Set(backend.owner.values())).toEqual(
      new Set([PRE_UPGRADE_METRICS_USER_ID]),
    );
    const kinds = backend
      .cluster(PRE_UPGRADE_METRICS_USER_ID)
      .map(({ kind }) => kind);
    // The phrase, its three derived accounts, and two imported keys.
    expect(kinds.filter((k) => k === "phrase")).toHaveLength(1);
    expect(kinds.filter((k) => k === "secret_key")).toHaveLength(5);
  });
});
