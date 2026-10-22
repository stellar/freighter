import { Buffer } from "buffer";
import { Keypair } from "stellar-sdk";

import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
} from "@shared/api/helpers/authKeypairVectors";
import { SecretSourceType } from "@shared/api/types";
import type { DataStorageAccess } from "background/helpers/dataStorageAccess";
import {
  PINNED_SOURCE_ID,
  SECRET_SOURCES_ID,
} from "constants/localStorageTypes";
import { getMnemonics } from "background/helpers/session";

import {
  addSecretSource,
  clearPinnedSourceId,
  clearSecretSources,
  getDefaultMnemonic,
  getPhraseSourceId,
  getPinnedSourceId,
  getSecretKeySourceId,
  getSecretSources,
  setPinnedSourceId,
} from "../secret-sources";

jest.mock("background/helpers/session", () => ({
  getMnemonics: jest.fn(),
}));

const mockGetMnemonics = getMnemonics as jest.Mock;

// Minimal in-memory DataStorageAccess: plain values, no encoding, so tests can
// inspect exactly what the module persists.
const makeLocalStore = () => {
  const data: Record<string, unknown> = {};
  const store = {
    getItem: jest.fn(async (key: string) => data[key]),
    setItem: jest.fn(async (key: string, value: unknown) => {
      data[key] = value;
    }),
    remove: jest.fn(async (keys: string | string[]) => {
      for (const key of Array.isArray(keys) ? keys : [keys]) {
        delete data[key];
      }
    }),
    clear: jest.fn(async () => {
      for (const key of Object.keys(data)) {
        delete data[key];
      }
    }),
  } as unknown as DataStorageAccess;
  return { store, data };
};

const PHRASE_A = "a".repeat(64);
const PHRASE_B = "b".repeat(64);
const KEY_C = "c".repeat(64);

describe("secret source records", () => {
  it("returns an empty set when nothing is stored", async () => {
    const { store } = makeLocalStore();
    expect(await getSecretSources({ localStore: store })).toEqual({});
  });

  it("labels phrases and secret keys in independent sequences", async () => {
    const { store } = makeLocalStore();

    const first = await addSecretSource({
      localStore: store,
      id: PHRASE_A,
      type: SecretSourceType.PHRASE,
    });
    const key = await addSecretSource({
      localStore: store,
      id: KEY_C,
      type: SecretSourceType.SECRET_KEY,
    });
    const second = await addSecretSource({
      localStore: store,
      id: PHRASE_B,
      type: SecretSourceType.PHRASE,
    });

    expect(first.label).toBe("Seed Phrase 1");
    expect(key.label).toBe("Secret Key 1");
    expect(second.label).toBe("Seed Phrase 2");
    expect(Object.keys(await getSecretSources({ localStore: store }))).toEqual([
      PHRASE_A,
      KEY_C,
      PHRASE_B,
    ]);
  });

  it("persists the full record under its id", async () => {
    const { store, data } = makeLocalStore();
    const before = Date.now();

    const record = await addSecretSource({
      localStore: store,
      id: PHRASE_A,
      type: SecretSourceType.PHRASE,
    });

    expect(record).toEqual({
      id: PHRASE_A,
      type: SecretSourceType.PHRASE,
      label: "Seed Phrase 1",
      createdAt: expect.any(Number),
    });
    expect(record.createdAt).toBeGreaterThanOrEqual(before);
    expect(
      (data[SECRET_SOURCES_ID] as Record<string, unknown>)[PHRASE_A],
    ).toEqual(record);
  });

  it("is idempotent by id", async () => {
    const { store } = makeLocalStore();

    const first = await addSecretSource({
      localStore: store,
      id: PHRASE_A,
      type: SecretSourceType.PHRASE,
    });
    const again = await addSecretSource({
      localStore: store,
      id: PHRASE_A,
      type: SecretSourceType.PHRASE,
    });

    expect(again).toEqual(first);
    expect(Object.keys(await getSecretSources({ localStore: store }))).toEqual([
      PHRASE_A,
    ]);
  });

  it("never reuses a label number after a record is removed", async () => {
    const { store, data } = makeLocalStore();
    await addSecretSource({
      localStore: store,
      id: PHRASE_A,
      type: SecretSourceType.PHRASE,
    });
    await addSecretSource({
      localStore: store,
      id: PHRASE_B,
      type: SecretSourceType.PHRASE,
    });
    delete (data[SECRET_SOURCES_ID] as Record<string, unknown>)[PHRASE_A];

    const third = await addSecretSource({
      localStore: store,
      id: KEY_C,
      type: SecretSourceType.PHRASE,
    });

    expect(third.label).toBe("Seed Phrase 3");
  });

  it("clears the whole set", async () => {
    const { store, data } = makeLocalStore();
    await addSecretSource({
      localStore: store,
      id: PHRASE_A,
      type: SecretSourceType.PHRASE,
    });

    await clearSecretSources({ localStore: store });

    expect(data[SECRET_SOURCES_ID]).toBeUndefined();
    expect(await getSecretSources({ localStore: store })).toEqual({});
  });
});

