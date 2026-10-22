import { combineReducers } from "redux";
import { configureStore } from "@reduxjs/toolkit";
import { Buffer } from "buffer";
import { Keypair } from "stellar-sdk";

import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
  SOURCE_IDENTITY_VECTOR,
} from "@shared/api/helpers/authKeypairVectors";
import { deriveAuthKeypair } from "@shared/api/helpers/deriveAuthKeypair";
import { SecretSourceType } from "@shared/api/types";
import { sessionSlice, timeoutAccountAccess } from "background/ducks/session";
import { getAccountProvenance } from "background/helpers/account-provenance";
import {
  ACCOUNT_PROVENANCE_ID,
  KEY_ID_LIST,
} from "constants/localStorageTypes";

import {
  clearCachedWalletSources,
  clearSession,
  deriveKeyFromString,
  storeActiveHashKey,
  storeEncryptedTemporaryData,
  storeMnemonics,
} from "../session";
import { getWalletSources } from "../wallet-sources";

jest.mock("@shared/api/helpers/deriveAuthKeypair", () => {
  const actual = jest.requireActual("@shared/api/helpers/deriveAuthKeypair");
  return { ...actual, deriveAuthKeypair: jest.fn(actual.deriveAuthKeypair) };
});

jest.mock("background/helpers/account", () => ({
  HW_PREFIX: "hw:",
  getKeyIdList: async ({ localStore }: any) =>
    (await localStore.getItem("keyIdList")) || [],
}));

jest.mock("background/helpers/account-provenance", () => ({
  getAccountProvenance: jest.fn(),
}));

jest.mock("background/store", () => ({
  flushSessionStore: jest.fn().mockResolvedValue(undefined),
}));

