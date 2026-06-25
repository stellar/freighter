# Derive Auth Keypair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a pure extension-side primitive that derives the Freighter
backend auth keypair (and hex user ID) from the wallet mnemonic via
`HMAC-SHA256(seedBytes, "freighter-auth-v1")` → Ed25519.

**Architecture:** A single pure async function in
`@shared/api/helpers/deriveAuthKeypair.ts`. Step 1 computes the 32-byte auth
seed with `crypto.subtle` HMAC keyed on the 64-byte BIP39 seed (`bip39`). Step 2
turns that seed into an Ed25519 keypair with `stellar-sdk`
`Keypair.fromRawEd25519Seed`; the raw pubkey, lowercase-hex, is the user ID.
Correctness is locked by committed cross-platform test vectors that
`freighter-mobile` will mirror.

**Tech Stack:** TypeScript, Jest 29 (`jest-fixed-jsdom`), `crypto.subtle`
(WebCrypto), `stellar-sdk` (`@stellar/stellar-sdk@16.0.0-rc.1`), `bip39@3.1.0`.

**Spec:** `extension/specs/AUTH_KEYPAIR_DERIVATION.md` (canonical contract —
read before starting).

## Global Constraints

Every task implicitly includes these:

- **No new library introduced.** Only `crypto.subtle`, `stellar-sdk`, and
  `bip39` — all already in the project. The only dependency-manifest change is
  _declaring_ `bip39` in `@shared/api/package.json` (it was already a transitive
  dep). `stellar-hd-wallet` is NOT used: it cannot run under jest/jsdom (its
  compiled bip39 import throws
  `Cannot read properties of undefined (reading 'wordlists')`).
  `bip39.mnemonicToSeedSync` is byte-identical to what `stellar-hd-wallet`
  wraps.
- **Exact version pins, no caret ranges.** Declare `bip39` as `"3.1.0"` (the
  version already in the tree).
- **`AUTH_SALT = "freighter-auth-v1"`** — exact literal, exported as a named
  constant.
- **HMAC-SHA256:** KEY = the 64-byte BIP39 seed
  (`bip39.mnemonicToSeedSync(mnemonic)`); MESSAGE = `utf8(AUTH_SALT)`. Order is
  `HMAC(key, message)` — never reversed.