describe("pinned source id", () => {
  it("is null until set", async () => {
    const { store } = makeLocalStore();
    expect(await getPinnedSourceId({ localStore: store })).toBeNull();
  });

  it("round-trips through plain local storage", async () => {
    const { store, data } = makeLocalStore();

    await setPinnedSourceId({ localStore: store, sourceId: PHRASE_A });

    expect(data[PINNED_SOURCE_ID]).toBe(PHRASE_A);
    expect(await getPinnedSourceId({ localStore: store })).toBe(PHRASE_A);
  });

  it("can be cleared", async () => {
    const { store } = makeLocalStore();
    await setPinnedSourceId({ localStore: store, sourceId: PHRASE_A });

    await clearPinnedSourceId({ localStore: store });

    expect(await getPinnedSourceId({ localStore: store })).toBeNull();
  });

  it("pins the first source a wallet registers", async () => {
    const { store } = makeLocalStore();

    await addSecretSource({
      localStore: store,
      id: KEY_C,
      type: SecretSourceType.SECRET_KEY,
    });
    await addSecretSource({
      localStore: store,
      id: PHRASE_A,
      type: SecretSourceType.PHRASE,
    });

    expect(await getPinnedSourceId({ localStore: store })).toBe(KEY_C);
  });

  it("does not move a pin that is already set", async () => {
    const { store } = makeLocalStore();
    await setPinnedSourceId({ localStore: store, sourceId: PHRASE_B });

    await addSecretSource({
      localStore: store,
      id: PHRASE_A,
      type: SecretSourceType.PHRASE,
    });

    expect(await getPinnedSourceId({ localStore: store })).toBe(PHRASE_B);
  });

  it("writes the pin before the source record", async () => {
    const { store } = makeLocalStore();

    await addSecretSource({
      localStore: store,
      id: PHRASE_A,
      type: SecretSourceType.PHRASE,
    });

    const keys = (store.setItem as jest.Mock).mock.calls.map(([key]) => key);
    expect(keys).toEqual([PINNED_SOURCE_ID, SECRET_SOURCES_ID]);
  });
});

describe("source ids", () => {
  it.each(AUTH_KEYPAIR_VECTORS)(
    "derives the pinned phrase source id for vector %#",
    async ({ mnemonic, userId }) => {
      expect(await getPhraseSourceId(mnemonic)).toBe(userId);
    },
  );

  it("rejects a string that is not a BIP39 mnemonic", async () => {
    await expect(getPhraseSourceId("not a mnemonic")).rejects.toThrow(
      "Invalid mnemonic",
    );
  });

  const rows = ACCOUNT_SOURCE_VECTORS.flatMap(({ mnemonic, accounts }) =>
    accounts.map((row) => ({ mnemonic, ...row })),
  );

  it.each(rows)(
    "derives the pinned secret-key source id for %#",
    async ({ mnemonic, secret, publicKey, sourceId }) => {
      const id = await getSecretKeySourceId(secret);
      const phraseId = AUTH_KEYPAIR_VECTORS.find(
        (v) => v.mnemonic === mnemonic,
      )?.userId;

      expect(id).toBe(sourceId);
      expect(id).not.toBe(phraseId);
      expect(id).not.toBe(
        Buffer.from(Keypair.fromPublicKey(publicKey).rawPublicKey()).toString(
          "hex",
        ),
      );
    },
  );

  it("throws on a malformed secret key", async () => {
    await expect(getSecretKeySourceId("SNOTAKEY")).rejects.toThrow();
  });
});

describe("getDefaultMnemonic", () => {
  const sessionStore = {} as never;

  beforeEach(() => {
    mockGetMnemonics.mockReset();
  });

  it("returns the pinned source's mnemonic when it is held", async () => {
    const { store } = makeLocalStore();
    await setPinnedSourceId({ localStore: store, sourceId: PHRASE_B });
    mockGetMnemonics.mockResolvedValue({
      [PHRASE_A]: "phrase a",
      [PHRASE_B]: "phrase b",
    });

    expect(
      await getDefaultMnemonic({ sessionStore, localStore: store }),
    ).toEqual({ sourceId: PHRASE_B, mnemonic: "phrase b" });
  });

  it("falls back to the first held phrase when the pin is absent", async () => {
    const { store } = makeLocalStore();
    mockGetMnemonics.mockResolvedValue({
      [PHRASE_A]: "phrase a",
      [PHRASE_B]: "phrase b",
    });

    expect(
      await getDefaultMnemonic({ sessionStore, localStore: store }),
    ).toEqual({ sourceId: PHRASE_A, mnemonic: "phrase a" });
  });

  it("falls back to the first held phrase when the pinned source is not held", async () => {
    const { store } = makeLocalStore();
    await setPinnedSourceId({ localStore: store, sourceId: KEY_C });
    mockGetMnemonics.mockResolvedValue({ [PHRASE_A]: "phrase a" });

    expect(
      await getDefaultMnemonic({ sessionStore, localStore: store }),
    ).toEqual({ sourceId: PHRASE_A, mnemonic: "phrase a" });
  });

  it("returns null when no phrase is held", async () => {
    const { store } = makeLocalStore();
    mockGetMnemonics.mockResolvedValue({});

    expect(
      await getDefaultMnemonic({ sessionStore, localStore: store }),
    ).toBeNull();
  });
});
