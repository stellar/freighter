import { Buffer } from "buffer";
import { mnemonicToSeedSync, validateMnemonic } from "bip39";

/**
 * Versioned domain-separation salt for the backend auth keypair. The `-v1`
 * suffix reserves a migration path; derivation is deterministic, so the auth
 * keypair is permanent for the life of the seed.
 */
export const AUTH_SALT = "freighter-auth-v1";

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
 */
export const deriveAuthSeed = async (mnemonic: string): Promise<Uint8Array> => {
  // Validate mnemonic first, matching stellar-hd-wallet's error contract.
  if (!validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic (see bip39)");
  }
  // BIP39 seed, 64 bytes, empty passphrase — identical to what StellarHDWallet
  // .fromMnemonic(mnemonic).seedHex produces.
  const seedBytes = Buffer.from(mnemonicToSeedSync(mnemonic));

  const key = await crypto.subtle.importKey(
    "raw",
    seedBytes,
    { name: "HMAC", hash: "SHA-256" },
    false, // not extractable
    ["sign"],
  );
  const mac = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(AUTH_SALT),
  );
  return new Uint8Array(mac);
};