- **User ID = lowercase hex** of the raw 32-byte Ed25519 public key (matches the
  backend's canonical `sub`).
- **Pure function:** no logging, no `keyManager`, no messaging, no persistence.
  Background-only usage; locked-session handling belongs to the future consumer,
  not here.

## File Structure

| File                                                      | Responsibility                                                                              |
| :-------------------------------------------------------- | :------------------------------------------------------------------------------------------ |
| `@shared/api/helpers/deriveAuthKeypair.ts`                | The primitive: `AUTH_SALT`, `deriveAuthSeed`, `deriveAuthKeypair`.                          |
| `@shared/api/helpers/__tests__/authKeypairVectors.ts`     | Committed cross-platform test vectors (canonical contract; mirrored in `freighter-mobile`). |
| `@shared/api/helpers/__tests__/deriveAuthKeypair.test.ts` | Unit tests mapped to acceptance criteria.                                                   |
| `@shared/api/package.json`                                | Declare `bip39@3.1.0` (modify).                                                             |

**Run a single test file:**
`yarn jest @shared/api/helpers/__tests__/deriveAuthKeypair.test.ts` **Run one
test by name:** add `-t "<name>"`.

---

### Task 1: Auth seed (HMAC half) + vectors + dependency

**Files:**

- Modify: `@shared/api/package.json` (add `bip39` dependency)
- Create: `@shared/api/helpers/__tests__/authKeypairVectors.ts`
- Create: `@shared/api/helpers/deriveAuthKeypair.ts`
- Test: `@shared/api/helpers/__tests__/deriveAuthKeypair.test.ts`

**Interfaces:**

- Produces:
  - `AUTH_SALT: string` (= `"freighter-auth-v1"`)
  - `deriveAuthSeed(mnemonic: string): Promise<Uint8Array>` (32 bytes)
  - `AUTH_KEYPAIR_VECTORS: AuthKeypairVector[]` where
    `AuthKeypairVector = { mnemonic: string; authSeedHex: string; userId: string }`

- [ ] **Step 1: Declare the `bip39` dependency**

In `@shared/api/package.json`, add to `dependencies` (keep alphabetical; exact
pin, no caret):

```json
    "bip39": "3.1.0",
```

Then install so the workspace records it (it already resolves via hoisting at
the same version, so this only updates the lockfile):

Run: `yarn install` Expected: completes; `yarn.lock` gains a `@shared/api` →
`bip39` edge, no version change.

- [ ] **Step 2: Create the test vectors fixture**

Create `@shared/api/helpers/__tests__/authKeypairVectors.ts`:

```ts
// Canonical cross-platform auth-keypair derivation vectors.
// SOURCE OF TRUTH: extension/specs/AUTH_KEYPAIR_DERIVATION.md
// freighter-mobile MUST commit the same values and assert identical output.
// authSeedHex isolates failures: a wrong authSeedHex => HMAC step diverged
// (e.g. key/message reversed); a right authSeedHex but wrong userId =>
// Ed25519 step diverged.
export interface AuthKeypairVector {
  mnemonic: string;
  authSeedHex: string; // hex of HMAC-SHA256(seedBytes, AUTH_SALT), 32 bytes
  userId: string; // lowercase hex Ed25519 public key, 64 chars
}

export const AUTH_KEYPAIR_VECTORS: AuthKeypairVector[] = [
  {
    mnemonic:
      "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about",
    authSeedHex:
      "cf8ef34afb730ffd0807ee8731f2378a4f6c702e2f14915976fac4afa711b52d",
    userId: "ec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797",
  },
  {
    mnemonic:
      "illness spike retreat truth genius clock brain pass fit cave bargain toe",
    authSeedHex:
      "882835b30a2c5b011f1b2424a84f4cd39f342f4d12be574e4233dbf9b98976d1",
    userId: "bd9498475c7191c5e9a5e18edda2402ab0ae527580a6c38b2a32a77c65729cd7",
  },
];
```

- [ ] **Step 3: Write the failing test for `deriveAuthSeed`**

Create `@shared/api/helpers/__tests__/deriveAuthKeypair.test.ts`:

```ts
import { Buffer } from "buffer";

import { AUTH_SALT, deriveAuthSeed } from "../deriveAuthKeypair";
import { AUTH_KEYPAIR_VECTORS } from "./authKeypairVectors";

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
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `yarn jest @shared/api/helpers/__tests__/deriveAuthKeypair.test.ts`
Expected: FAIL — `Cannot find module '../deriveAuthKeypair'`.

- [ ] **Step 5: Implement `AUTH_SALT` + `deriveAuthSeed`**

Create `@shared/api/helpers/deriveAuthKeypair.ts`:

```ts
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
 * bip39 is called directly: stellar-hd-wallet cannot run under jest/jsdom (its
 * compiled bip39 import throws on `wordlists`). The bytes are identical —
 * stellar-hd-wallet's fromMnemonic wraps this same bip39 call.
 */
export const deriveAuthSeed = async (mnemonic: string): Promise<Uint8Array> => {
  // Validate first, matching stellar-hd-wallet's error contract.
  if (!validateMnemonic(mnemonic)) {
    throw new Error("Invalid mnemonic (see bip39)");
  }
  // BIP39 seed, 64 bytes, empty passphrase.
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
```

- [ ] **Step 6: Run the test to verify it passes**

Run: `yarn jest @shared/api/helpers/__tests__/deriveAuthKeypair.test.ts`
Expected: PASS — 3 tests (salt + 2 vectors).

- [ ] **Step 7: Commit**

```bash
git add @shared/api/package.json yarn.lock \
  @shared/api/helpers/deriveAuthKeypair.ts \
  @shared/api/helpers/__tests__/authKeypairVectors.ts \
  @shared/api/helpers/__tests__/deriveAuthKeypair.test.ts
git commit -m "feat(auth): HMAC auth-seed derivation + cross-platform vectors (#2769)"
```

---

### Task 2: Auth keypair (Ed25519 half) + acceptance-criteria tests

**Files:**

- Modify: `@shared/api/helpers/deriveAuthKeypair.ts`
- Test: `@shared/api/helpers/__tests__/deriveAuthKeypair.test.ts` (extend)

**Interfaces:**

- Consumes: `deriveAuthSeed`, `AUTH_KEYPAIR_VECTORS` (from Task 1)
- Produces:
  - `deriveAuthKeypair(mnemonic: string): Promise<{ userId: string; keypair: Keypair }>`
  - `userId` is lowercase hex (64 chars); `keypair` is a `stellar-sdk` `Keypair`
    (later JWT ticket calls `keypair.sign()`).

- [ ] **Step 1: Write the failing tests for `deriveAuthKeypair`**

Append to `@shared/api/helpers/__tests__/deriveAuthKeypair.test.ts`. Add this
import at the top of the file (alongside the existing ones):

```ts
import { deriveAuthKeypair } from "../deriveAuthKeypair";
```

Then add these suites:

```ts
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

  // Acceptance #3: pure crypto, no wallet-signing / messaging side effects.
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `yarn jest @shared/api/helpers/__tests__/deriveAuthKeypair.test.ts`
Expected: FAIL — `deriveAuthKeypair` is not exported
(`TypeError: ... is not a function`).

- [ ] **Step 3: Implement `deriveAuthKeypair`**

In `@shared/api/helpers/deriveAuthKeypair.ts`, add the `Keypair` import and the
function. Update the import block and append at the end of the file:

```ts
import { Keypair } from "stellar-sdk";
```

```ts
/**
 * Derives the Freighter backend auth keypair from the wallet mnemonic.
 * Pure crypto: no logging, no keyManager, no messaging, no persistence. The
 * caller supplies the mnemonic (requires an unlocked session) and handles the
 * locked-session case.
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
  const userId = keypair.rawPublicKey().toString("hex");
  return { userId, keypair };
};
```

- [ ] **Step 4: Run the full test file to verify it passes**

Run: `yarn jest @shared/api/helpers/__tests__/deriveAuthKeypair.test.ts`
Expected: PASS — all suites (HMAC vectors, userId vectors, determinism, format,
independence, no-side-effects, invalid-mnemonic).

- [ ] **Step 5: Typecheck and lint the new files**

Run: `yarn workspace @shared/api tsc --noEmit` (or the repo's root typecheck
script if `@shared/api` has none — check `package.json`); then
`yarn eslint @shared/api/helpers/deriveAuthKeypair.ts @shared/api/helpers/__tests__/deriveAuthKeypair.test.ts @shared/api/helpers/__tests__/authKeypairVectors.ts`
Expected: no type errors, no lint errors.

- [ ] **Step 6: Commit**

```bash
git add @shared/api/helpers/deriveAuthKeypair.ts \
  @shared/api/helpers/__tests__/deriveAuthKeypair.test.ts
git commit -m "feat(auth): derive Ed25519 auth keypair + userId from seed (#2769)"
```

---

## Self-Review

**Spec coverage:**

- Scope (primitive + tests + vectors only) → Tasks 1–2; no JWT/handler/UI. ✓
- Crypto decisions (`crypto.subtle` HMAC + `stellar-sdk` Keypair, zero new libs)
  → Task 1 Step 5, Task 2 Step 3, Global Constraints. ✓
- Exact algorithm (64-byte seed as HMAC key, salt as message, lowercase-hex
  userId) → Task 1 Step 5, Task 2 Step 3. ✓
- `AUTH_SALT` constant → Task 1 Step 5 + test. ✓
- Cross-platform vectors → Task 1 Step 2; asserted in Task 1 (authSeed) + Task 2
  (userId). ✓
- Acceptance #1 (parity) → Task 2 Step 1 vector tests. ✓
- Acceptance #2 (independence, reworded) → Task 2 independence test. ✓
- Acceptance #3 (no signing prompt) → Task 2 no-side-effects test + pure impl. ✓
- Negative (invalid mnemonic fails loudly) → Task 2; verified `fromMnemonic`
  throws. ✓
- Lifecycle/locked-session → spec marks it the consumer's concern; correctly NOT
  implemented here. ✓

**Placeholder scan:** none — all code and commands are concrete.

**Type consistency:** `deriveAuthSeed → Promise<Uint8Array>`,
`deriveAuthKeypair → Promise<{ userId: string; keypair: Keypair }>`,
`AuthKeypairVector { mnemonic, authSeedHex, userId }` consistent across both
tasks and the fixture. ✓

## Follow-ups (out of this plan, tracked in the spec)

- `freighter-mobile` mirrors the algorithm + `authKeypairVectors.ts`.
- Update ticket #2769 acceptance #2 wording to "cryptographically independent
  from the wallet keypair."
