import { Buffer } from "buffer";
import { Keypair, xdr } from "stellar-sdk";

import * as Sentry from "@sentry/browser";
import {
  buildLinkConsentMessage,
  MAX_LINK_SOURCES,
  UserLinkBody,
} from "@shared/api/helpers/userLinkConsent";
import { SecretSourceType } from "@shared/api/types";
import type { DataStorageAccess } from "background/helpers/dataStorageAccess";
import { getPinnedSourceId } from "background/helpers/secret-sources";
import { getSigningIdentity } from "background/helpers/signing-identity";
import {
  getWalletSources,
  WalletSource,
} from "background/helpers/wallet-sources";
import { LINK_STATUS_ID } from "constants/localStorageTypes";

import { clearLinkStatus } from "../link-status";
import { linkWalletSources } from "../link-sources";

jest.mock("@sentry/browser");
jest.mock("@shared/constants/mercury", () => ({
  INDEXER_V2_URL: "https://be.example.test/api/v1",
}));
jest.mock("background/helpers/signing-identity", () => ({
  getSigningIdentity: jest.fn(),
}));
jest.mock("background/helpers/wallet-sources", () => ({
  getWalletSources: jest.fn(),
}));
jest.mock("background/helpers/secret-sources", () => ({
  getPinnedSourceId: jest.fn(),
}));

const mockGetPinnedSourceId = getPinnedSourceId as jest.Mock;
const mockGetSigningIdentity = getSigningIdentity as jest.Mock;
const mockGetWalletSources = getWalletSources as jest.Mock;

const NOW = 1_761_000_000_500;

const makeLocalStore = () => {
  const data: Record<string, unknown> = {};
  const store = {
    getItem: jest.fn(async (key: string) => data[key]),
    setItem: jest.fn(async (key: string, value: unknown) => {
      data[key] = value;
    }),
    remove: jest.fn(async (key: string) => {
      delete data[key];
    }),
  } as unknown as DataStorageAccess;
  return { store, data };
};

const makeSource = (kind = SecretSourceType.SECRET_KEY) => {
  const keypair = Keypair.random();
  return {
    source: { id: xdr.encodeBytes(keypair.rawPublicKey(), "hex"), kind },
    keypair,
  };
};

/*
  A wallet whose first source is the pinned phrase. `add` holds one more
  source, as a derive or an import would.
*/
const makeWallet = (extra: number) => {
  const pinned = makeSource(SecretSourceType.PHRASE);
  const sources: WalletSource[] = [pinned.source];
  const signers = new Map<string, Keypair>([
    [pinned.source.id, pinned.keypair],
  ]);
  const add = () => {
    const next = makeSource();
    sources.push(next.source);
    signers.set(next.source.id, next.keypair);
    return next.source.id;
  };
  for (let i = 0; i < extra; i += 1) {
    add();
  }
  mockGetSigningIdentity.mockResolvedValue({
    sourceId: pinned.source.id,
    keypair: pinned.keypair,
  });
  mockGetPinnedSourceId.mockResolvedValue(pinned.source.id);
  mockGetWalletSources.mockImplementation(async () => ({
    sources: [...sources],
    signers,
  }));
  return { sub: pinned.source.id, ids: () => sources.map(({ id }) => id), add };
};

const sentIds = (call: unknown[]): string[] =>
  JSON.parse((call[1] as RequestInit).body as string).sources.map(
    ({ id }: { id: string }) => id,
  );

const jwtIat = (call: unknown[]): number => {
  const auth = ((call[1] as RequestInit).headers as Record<string, string>)
    .Authorization;
  const payload = auth.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(Buffer.from(payload, "base64").toString("utf8")).iat;
};

/* Every consent in the call verifies under `sub` and `iat`. */
const expectConsentsVerify = (
  call: unknown[],
  wallet: { sub: string },
  iat: number,
) => {
  const body: UserLinkBody = JSON.parse(
    (call[1] as RequestInit).body as string,
  );
  for (const { id, kind, sig } of body.sources) {
    const message = buildLinkConsentMessage({
      id,
      kind,
      signingSourceId: wallet.sub,
      iat,
    });
    const verifier = new Keypair({
      type: "ed25519",
      publicKey: Buffer.from(id, "hex"),
    });
    expect(
      verifier.verify(Buffer.from(message, "utf8"), Buffer.from(sig, "base64")),
    ).toBe(true);
  }
};

