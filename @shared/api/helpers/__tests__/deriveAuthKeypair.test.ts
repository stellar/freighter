import { Buffer } from "buffer";
import { Keypair, xdr } from "stellar-sdk";

import {
  AUTH_SALT,
  deriveAuthKeypair,
  deriveAuthSeed,
  deriveSourceIdentity,
} from "../deriveAuthKeypair";
import {
  ACCOUNT_SOURCE_VECTORS,
  AUTH_KEYPAIR_VECTORS,
  SOURCE_IDENTITY_VECTOR,
} from "../authKeypairVectors";

const pubHex = (keypair: Keypair): string =>
  xdr.encodeBytes(keypair.rawPublicKey(), "hex");

const accountRows = ACCOUNT_SOURCE_VECTORS.flatMap(({ mnemonic, accounts }) =>
  accounts.map((account) => ({ mnemonic, ...account })),
);

describe("deriveAuthSeed (HMAC step)", () => {
  it("uses the versioned domain-separation salt", () => {
    expect(AUTH_SALT).toBe("freighter-auth-v1");
  });

  it.each(AUTH_KEYPAIR_VECTORS)(
    "reproduces the committed authSeed for %#",
    async ({ mnemonic, authSeedHex }) => {
      const seed = await deriveAuthSeed(mnemonic);
      expect(seed).toHaveLength(32);
      expect(Buffer.from(seed).toString("hex")).toBe(authSeedHex);
    },
  );
});

describe("deriveAuthKeypair", () => {
  // Acceptance #1: same seed -> identical userId on extension and mobile.
  it.each(AUTH_KEYPAIR_VECTORS)(
    "derives the committed userId for %#",
    async ({ mnemonic, userId }) => {
      const result = await deriveAuthKeypair(mnemonic);
      expect(result.userId).toBe(userId);
    },
  );

  it("is deterministic for the same mnemonic", async () => {
    const { mnemonic } = AUTH_KEYPAIR_VECTORS[0];
    const a = await deriveAuthKeypair(mnemonic);
    const b = await deriveAuthKeypair(mnemonic);
    expect(a.userId).toBe(b.userId);
    expect(xdr.encodeBytes(a.keypair.rawPublicKey(), "hex")).toBe(
      xdr.encodeBytes(b.keypair.rawPublicKey(), "hex"),
    );
  });

  it("emits a lowercase 64-char hex userId", async () => {
    const { userId } = await deriveAuthKeypair(
      AUTH_KEYPAIR_VECTORS[0].mnemonic,
    );
    expect(userId).toMatch(/^[0-9a-f]{64}$/);
  });

  // Acceptance #2: cryptographically independent from the wallet keypair.
  // Wallet account-0 public key for AUTH_KEYPAIR_VECTORS[0]'s mnemonic, hex.
  // Hardcoded verified constant — StellarHDWallet (the normal way to derive it)
  // cannot run under jest/jsdom (compiled bip39 import breaks). This shows the
  // auth key differs from the wallet key derived from the same seed.
  it("differs from the wallet account-0 public key for the same mnemonic", async () => {
    const WALLET_ACCOUNT_0_HEX =
      "7691d85048acc4ed085d9061ce0948bbdf7de6a92b790aaf241d31b7dcaa4238";
    const { userId } = await deriveAuthKeypair(
      AUTH_KEYPAIR_VECTORS[0].mnemonic,
    );
    expect(userId).not.toBe(WALLET_ACCOUNT_0_HEX);
  });

  // Acceptance #3: no messaging side effects.
  // Purity is guaranteed structurally: the module imports nothing from the
  // messaging/keyManager/storage paths. This spy is a lightweight tripwire
  // that would catch a future regression which started sending messages.
  it("never sends an extension message during derivation", async () => {
    const sendMessage = jest.fn();
    (globalThis as unknown as { browser?: unknown }).browser = {
      runtime: { sendMessage },
    };
    try {
      await deriveAuthKeypair(AUTH_KEYPAIR_VECTORS[0].mnemonic);
      expect(sendMessage).not.toHaveBeenCalled();
    } finally {
      delete (globalThis as unknown as { browser?: unknown }).browser;
    }
  });

  it("throws on an invalid mnemonic instead of producing a key", async () => {
    await expect(
      deriveAuthKeypair("not a valid mnemonic phrase"),
    ).rejects.toThrow(/invalid mnemonic/i);
  });
});

