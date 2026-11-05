import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";
import { Buffer } from "buffer";
import { Keypair } from "stellar-sdk";

import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
  SOURCE_IDENTITY_VECTOR,
} from "@shared/api/helpers/authKeypairVectors";
import { buildAuthJwt } from "@shared/api/helpers/buildAuthJwt";
import { SecretSourceType } from "@shared/api/types";
import { sessionSlice } from "background/ducks/session";
import {
  KEY_ID,
  KEY_ID_LIST,
  PINNED_SOURCE_ID,
} from "constants/localStorageTypes";

import {
  addSecretSource,
  clearPinnedSourceId,
  clearSecretSources,
  getPinnedSourceId,
  setPinnedSourceId,
} from "../secret-sources";
import {
  clearCachedWalletSources,
  deriveKeyFromString,
  storeActiveHashKey,
  storeEncryptedTemporaryData,
  storeMnemonics,
} from "../session";
import { getWalletSources } from "../wallet-sources";
import { getSigningIdentity } from "../signing-identity";

jest.mock("background/helpers/wallet-sources", () => {
  const actual = jest.requireActual("background/helpers/wallet-sources");
  return { ...actual, getWalletSources: jest.fn(actual.getWalletSources) };
});

jest.mock("background/helpers/account", () => ({
  HW_PREFIX: "hw:",
  getKeyIdList: async ({ localStore }: any) =>
    (await localStore.getItem("keyIdList")) || [],
}));

jest.mock("background/store", () => ({
  flushSessionStore: jest.fn().mockResolvedValue(undefined),
}));

