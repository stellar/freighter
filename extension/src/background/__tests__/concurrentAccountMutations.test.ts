import { randomUUID } from "crypto";
import { Keypair } from "stellar-sdk";

import { SERVICE_TYPES } from "@shared/constants/services";
import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
} from "@shared/api/helpers/authKeypairVectors";
import { Account, SecretSource } from "@shared/api/types";
import {
  ACCOUNT_PROVENANCE_ID,
  DERIVATION_INDICES_ID,
  KEY_ID_LIST,
  SECRET_SOURCES_ID,
  TEMPORARY_STORE_ID,
} from "constants/localStorageTypes";

// #112: account-mutating messages from two surfaces (popup, sidebar,
// fullscreen) must not lose each other's writes. Each message builds its own
// session store from storage.session, so these run through the real
// onMessage listener with real storage.local and storage.session stand-ins.

const [PHRASE_1, PHRASE_2] = AUTH_KEYPAIR_VECTORS;
const [ROWS_1, ROWS_2] = ACCOUNT_SOURCE_VECTORS.map(({ accounts }) => accounts);
const PASSWORD = "test";

const makeArea = () => {
  const data: Record<string, unknown> = {};
  // Real storage writes cross an IPC boundary; a delay lets a test model a
  // write that hasn't landed when the next reader looks.
  const latency = { ms: 0 };
  const pick = (keys: unknown) => {
    if (keys === null || keys === undefined) return { ...data };
    const list = typeof keys === "string" ? [keys] : (keys as string[]);
    return Object.fromEntries(
      list.filter((k) => k in data).map((k) => [k, data[k]]),
    );
  };
  return {
    data,
    latency,
    get: jest.fn(async (keys: unknown) => structuredClone(pick(keys))),
    set: jest.fn(async (items: Record<string, unknown>) => {
      const copy = structuredClone(items);
      if (latency.ms) {
        await new Promise((resolve) => setTimeout(resolve, latency.ms));
      }
      Object.assign(data, copy);
    }),
    remove: jest.fn(async (keys: string | string[]) => {
      for (const k of Array.isArray(keys) ? keys : [keys]) delete data[k];
    }),
    clear: jest.fn(async () => {
      for (const k of Object.keys(data)) delete data[k];
    }),
    getBytesInUse: jest.fn(async () => 0),
    onChanged: { addListener: jest.fn(), removeListener: jest.fn() },
  };
};

const mockLocal = makeArea();
const mockSession = makeArea();
let mockMessageListener: (request: unknown, sender: unknown) => Promise<any>;

jest.mock("webextension-polyfill", () => ({
  __esModule: true,
  default: {
    storage: {
      get local() {
        return mockLocal;
      },
      get session() {
        return mockSession;
      },
    },
    runtime: {
      id: "fake-extension-id",
      getURL: (path: string) => `chrome-extension://fake-extension-id${path}`,
      sendMessage: jest.fn().mockResolvedValue(undefined),
      onMessage: {
        addListener: (fn: typeof mockMessageListener) => {
          mockMessageListener = fn;
        },
      },
    },
    alarms: {
      create: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(true),
      onAlarm: { addListener: jest.fn() },
    },
  },
}));

jest.mock("background/helpers/link-sources", () => ({
  linkWalletSources: jest.fn().mockResolvedValue(undefined),
}));

// StellarHDWallet.fromMnemonic cannot run under jest (bip39 CJS interop), so
// derive from the pinned (mnemonic, index) rows.
const mockGenerated: string[] = [];
jest.mock("stellar-hd-wallet", () => {
  const { ACCOUNT_SOURCE_VECTORS: vectors } = jest.requireActual(
    "@shared/api/helpers/authKeypairVectors",
  );
  return {
    generateMnemonic: () => mockGenerated.shift(),
    fromMnemonic: (mnemonic: string) => {
      const rows = vectors.find((v: any) => v.mnemonic === mnemonic).accounts;
      return {
        getPublicKey: (i: number) => rows[i].publicKey,
        getSecret: (i: number) => rows[i].secret,
      };
    },
  };
});

if (!global.crypto.randomUUID) {
  Object.defineProperty(global.crypto, "randomUUID", { value: randomUUID });
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { initExtensionMessageListener } = require("background/index");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getAccountNameList } = require("background/helpers/account");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { dataStorageAccess } = require("background/helpers/dataStorageAccess");

const send = (request: object) =>
  mockMessageListener(request, { id: "fake-extension-id" });

const session = () =>
  JSON.parse((mockSession.data["session-store"] as string) ?? "{}").session ??
  {};

const allAccounts = (): Account[] => session().allAccounts ?? [];

const local = (key: string) => mockLocal.data[key] as any;

const createWallet = async () => {
  mockGenerated.push(PHRASE_1.mnemonic);
  await send({
    type: SERVICE_TYPES.CREATE_ACCOUNT,
    password: PASSWORD,
    isOverwritingAccount: false,
  });
};

const generateSecondPhrase = async () => {
  mockGenerated.push(PHRASE_2.mnemonic);
  const { pendingPhraseId } = await send({
    type: SERVICE_TYPES.GENERATE_RECOVERY_PHRASE,
  });
  await send({
    type: SERVICE_TYPES.ADD_RECOVERY_PHRASE_SOURCE,
    password: PASSWORD,
    pendingPhraseId,
  });
};