describe("deriveSourceIdentity", () => {
  const fixedSeed = () => Buffer.from(SOURCE_IDENTITY_VECTOR.seed32Hex, "hex");

  it("derives the committed sourceId for the fixed 32-byte seed", async () => {
    const { sourceId, keypair } = await deriveSourceIdentity(fixedSeed());
    expect(sourceId).toBe(SOURCE_IDENTITY_VECTOR.sourceId);
    expect(sourceId).toMatch(/^[0-9a-f]{64}$/);
    expect(pubHex(keypair)).toBe(sourceId);
  });

  it("is deterministic for the same seed", async () => {
    const a = await deriveSourceIdentity(fixedSeed());
    const b = await deriveSourceIdentity(fixedSeed());
    expect(a.sourceId).toBe(b.sourceId);
    expect(pubHex(a.keypair)).toBe(pubHex(b.keypair));
  });

  // A 64-byte input is the dangerous one: HMAC would accept it and the result
  // would be a phrase id, silently conflating the two source kinds.
  it.each([31, 33, 64])(
    "rejects a %d-byte seed instead of producing an id",
    async (length) => {
      await expect(
        deriveSourceIdentity(new Uint8Array(length).fill(1)),
      ).rejects.toThrow(/32 bytes/);
    },
  );

  // Pins the construction independently of the module's private helper: same
  // salt as the phrase derivation, HMAC-SHA256, keyed on the 32-byte seed.
  it("is pub(HMAC-SHA256(seed32, AUTH_SALT))", async () => {
    const seed = fixedSeed();
    const key = await crypto.subtle.importKey(
      "raw",
      new Uint8Array(seed),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(AUTH_SALT),
    );
    const expected = pubHex(Keypair.fromRawEd25519Seed(Buffer.from(mac)));
    expect((await deriveSourceIdentity(seed)).sourceId).toBe(expected);
  });

  it("never sends an extension message during derivation", async () => {
    const sendMessage = jest.fn();
    (globalThis as unknown as { browser?: unknown }).browser = {
      runtime: { sendMessage },
    };
    try {
      await deriveSourceIdentity(fixedSeed());
      expect(sendMessage).not.toHaveBeenCalled();
    } finally {
      delete (globalThis as unknown as { browser?: unknown }).browser;
    }
  });
});

// The phrase-path == exported-secret equality lives in
// identityContinuity.test.ts, next to the continuity guard.
describe("deriveSourceIdentity (account vectors)", () => {
  it.each(accountRows)(
    "differs from the phrase userId for $mnemonic index $index",
    async ({ mnemonic, sourceId }) => {
      const { userId } = await deriveAuthKeypair(mnemonic);
      expect(sourceId).not.toBe(userId);
    },
  );

  // An id equal to the account's public key would let the identity table
  // reveal G addresses.
  it.each(accountRows)(
    "differs from the account's own public key for $mnemonic index $index",
    ({ secret, sourceId }) => {
      expect(sourceId).not.toBe(pubHex(Keypair.fromSecret(secret)));
    },
  );

  it.each(ACCOUNT_SOURCE_VECTORS)(
    "account ids for one phrase are pairwise distinct ($mnemonic)",
    ({ accounts }) => {
      const ids = accounts.map(({ sourceId }) => sourceId);
      expect(new Set(ids).size).toBe(ids.length);
    },
  );

  it("account ids across phrases are distinct from each other and from every phrase userId", () => {
    const ids = [
      ...accountRows.map(({ sourceId }) => sourceId),
      ...AUTH_KEYPAIR_VECTORS.map(({ userId }) => userId),
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });
});