const mockCaptureException = jest.fn();
jest.mock("@sentry/browser", () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

const mockDeriveAuthKeypair = deriveAuthKeypair as jest.Mock;

const [phraseA, phraseB] = ACCOUNT_SOURCE_VECTORS;
const phraseId = (mnemonic: string) => {
  const vector = AUTH_KEYPAIR_VECTORS.find((v) => v.mnemonic === mnemonic);
  if (!vector) {
    throw new Error("no phrase vector for mnemonic");
  }
  return vector.userId;
};

// A key no held phrase derives: the fixed seed SOURCE_IDENTITY_VECTOR pins.
const importedSecret = Keypair.fromRawEd25519Seed(
  Buffer.from(SOURCE_IDENTITY_VECTOR.seed32Hex, "hex"),
).secret();

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

describe("getWalletSources", () => {
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
    Lays out an unlocked wallet as loginToAllAccounts leaves it: the keyId
    list in plain storage, every non-hardware private key and the held phrase
    map in the temporary store, and the hash key in the session store.
  */
  const unlock = async ({
    keystores,
    mnemonics,
    key = hashKey,
  }: {
    keystores: Record<string, string | null>;
    mnemonics: Record<string, string>;
    key?: { key: CryptoKey };
  }) => {
    const localStore = makeLocalStore();
    const sessionStore = makeSessionStore();

    await localStore.setItem(KEY_ID_LIST, Object.keys(keystores));
    for (const [keyId, secret] of Object.entries(keystores)) {
      if (secret) {
        await storeEncryptedTemporaryData({
          localStore,
          keyName: keyId,
          temporaryData: secret,
          hashKey: key,
        });
      }
    }
    if (Object.keys(mnemonics).length) {
      await storeMnemonics({ localStore, hashKey: key, mnemonics });
    }
    await storeActiveHashKey({ sessionStore, hashKey: key });

    return { localStore, sessionStore };
  };

  const twoPhraseWallet = (imported: string, key = hashKey) =>
    unlock({
      key,
      keystores: {
        "key-a0": phraseA.accounts[0].secret,
        "key-a1": phraseA.accounts[1].secret,
        "key-b0": phraseB.accounts[0].secret,
        "key-imported": imported,
      },
      mnemonics: {
        [phraseId(phraseA.mnemonic)]: phraseA.mnemonic,
        [phraseId(phraseB.mnemonic)]: phraseB.mnemonic,
      },
    });

  it("enumerates two phrases, three derived accounts and one imported key", async () => {
    const stores = await twoPhraseWallet(importedSecret);

    const { sources, signers } = await getWalletSources(stores);

    expect(sources).toEqual([
      { id: phraseId(phraseA.mnemonic), kind: SecretSourceType.PHRASE },
      { id: phraseId(phraseB.mnemonic), kind: SecretSourceType.PHRASE },
      { id: phraseA.accounts[0].sourceId, kind: SecretSourceType.SECRET_KEY },
      { id: phraseA.accounts[1].sourceId, kind: SecretSourceType.SECRET_KEY },
      { id: phraseB.accounts[0].sourceId, kind: SecretSourceType.SECRET_KEY },
      {
        id: SOURCE_IDENTITY_VECTOR.sourceId,
        kind: SecretSourceType.SECRET_KEY,
      },
    ]);
    expect([...signers.keys()]).toEqual(sources.map(({ id }) => id));
    // Each signer is the keypair whose public key is the source id.
    for (const [id, keypair] of signers) {
      expect(Buffer.from(keypair.rawPublicKey()).toString("hex")).toBe(id);
    }
  });

  it("lists an imported key that a held phrase also derives once", async () => {
    const stores = await twoPhraseWallet(phraseA.accounts[1].secret);

    const { sources, signers } = await getWalletSources(stores);

    expect(
      sources.filter(({ id }) => id === phraseA.accounts[1].sourceId),
    ).toHaveLength(1);
    expect(sources).toHaveLength(5);
    expect(signers.size).toBe(5);
  });

  it("produces nothing for a hardware wallet account", async () => {
    const stores = await unlock({
      keystores: {
        [`hw:${phraseA.accounts[2].publicKey}`]: null,
        "key-imported": importedSecret,
      },
      mnemonics: {},
    });

    const { sources } = await getWalletSources(stores);

    expect(sources).toEqual([
      {
        id: SOURCE_IDENTITY_VECTOR.sourceId,
        kind: SecretSourceType.SECRET_KEY,
      },
    ]);
  });

  it("produces nothing while locked", async () => {
    const stores = await twoPhraseWallet(importedSecret);
    stores.sessionStore.dispatch(timeoutAccountAccess());

    const { sources, signers } = await getWalletSources(stores);

    expect(sources).toEqual([]);
    expect(signers.size).toBe(0);
  });

  it("never reads account provenance", async () => {
    const stores = await twoPhraseWallet(importedSecret);

    await getWalletSources(stores);

    expect(getAccountProvenance).not.toHaveBeenCalled();
    expect(stores.localStore.getItem).not.toHaveBeenCalledWith(
      ACCOUNT_PROVENANCE_ID,
    );
  });

  it("skips and reports a phrase it cannot derive, keeping the rest", async () => {
    const stores = await unlock({
      keystores: { "key-imported": importedSecret },
      mnemonics: {
        "id-bad": "not a valid phrase",
        [phraseId(phraseA.mnemonic)]: phraseA.mnemonic,
      },
    });

    const { sources } = await getWalletSources(stores);

    expect(sources.map(({ id }) => id)).toEqual([
      phraseId(phraseA.mnemonic),
      SOURCE_IDENTITY_VECTOR.sourceId,
    ]);
    expect(mockCaptureException).toHaveBeenCalledWith(expect.any(Error), {
      extra: { context: "getWalletSources: deriving a phrase source" },
    });
  });

  describe("cache", () => {
    it("derives the phrases once per unlock", async () => {
      const stores = await twoPhraseWallet(importedSecret);

      const first = await getWalletSources(stores);
      const second = await getWalletSources(stores);

      expect(second).toBe(first);
      expect(mockDeriveAuthKeypair).toHaveBeenCalledTimes(2);
    });

    it("re-derives after a new unlock", async () => {
      await getWalletSources(await twoPhraseWallet(importedSecret));

      // Every unlock derives a fresh, randomly salted hash key.
      const nextKey = await deriveKeyFromString("password");
      const { sources } = await getWalletSources(
        await twoPhraseWallet(importedSecret, nextKey),
      );

      expect(sources).toHaveLength(6);
      expect(mockDeriveAuthKeypair).toHaveBeenCalledTimes(4);
    });

    it("re-derives when an account is added mid-session", async () => {
      const stores = await unlock({
        keystores: { "key-a0": phraseA.accounts[0].secret },
        mnemonics: { [phraseId(phraseA.mnemonic)]: phraseA.mnemonic },
      });
      expect((await getWalletSources(stores)).sources).toHaveLength(2);

      await storeEncryptedTemporaryData({
        localStore: stores.localStore,
        keyName: "key-imported",
        temporaryData: importedSecret,
        hashKey,
      });
      await stores.localStore.setItem(KEY_ID_LIST, ["key-a0", "key-imported"]);

      expect((await getWalletSources(stores)).sources).toHaveLength(3);
    });

    it("shares one derivation between concurrent callers", async () => {
      const stores = await twoPhraseWallet(importedSecret);

      const [first, second] = await Promise.all([
        getWalletSources(stores),
        getWalletSources(stores),
      ]);

      expect(second).toBe(first);
      expect(mockDeriveAuthKeypair).toHaveBeenCalledTimes(2);
    });

    it("does not keep a set missing a source that failed, so it retries", async () => {
      const stores = await twoPhraseWallet(importedSecret);
      mockDeriveAuthKeypair.mockRejectedValueOnce(new Error("transient"));

      expect((await getWalletSources(stores)).sources).toHaveLength(5);
      expect((await getWalletSources(stores)).sources).toHaveLength(6);
    });

    it("does not cache a derivation that a lock overtook", async () => {
      const stores = await twoPhraseWallet(importedSecret);

      const inFlight = getWalletSources(stores);
      await clearSession(stores);
      await inFlight;

      // Re-unlock under the same hash key: a stale entry would be served here.
      mockDeriveAuthKeypair.mockClear();
      await getWalletSources(await twoPhraseWallet(importedSecret));

      expect(mockDeriveAuthKeypair).toHaveBeenCalledTimes(2);
    });

    it("is dropped by clearSession", async () => {
      const stores = await twoPhraseWallet(importedSecret);
      await getWalletSources(stores);

      await clearSession(stores);
      // Unlock again with the same hash key, so only the cleared cache can
      // explain a re-derivation.
      const relocked = await twoPhraseWallet(importedSecret);
      await getWalletSources(relocked);

      expect(mockDeriveAuthKeypair).toHaveBeenCalledTimes(4);
    });
  });
});
