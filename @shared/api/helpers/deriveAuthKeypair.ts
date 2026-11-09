import { Buffer } from "buffer";
import { mnemonicToSeedSync, validateMnemonic, wordlists } from "bip39";
import { Keypair, xdr } from "stellar-sdk";

/**
 * Versioned domain-separation salt for the backend auth keypair. The `-v1`
 * suffix reserves a migration path; derivation is deterministic, so the auth
 * keypair is permanent for the life of the seed.
 *
 * Both source identities (phrase and account key) use this one salt. The key
 * length gives no domain separation — HMAC-SHA256 zero-pads a 32-byte key — so
 * separation comes from the inputs: a 64-byte BIP39 seed vs a 32-byte ed25519
 * seed. See unified-user-model/v2.md "How the derivation works".
 */
export const AUTH_SALT = "freighter-auth-v1";

/**
 * HMAC-SHA256 keyed on `key`, over AUTH_SALT. The single place the salt is
 * applied, shared by deriveAuthSeed and deriveSourceIdentity so it cannot
 * drift between the two derivations.
 */
const hmacAuthSalt = async (key: Uint8Array): Promise<Uint8Array> => {
  // Copy into an ArrayBuffer-backed Uint8Array so a Buffer<ArrayBufferLike>
  // (what bip39 and stellar-sdk hand us) satisfies crypto.subtle's BufferSource.
  const keyBytes = new Uint8Array(key);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false, // not extractable
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(AUTH_SALT),
  );
  return new Uint8Array(mac);
};

/**
 * Computes the 32-byte auth seed: HMAC-SHA256 keyed on the wallet's 64-byte
 * BIP39 seed, over the salt. Throws "Invalid mnemonic (see bip39)" on a
 * malformed mnemonic.
 *
 * Implementation note: stellar-hd-wallet@1.0.2's fromMnemonic() is an ESM
 * module whose internal bip39 default-import hits a Jest CJS interop edge case
 * (bip39 sets __esModule:true without a .default export). We call bip39 named
 * exports directly — bip39 is already a transitive dep of stellar-hd-wallet,
 * and the derivation is byte-for-byte identical.
 * @internal Exported only for tests (intermediate-value assertions). The
 * returned bytes are private-key seed material — do not use as a standalone key.
 */
export const deriveAuthSeed = async (mnemonic: string): Promise<Uint8Array> => {
  // Validate mnemonic first, matching stellar-hd-wallet's error contract.
  // Pin the english wordlist explicitly rather than relying on bip39's
  // implicit require-order default, matching the rest of the wallet's mnemonic
  // paths (StellarHDWallet.validateMnemonic(mnemonic, "english")).
  if (!validateMnemonic(mnemonic, wordlists.english)) {
    throw new Error("Invalid mnemonic (see bip39)");
  }
  // BIP39 seed, 64 bytes, empty passphrase — identical to what StellarHDWallet
  // .fromMnemonic(mnemonic).seedHex produces.
  return hmacAuthSalt(mnemonicToSeedSync(mnemonic));
};

/**
 * Derives the Freighter backend auth keypair from the wallet mnemonic.
 * Pure crypto: no logging, no keyManager, no messaging, no persistence. The
 * caller supplies the mnemonic (requires an unlocked session) and handles the
 * locked-session case.
 *
 * Frozen. This is the phrase source identity and the analytics identity of
 * every shipped wallet; its vectors in authKeypairVectors.ts are permanent.
 * deriveSourceIdentity is the counterpart for account secret keys.
 *
 * @returns userId  lowercase hex Ed25519 public key (64 chars) — the anonymous
 *                  backend user ID and the JWT `sub`.
 * @returns keypair stellar-sdk Keypair; the JWT ticket signs with keypair.sign().
 */
export const deriveAuthKeypair = async (
  mnemonic: string,
): Promise<{ userId: string; keypair: Keypair }> => {
  const authSeed = await deriveAuthSeed(mnemonic);
  const keypair = Keypair.fromRawEd25519Seed(Buffer.from(authSeed));
  const userId = xdr.encodeBytes(keypair.rawPublicKey(), "hex");
  return { userId, keypair };
};

/**
 * Derives the source identity of one account secret key, whether the account
 * was derived from a phrase at m/44'/148'/i' or imported standalone. Both
 * origins reduce to the same 32-byte seed and therefore the same id, which is
 * what lets a wallet that imports one exported account resolve to the phrase's
 * user. Pure crypto, same contract as deriveAuthKeypair.
 *
 * @param seed32 the account's raw 32-byte ed25519 secret seed —
 *               Keypair#rawSecretKey() for an imported key or a phrase-derived
 *               keypair. Throws on any other length: a 64-byte input would
 *               silently produce a phrase id.
 * @returns sourceId lowercase hex Ed25519 public key (64 chars) — the JWT `sub`
 *                   and this source's id in a /user/link consent.
 * @returns keypair  signs the JWT and this source's link consent.
 */
export const deriveSourceIdentity = async (
  seed32: Uint8Array,
): Promise<{ sourceId: string; keypair: Keypair }> => {
  if (seed32.length !== 32) {
    throw new Error(
      `Source identity seed must be 32 bytes, got ${seed32.length}`,
    );
  }
  const sourceSeed = await hmacAuthSalt(seed32);
  const keypair = Keypair.fromRawEd25519Seed(Buffer.from(sourceSeed));
  const sourceId = xdr.encodeBytes(keypair.rawPublicKey(), "hex");
  return { sourceId, keypair };
};