/*
  A server that puts every sent source in the caller's cluster except
  `foreign`. Same `data` envelope as freighter-backend-v2.
*/
const server = (foreign: string[] = []) =>
  jest.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    const ids: string[] = JSON.parse(init?.body as string).sources.map(
      ({ id }: { id: string }) => id,
    );
    return new Response(
      JSON.stringify({
        data: {
          userId: ids[0],
          sources: ids
            .filter((id) => !foreign.includes(id))
            .map((id) => ({ id, kind: "secret_key" })),
          conflicts: ids.filter((id) => foreign.includes(id)),
        },
      }),
      { status: 200 },
    );
  });

describe("linkWalletSources", () => {
  const sessionStore = {} as never;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("links every held source in one call and stores each as linked", async () => {
    const wallet = makeWallet(2);
    const { store, data } = makeLocalStore();
    const fetchImpl = server();

    await linkWalletSources({
      sessionStore,
      localStore: store,
      fetchImpl,
      clock: () => NOW,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl.mock.calls[0][0]).toBe(
      "https://be.example.test/api/v1/user/link",
    );
    expect(sentIds(fetchImpl.mock.calls[0])).toEqual(wallet.ids());
    expect(data[LINK_STATUS_ID]).toEqual(
      Object.fromEntries(wallet.ids().map((id) => [id, "linked"])),
    );
  });

  it("sends nothing once every source is settled", async () => {
    makeWallet(2);
    const { store } = makeLocalStore();
    const fetchImpl = server();

    await linkWalletSources({ sessionStore, localStore: store, fetchImpl });
    await linkWalletSources({ sessionStore, localStore: store, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("stores nothing when offline, and the next run sends the same sources", async () => {
    const wallet = makeWallet(1);
    const { store, data } = makeLocalStore();
    const offline = jest.fn().mockRejectedValue(new TypeError("offline"));

    await linkWalletSources({
      sessionStore,
      localStore: store,
      fetchImpl: offline,
    });
    expect(LINK_STATUS_ID in data).toBe(false);
    expect(Sentry.captureException).toHaveBeenCalled();

    const online = server();
    await linkWalletSources({
      sessionStore,
      localStore: store,
      fetchImpl: online,
    });
    expect(sentIds(online.mock.calls[0])).toEqual(wallet.ids());
  });

  it("sends only the pinned source and the new one after an add", async () => {
    const wallet = makeWallet(2);
    const { store, data } = makeLocalStore();
    const fetchImpl = server();
    await linkWalletSources({ sessionStore, localStore: store, fetchImpl });

    const added = wallet.add();
    await linkWalletSources({ sessionStore, localStore: store, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sentIds(fetchImpl.mock.calls[1])).toEqual([wallet.sub, added]);
    expect(Object.keys(data[LINK_STATUS_ID] as object)).toHaveLength(4);
  });

  it("stores a conflict and does not send it again", async () => {
    const wallet = makeWallet(0);
    const { store, data } = makeLocalStore();
    const foreign = wallet.add();
    const fetchImpl = server([foreign]);

    await linkWalletSources({ sessionStore, localStore: store, fetchImpl });
    expect(data[LINK_STATUS_ID]).toEqual({
      [wallet.sub]: "linked",
      [foreign]: "conflict",
    });

    await linkWalletSources({ sessionStore, localStore: store, fetchImpl });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("does not retry a 401 in place and stores nothing", async () => {
    makeWallet(1);
    const { store, data } = makeLocalStore();
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(new Response(null, { status: 401 }));

    await linkWalletSources({ sessionStore, localStore: store, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(LINK_STATUS_ID in data).toBe(false);
  });

  it("sends nothing when the session holds no signer", async () => {
    mockGetSigningIdentity.mockResolvedValue(null);
    const { store } = makeLocalStore();
    const fetchImpl = server();

    await linkWalletSources({ sessionStore, localStore: store, fetchImpl });

    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("sends nothing and stores nothing when the signer is not the pin", async () => {
    makeWallet(2);
    // The pinned source did not derive this unlock: getSigningIdentity fell
    // back to another held source.
    mockGetPinnedSourceId.mockResolvedValue("ab".repeat(32));
    const { store, data } = makeLocalStore();
    const fetchImpl = server();

    await linkWalletSources({ sessionStore, localStore: store, fetchImpl });

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(LINK_STATUS_ID in data).toBe(false);
  });

  it("coalesces overlapping calls into one request plus one rerun", async () => {
    const wallet = makeWallet(1);
    const { store } = makeLocalStore();
    const inner = server();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let sent: () => void = () => undefined;
    const firstSent = new Promise<void>((resolve) => {
      sent = resolve;
    });
    const fetchImpl = jest.fn(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        if (fetchImpl.mock.calls.length === 1) {
          sent();
          await gate;
        }
        return inner(url, init);
      },
    );

    const first = linkWalletSources({
      sessionStore,
      localStore: store,
      fetchImpl,
    });
    await firstSent;
    // A source add and an unlock both land while the first request is out.
    const added = wallet.add();
    const second = linkWalletSources({
      sessionStore,
      localStore: store,
      fetchImpl,
    });
    const third = linkWalletSources({
      sessionStore,
      localStore: store,
      fetchImpl,
    });
    release();
    await Promise.all([first, second, third]);

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sentIds(fetchImpl.mock.calls[1])).toEqual([wallet.sub, added]);
  });

  it("splits a large wallet into bodies that each start with sub", async () => {
    const wallet = makeWallet(MAX_LINK_SOURCES + 10);
    const { store, data } = makeLocalStore();
    const fetchImpl = server();

    await linkWalletSources({
      sessionStore,
      localStore: store,
      fetchImpl,
      clock: () => NOW,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (const call of fetchImpl.mock.calls) {
      expect(sentIds(call)[0]).toBe(wallet.sub);
      expect(jwtIat(call)).toBe(Math.floor(NOW / 1000));
    }
    expect(Object.keys(data[LINK_STATUS_ID] as object)).toHaveLength(
      wallet.ids().length,
    );
  });

  it("signs each body under a fresh iat when an earlier call is slow", async () => {
    const wallet = makeWallet(MAX_LINK_SOURCES + 10);
    const { store, data } = makeLocalStore();
    const inner = server();
    let time = NOW;
    const fetchImpl = jest.fn(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        // The first response outlives the 15-second JWT.
        time += 16_000;
        return inner(url, init);
      },
    );

    await linkWalletSources({
      sessionStore,
      localStore: store,
      fetchImpl,
      clock: () => time,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [first, second] = fetchImpl.mock.calls;
    expect(jwtIat(first)).toBe(Math.floor(NOW / 1000));
    expect(jwtIat(second)).toBe(Math.floor((NOW + 16_000) / 1000));
    expectConsentsVerify(second, wallet, jwtIat(second));
    expect(Object.keys(data[LINK_STATUS_ID] as object)).toHaveLength(
      wallet.ids().length,
    );
  });

  it("stops at the first failed body and leaves the rest unsettled", async () => {
    const wallet = makeWallet(MAX_LINK_SOURCES + 10);
    const { store, data } = makeLocalStore();
    const ok = server();
    const fetchImpl = jest
      .fn()
      .mockImplementationOnce(ok)
      .mockResolvedValueOnce(new Response(null, { status: 500 }));

    await linkWalletSources({ sessionStore, localStore: store, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(Object.keys(data[LINK_STATUS_ID] as object)).toHaveLength(
      MAX_LINK_SOURCES,
    );
    expect(wallet.ids().length).toBeGreaterThan(MAX_LINK_SOURCES);
  });

  it("drops a response that lands after the wallet was replaced", async () => {
    makeWallet(1);
    const { store, data } = makeLocalStore();
    const inner = server();
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let sent: () => void = () => undefined;
    const firstSent = new Promise<void>((resolve) => {
      sent = resolve;
    });
    const fetchImpl = jest.fn(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        sent();
        await gate;
        return inner(url, init);
      },
    );

    const pass = linkWalletSources({
      sessionStore,
      localStore: store,
      fetchImpl,
    });
    await firstSent;
    // A recover or an overwrite clears the map while the request is out.
    await clearLinkStatus({ localStore: store });
    release();
    await pass;

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(LINK_STATUS_ID in data).toBe(false);
  });

  it("sends no further body once the wallet is replaced mid-pass", async () => {
    makeWallet(MAX_LINK_SOURCES + 10);
    const { store, data } = makeLocalStore();
    const inner = server();
    const fetchImpl = jest.fn(
      async (url: RequestInfo | URL, init?: RequestInit) => {
        const res = await inner(url, init);
        if (fetchImpl.mock.calls.length === 1) {
          await clearLinkStatus({ localStore: store });
        }
        return res;
      },
    );

    await linkWalletSources({ sessionStore, localStore: store, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(LINK_STATUS_ID in data).toBe(false);
  });
});