const importKey = (secret: string) =>
  send({
    type: SERVICE_TYPES.IMPORT_ACCOUNT,
    password: PASSWORD,
    privateKey: secret,
  });

const addAccount = (sourceId: string) =>
  send({ type: SERVICE_TYPES.ADD_ACCOUNT, password: PASSWORD, sourceId });

describe("concurrent account-mutating messages", () => {
  jest.setTimeout(120_000);

  beforeAll(() => {
    initExtensionMessageListener();
  });

  beforeEach(async () => {
    mockSession.latency.ms = 0;
    await mockLocal.clear();
    await mockSession.clear();
    mockGenerated.length = 0;
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ account_id: "funded" }),
      }),
    ) as unknown as typeof fetch;
    await createWallet();
  });

  it("keeps both of two concurrent secret-key imports", async () => {
    const [a, b] = [Keypair.random(), Keypair.random()];

    const results = await Promise.all([
      importKey(a.secret()),
      importKey(b.secret()),
    ]);

    expect(results.map((r) => r.error)).toEqual([undefined, undefined]);
    const imported = allAccounts().filter(({ publicKey }) =>
      [a.publicKey(), b.publicKey()].includes(publicKey),
    );
    expect(imported).toHaveLength(2);
    expect(new Set(allAccounts().map(({ name }) => name)).size).toBe(3);

    const keyIds = local(KEY_ID_LIST) as string[];
    expect(keyIds).toHaveLength(3);
    expect(Object.keys(local(TEMPORARY_STORE_ID))).toEqual(
      expect.arrayContaining(keyIds),
    );
    const names = await getAccountNameList({
      localStore: dataStorageAccess(mockLocal),
    });
    expect(Object.keys(names).sort()).toEqual([...keyIds].sort());
    expect(new Set(Object.values(names as Record<string, string>)).size).toBe(
      3,
    );

    const sources = Object.values(
      local(SECRET_SOURCES_ID) as Record<string, SecretSource>,
    );
    expect(sources).toHaveLength(3);
    expect(new Set(sources.map(({ label }) => label)).size).toBe(3);
  });

  it("hands the next holder the previous holder's session when writes are slow", async () => {
    mockSession.latency.ms = 50;
    const [a, b] = [Keypair.random(), Keypair.random()];

    await Promise.all([importKey(a.secret()), importKey(b.secret())]);
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(allAccounts().map(({ publicKey }) => publicKey)).toEqual(
      expect.arrayContaining([a.publicKey(), b.publicKey()]),
    );
  });

  it("gives two concurrent adds on one phrase distinct indices", async () => {
    const results = await Promise.all([
      addAccount(PHRASE_1.userId),
      addAccount(PHRASE_1.userId),
    ]);

    expect(results.map((r) => r.publicKey).sort()).toEqual(
      [ROWS_1[1].publicKey, ROWS_1[2].publicKey].sort(),
    );
    expect(local(DERIVATION_INDICES_ID)[PHRASE_1.userId]).toEqual([0, 1, 2]);
    expect(allAccounts()).toHaveLength(3);
  });

  it("keeps both phrases' marks for concurrent adds on different phrases", async () => {
    await generateSecondPhrase();

    await Promise.all([
      addAccount(PHRASE_1.userId),
      addAccount(PHRASE_2.userId),
    ]);

    expect(local(DERIVATION_INDICES_ID)).toEqual({
      [PHRASE_1.userId]: [0, 1],
      [PHRASE_2.userId]: [0, 1],
    });
    expect(allAccounts().map(({ publicKey }) => publicKey)).toEqual(
      expect.arrayContaining([ROWS_1[1].publicKey, ROWS_2[1].publicKey]),
    );
  });

  it("gives a concurrent add and import distinct names and provenance", async () => {
    const key = Keypair.random();

    await Promise.all([addAccount(PHRASE_1.userId), importKey(key.secret())]);

    expect(allAccounts()).toHaveLength(3);
    expect(new Set(allAccounts().map(({ name }) => name)).size).toBe(3);
    const provenance = local(ACCOUNT_PROVENANCE_ID);
    for (const { id } of allAccounts()) {
      expect(provenance[id]).toBeDefined();
    }
  });

  it("keeps a rename made while an import is in flight", async () => {
    const [first] = allAccounts();
    const key = Keypair.random();

    await Promise.all([
      importKey(key.secret()),
      send({
        type: SERVICE_TYPES.UPDATE_ACCOUNT_NAME,
        id: first.id,
        accountName: "Renamed",
      }),
    ]);

    expect(allAccounts().find(({ id }) => id === first.id)?.name).toBe(
      "Renamed",
    );
    expect(
      allAccounts().find(({ publicKey }) => publicKey === key.publicKey()),
    ).toBeDefined();
  });

  it("stays locked when a sign-out lands during an import", async () => {
    const key = Keypair.random();

    const importing = importKey(key.secret());
    const signingOut = send({ type: SERVICE_TYPES.SIGN_OUT });
    await Promise.all([importing, signingOut]);

    expect(session().publicKey).toBeFalsy();
  });

  it("answers a read-only message without waiting for an in-flight import", async () => {
    const order: string[] = [];
    const key = Keypair.random();

    await Promise.all([
      importKey(key.secret()).then(() => order.push("import")),
      send({ type: SERVICE_TYPES.LOAD_ACCOUNT }).then(() => order.push("load")),
    ]);

    expect(order).toEqual(["load", "import"]);
  });
});
