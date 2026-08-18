import { Buffer } from "buffer";

import {
  AUTH_SALT,
  deriveAuthKeypair,
  deriveAuthSeed,
} from "../deriveAuthKeypair";
import { AUTH_KEYPAIR_VECTORS } from "../authKeypairVectors";

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
    expect(a.keypair.rawPublicKey().equals(b.keypair.rawPublicKey())).toBe(
      true,
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