const mockCaptureException = jest.fn();
jest.mock("@sentry/browser", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

const mockGetWalletSources = getWalletSources as jest.Mock;

const [phraseA] = ACCOUNT_SOURCE_VECTORS;
const phraseAId = AUTH_KEYPAIR_VECTORS.find(
  (v) => v.mnemonic === phraseA.mnemonic,
)!.userId;

// A key no held phrase derives: the fixed seed SOURCE_IDENTITY_VECTOR pins.
const importedSecret = Keypair.fromRawEd25519Seed(
  Buffer.from(SOURCE_IDENTITY_VECTOR.seed32Hex, "hex"),
).secret();
const importedId = SOURCE_IDENTITY_VECTOR.sourceId;

const makeSessionStore = () =>
  configureStore({
    reducer: combineReducers({ session: sessionSlice.reducer }),
  });

const makeLocalStore = () => {
  const data: Record<string, unknown> = {};
  return {
    getItem: jest.fn(async (key: string) => data[key]),
    setItem: jest.fn(async (key: string, value: unknown) => {
      data[key] = value;
    }),
    remove: jest.fn(async (key: string) => {
      delete data[key];
    }),
  } as any;
};

/* Decodes a compact JWS and checks its signature against `sub`. */
const verifyJwt = (jwt: string) => {
  const [header, payload, signature] = jwt.split(".");
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  // `sub` is the raw public key in hex, so it alone verifies the signature.
  const signer = new Keypair({
    type: "ed25519",
    publicKey: Buffer.from(claims.sub, "hex"),
  });
  return {
    sub: claims.sub as string,
    verifies: signer.verify(
      Buffer.from(`${header}.${payload}`, "utf8"),
      Buffer.from(signature, "base64url"),
    ),
  };
};

describe("getSigningIdentity", () => {
  // Real PBKDF2 (600k rounds) is the slow part; derive once for the block.
  let hashKey: { key: CryptoKey };

  beforeAll(async () => {
    hashKey = await deriveKeyFromString("password");
  });

  beforeEach(() => {
    jest.clearAllMocks();
    clearCachedWalletSources();
  });

  /*
    Lays out an unlocked wallet as loginToAllAccounts leaves it, registering
    sources in `order` the way the creation handlers do, so the first one
    takes the pin.
  */
  const unlock = async ({
    keystores,
    mnemonics = {},
    order,
    locked = false,
  }: {
    keystores: Record<string, string | null>;
    mnemonics?: Record<string, string>;
    order: { id: string; type: SecretSourceType }[];
    locked?: boolean;
  }) => {
    const localStore = makeLocalStore();
    const sessionStore = makeSessionStore();

    for (const { id, type } of order) {
      await addSecretSource({ localStore, id, type });
    }

    await localStore.setItem(KEY_ID_LIST, Object.keys(keystores));
    await localStore.setItem(KEY_ID, Object.keys(keystores)[0]);
    if (locked) {
      return { localStore, sessionStore };
    }

    for (const [keyId, secret] of Object.entries(keystores)) {
      if (secret) {
        await storeEncryptedTemporaryData({
          localStore,
          keyName: keyId,
          temporaryData: secret,
          hashKey,
        });
      }
    }
    if (Object.keys(mnemonics).length) {
      await storeMnemonics({ localStore, hashKey, mnemonics });
    }
    await storeActiveHashKey({ sessionStore, hashKey });

    return { localStore, sessionStore };
  };

  const phrase = { id: phraseAId, type: SecretSourceType.PHRASE };
  const key = { id: importedId, type: SecretSourceType.SECRET_KEY };

  it("signs a secret-key-only wallet with the key's source identity", async () => {
    const stores = await unlock({
      keystores: { "key-imported": importedSecret },
      order: [key],
    });

    const identity = await getSigningIdentity(stores);

    expect(identity?.sourceId).toBe(importedId);
    const jwt = await buildAuthJwt({
      keypair: identity!.keypair,
      method: "GET",
      path: "/api/v1/user",
    });
    expect(verifyJwt(jwt)).toEqual({ sub: importedId, verifies: true });
  });

  it("signs with the phrase when the phrase came before an imported key", async () => {
    const stores = await unlock({
      keystores: {
        "key-a0": phraseA.accounts[0].secret,
        "key-imported": importedSecret,
      },
      mnemonics: { [phraseAId]: phraseA.mnemonic },
      order: [phrase, key],
    });

    expect((await getSigningIdentity(stores))?.sourceId).toBe(phraseAId);
  });

  it("signs with the key when the key came before a phrase", async () => {
    const stores = await unlock({
      keystores: {
        "key-imported": importedSecret,
        "key-a0": phraseA.accounts[0].secret,
      },
      mnemonics: { [phraseAId]: phraseA.mnemonic },
      order: [key, phrase],
    });

    expect((await getSigningIdentity(stores))?.sourceId).toBe(importedId);
  });

  it("does not follow the active account, including to a hardware account", async () => {
    const hwKeyId = `hw:${phraseA.accounts[2].publicKey}`;
    const stores = await unlock({
      keystores: {
        "key-a0": phraseA.accounts[0].secret,
        "key-imported": importedSecret,
        [hwKeyId]: null,
      },
      mnemonics: { [phraseAId]: phraseA.mnemonic },
      order: [phrase, key],
    });

    const ids: (string | undefined)[] = [];
    for (const active of ["key-a0", "key-imported", hwKeyId]) {
      await stores.localStore.setItem(KEY_ID, active);
      ids.push((await getSigningIdentity(stores))?.sourceId);
    }

    expect(ids).toEqual([phraseAId, phraseAId, phraseAId]);
  });

  it("falls back to a held source, without moving the pin, when the pinned source is not held", async () => {
    const stores = await unlock({
      keystores: { "key-imported": importedSecret },
      order: [key],
    });
    await setPinnedSourceId({
      localStore: stores.localStore,
      sourceId: phraseAId,
    });

    expect((await getSigningIdentity(stores))?.sourceId).toBe(importedId);
    expect(await getPinnedSourceId(stores)).toBe(phraseAId);
    expect(mockCaptureException).toHaveBeenCalled();
  });

  it("prefers a held phrase over a key when falling back", async () => {
    const stores = await unlock({
      keystores: {
        "key-imported": importedSecret,
        "key-a0": phraseA.accounts[0].secret,
      },
      mnemonics: { [phraseAId]: phraseA.mnemonic },
      order: [],
    });
    await setPinnedSourceId({
      localStore: stores.localStore,
      sourceId: "f".repeat(64),
    });

    expect((await getSigningIdentity(stores))?.sourceId).toBe(phraseAId);
  });

  it("signs as the earliest registered source, without pinning it, when the wallet has no pin", async () => {
    // Held sources list phrases first, so the key is not the first held one.
    const stores = await unlock({
      keystores: {
        "key-imported": importedSecret,
        "key-a0": phraseA.accounts[0].secret,
      },
      mnemonics: { [phraseAId]: phraseA.mnemonic },
      order: [key, phrase],
    });
    await stores.localStore.remove(PINNED_SOURCE_ID);

    expect((await getSigningIdentity(stores))?.sourceId).toBe(importedId);
    expect(await getPinnedSourceId(stores)).toBeNull();
  });

  it("signs as a held phrase, without pinning it, when the wallet has no pin and no records", async () => {
    const stores = await unlock({
      keystores: {
        "key-imported": importedSecret,
        "key-a0": phraseA.accounts[0].secret,
      },
      mnemonics: { [phraseAId]: phraseA.mnemonic },
      order: [],
    });

    expect((await getSigningIdentity(stores))?.sourceId).toBe(phraseAId);
    expect(await getPinnedSourceId(stores)).toBeNull();
  });

  it("returns null when the wallet has no pin, no records and no held phrase", async () => {
    const stores = await unlock({
      keystores: { "key-imported": importedSecret },
      order: [],
    });

    expect(await getSigningIdentity(stores)).toBeNull();
    expect(await getPinnedSourceId(stores)).toBeNull();
  });

  it("does not pin the old wallet's source when a request overlaps a wallet wipe", async () => {
    const stores = await unlock({
      keystores: { "key-a0": phraseA.accounts[0].secret },
      mnemonics: { [phraseAId]: phraseA.mnemonic },
      order: [phrase],
    });
    const newPhraseId = "b".repeat(64);
    const actual = jest.requireActual("background/helpers/wallet-sources");
    // The wipe (createAccount with isOverwritingAccount) lands mid-derivation
    // and does not lock, so the derivation still returns the old sources.
    mockGetWalletSources.mockImplementationOnce(async (args) => {
      const sources = await actual.getWalletSources(args);
      await clearSecretSources(stores);
      await clearPinnedSourceId(stores);
      return sources;
    });

    await getSigningIdentity(stores);
    await addSecretSource({
      localStore: stores.localStore,
      id: newPhraseId,
      type: SecretSourceType.PHRASE,
    });

    expect(await getPinnedSourceId(stores)).toBe(newPhraseId);
  });

  it("returns null while locked", async () => {
    const stores = await unlock({
      keystores: { "key-imported": importedSecret },
      order: [key],
      locked: true,
    });

    expect(await getSigningIdentity(stores)).toBeNull();
  });

  it("returns null for a hardware-only session", async () => {
    // A hardware unlock stores no hash key and holds no signer.
    const stores = await unlock({
      keystores: { [`hw:${phraseA.accounts[2].publicKey}`]: null },
      order: [],
      locked: true,
    });

    expect(await getSigningIdentity(stores)).toBeNull();
  });

  it("reports an unexpected failure and returns null", async () => {
    const stores = await unlock({
      keystores: { "key-imported": importedSecret },
      order: [key],
    });
    const error = new Error("derivation failed");
    mockGetWalletSources.mockRejectedValueOnce(error);

    expect(await getSigningIdentity(stores)).toBeNull();
    expect(mockCaptureException).toHaveBeenCalledWith(error, expect.anything());
  });
});
