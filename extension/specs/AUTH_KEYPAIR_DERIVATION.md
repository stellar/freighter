# Auth Keypair Derivation Spec

> Design doc for [stellar/freighter#2769](https://github.com/stellar/freighter/issues/2769)
> — _[Extension] Derive auth keypair from seed for backend authentication._
> Date: 2026-06-25. Status: approved, ready for implementation.

## Overview

`freighter-backend-v2` authenticates clients with a stateless, per-request JWT:
each request carries an `Authorization: Bearer <JWT>` whose `sub` claim is the
hex-encoded Ed25519 **auth public key**, and the server verifies the request
signature against that key. The auth public key _is_ the user's anonymous
backend user ID ("Unified User Id") — separate from any Stellar `G…` keypair and
never used for wallet signing.

This spec covers **one primitive**: deriving that auth keypair (and hex user ID)
from the wallet's mnemonic on the Freighter extension, via
`HMAC-SHA256(seedBytes, "freighter-auth-v1")` → Ed25519 keypair.

See the canonical [Cross-Platform Contact Sync Design Doc](https://github.com/stellar/wallet-eng-monorepo/blob/main/design-docs/contact-lists/Freighter%20Authenticated%20Contact%20Sync%20Design%20Doc.md)
(Auth Flow + Key properties) for the end-to-end scheme.

## Scope

**In scope (this ticket / PR):**

- A pure derivation primitive: `mnemonic → { userId, keypair }`.
- Its unit tests.
- Committed cross-platform test vectors (so `freighter-mobile` can byte-match).

**Out of scope (downstream, blocked tickets):**

- Per-request JWT generation in `@shared/api` (the function consumer).
- Any handler wiring, the contacts feature, or UI.
- Lifecycle/caching of the keypair (decided here as a _requirement on the
  consumer_, but not implemented in this PR).

The function is _shaped_ so the JWT ticket can call it on-demand from the
background, but this PR ships only the primitive + tests + vectors.

## Backend contract (already implemented, PR open)

The server is fully stateless and **never computes the HMAC**. It reads `sub`
from each JWT, decodes it as an Ed25519 public key, and verifies the request
signature against it (`internal/auth/parser.go`). Consequences for this primitive:

- The **only** thing our output must byte-match is `freighter-mobile`, not the
  server.
- The server canonicalizes `sub` to **lowercase hex** (`parser.go` re-encodes
  the decoded key), so the client must emit the user ID as lowercase hex for the
  client-side and server-side IDs to be identical.

## Threat model

Both leak threats are treated as first-class:

1. **Private key / seed exposure → impersonation.** Anyone with the auth private
   key (or the seed it derives from) can mint valid JWTs and read/overwrite the
   user's encrypted contact blob. This is the severe threat. Mitigation: the
   primitive is pure crypto that runs **only in the background** (where the
   mnemonic already lives); it never logs key material, never crosses to the
   popup/content scripts, and persists nothing new at rest.
2. **Public user ID correlation → privacy.** The user ID is the _public_ key;
   leaking it can't forge anything, but it can link a person to their contact
   blob. Mostly mitigated outside this ticket (TLS, backend access control). Here
   we simply never log the user ID and never persist it in plaintext storage.

## Crypto decisions

Both halves reuse primitives **already central to the extension — zero new
dependencies.**

| Step            | Choice                                     | Rationale                                                                                                                                                                                                                       |
| :-------------- | :----------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| HMAC-SHA256     | `crypto.subtle`                            | Already the extension's core crypto layer (`extension/src/background/helpers/session.ts` uses it for AES-GCM session encryption + PBKDF2). Native, audited, no new dep.                                                         |
| Ed25519 keypair | `stellar-sdk` `Keypair.fromRawEd25519Seed` | Already a core dep, already used for wallet keys. `Keypair.rawPublicKey()` gives the raw 32-byte pubkey (the user ID); `Keypair.sign()` gives a raw 64-byte Ed25519 signature, which the downstream JWT ticket reuses directly. |

**Correctness is library-independent.** HMAC-SHA256 and Ed25519 derivation/signing
are standardized and deterministic (RFC 8032), so any correct implementation
produces identical bytes. Cross-platform parity is guaranteed by the algorithm
spec + committed test vectors below — _not_ by extension and mobile happening to
use the same library. (This is why we did **not** add `tweetnacl` just to mirror
mobile's library.)

## The primitive

**Location:** `@shared/api/helpers/deriveAuthKeypair.ts`
(auth code is destined for `@shared/api` per the JWT ticket; sits beside existing
helpers). Tests: `@shared/api/helpers/__tests__/deriveAuthKeypair.test.ts`.

**Signature (pure, async):**

```ts
import { Keypair } from "stellar-sdk";

/**
 * Derives the Freighter backend auth keypair from the wallet mnemonic.
 * Pure crypto: no logging, no keyManager, no messaging, no persistence.
 * The caller is responsible for supplying the mnemonic (which requires an
 * unlocked session) and for handling the locked-session case.
 *
 * @returns userId  hex-encoded Ed25519 public key (lowercase, 64 chars) — the
 *                  anonymous backend user ID and the JWT `sub`.
 * @returns keypair stellar-sdk Keypair; the JWT ticket signs with keypair.sign().
 */
export const deriveAuthKeypair = async (
  mnemonic: string,
): Promise<{ userId: string; keypair: Keypair }>;
```

Taking the **mnemonic** (not a pre-computed `seedBytes`) keeps the entire
must-match chain inside one function, so the cross-platform vector is simply
`mnemonic → userId` with nothing for mobile to get wrong at a boundary.

**Exact algorithm — this is the cross-platform contract:**

```ts
// 1. BIP39 seed: 64 bytes, EMPTY passphrase. Both repos pin stellar-hd-wallet@1.0.2,
//    whose fromMnemonic() does bip39.mnemonicToSeedSync(mnemonic) internally.
const seedBytes = Buffer.from(
  StellarHDWallet.fromMnemonic(mnemonic).seedHex,
  "hex",
); // 64 bytes

// 2. HMAC-SHA256. KEY = seedBytes (the 64-byte seed). MESSAGE = utf8(SALT).
//    Order matters — HMAC(key, message). Pinned by the test vectors so it
//    can never be silently reversed.
const key = await crypto.subtle.importKey(
  "raw",
  seedBytes,
  { name: "HMAC", hash: "SHA-256" },
  false, // not extractable
  ["sign"],
);
const authSeed = new Uint8Array(
  await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(AUTH_SALT)),
); // 32 bytes

// 3. Ed25519 keypair from the 32-byte authSeed.
const keypair = Keypair.fromRawEd25519Seed(Buffer.from(authSeed));

// 4. User ID = lowercase hex of the raw 32-byte pubkey (matches backend `sub`).
const userId = keypair.rawPublicKey().toString("hex");
```

**Constant:** `AUTH_SALT = "freighter-auth-v1"` — the versioned
domain-separation string from the design doc, exported as a named constant so
extension and mobile reference the identical literal. The `-v1` suffix reserves a
migration path; deterministic derivation means the auth keypair is permanent for
the life of the seed (rotating it changes the user's identity).

## Lifecycle & session timeout (requirement on the consumer)

Investigated to settle whether the keypair must be cached. **Conclusion:
on-demand derivation, no caching.**

- The auth private key is gated behind the same unlocked state as wallet signing.
  In the background, the mnemonic is cached **encrypted** in the session
  temporary store (`store-account.ts` writes it under `TEMPORARY_STORE_EXTRA_ID`),
  decryptable only with the in-memory `hashKey`.
- On session timeout, the `session-timer` alarm fires →
  `clearSession()` clears `hashKey` (`ducks/session.ts`). After that, **nothing**
  can decrypt the mnemonic or private key.
- Therefore **caching buys nothing against timeout**: a keypair cached in the
  encrypted store is itself undecryptable once `hashKey` is gone; caching only
  the public user ID still can't _sign_. Every path that can sign a JWT requires
  the unlocked session — which is correct: a JWT authorizes reading/overwriting
  the contact blob, so it _should_ require the same unlock as touching the wallet.
- There is **no "timed out but still on an active page" state.** The alarm
  broadcasts `SESSION_LOCKED`; `SessionLockListener` (mounted on every UI surface)
  immediately dispatches `lockAccount()` and navigates to the unlock screen
  (`extension/src/popup/components/SessionLockListener/index.tsx`).

**Requirements this places on the JWT ticket (not this PR):**

- Derive on-demand; persist nothing new at rest.
- The background accessor that fetches the mnemonic must treat "no mnemonic /
  locked" as a **typed, graceful result** (not a thrown error), so an in-flight
  derivation that races the lock folds cleanly into the unlock redirect already
  in progress.
- Optional, YAGNI: if per-request derivation ever proves hot (`mnemonicToSeedSync`
  runs PBKDF2 ×2048, a few ms), memoize the keypair in **volatile in-memory**
  session state cleared on timeout alongside `hashKey` — never at rest.

## Test plan

Verified end-to-end with the exact algorithm. Vectors are committed in a fixture
(`authKeypairVectors.ts`) in **both** repos; this doc is the canonical source.

| Mnemonic                                                                                        | `authSeed` (hex)                                                   | `userId` (hex pubkey)                                              |
| :---------------------------------------------------------------------------------------------- | :----------------------------------------------------------------- | :----------------------------------------------------------------- |
| `abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about` | `cf8ef34afb730ffd0807ee8731f2378a4f6c702e2f14915976fac4afa711b52d` | `ec57e5d04783b5ade776621ab171b3b197c3acc0a1cb5bad10786dc8e381e797` |
| `illness spike retreat truth genius clock brain pass fit cave bargain toe`                      | `882835b30a2c5b011f1b2424a84f4cd39f342f4d12be574e4233dbf9b98976d1` | `bd9498475c7191c5e9a5e18edda2402ab0ae527580a6c38b2a32a77c65729cd7` |

The intermediate `authSeed` is included so a failing mobile test can localize the
divergence: a wrong `authSeed` means the HMAC step (e.g. key/message reversed); a
right `authSeed` but wrong `userId` means the Ed25519 step.

**`deriveAuthKeypair.test.ts`:**

1. **Cross-platform match → acceptance #1.** For each vector,
   `(await deriveAuthKeypair(mnemonic)).userId === expectedUserId`, and the
   internal `authSeed` equals the fixture (catches a reversed HMAC key/message).
2. **Determinism.** Same mnemonic twice → identical `userId` and pubkey bytes.
3. **`crypto.subtle` reproduces the reference vectors.** Specifically guards the
   `importKey`/`sign` call against swapping key vs message — the easiest bug to
   introduce, the hardest to eyeball.
4. **Independence from the wallet key → acceptance #2.** Derive wallet account 0
   from the same mnemonic; assert `userId !== walletPubkeyHex`. _Verified:_ auth
   `ec57e5d0…` ≠ wallet `7691d850…` for vector 1.
5. **No signing side effects → acceptance #3.** The primitive imports nothing
   from the `keyManager`/popup/messaging path; a spy asserts
   `browser.runtime.sendMessage` is never called.
6. **Format.** `userId` is lowercase hex, length 64.
7. **Negative.** An invalid mnemonic throws a clear error (fails loudly rather
   than producing a garbage key).

## Acceptance criteria

Reworded from the ticket (see note on #2):

1. The same seed produces an identical auth keypair (and user ID) on extension
   and mobile — enforced by the shared test vectors.
2. **The auth keypair is cryptographically independent from the wallet keypair
   and is never used as a Stellar address.** _(Reworded — see below.)_
3. No wallet-signing prompt is triggered by derivation or use — the primitive is
   pure crypto with no signing-path dependencies.

> **Ticket correction (#2769).** The original criterion _"Auth pubkey is not a
> valid Stellar G address"_ is technically false: any 32 bytes StrKey-encode into
> a format-valid `G…` address (ours encodes to
> `GDWFPZOQI6B3LLPHOZRBVMLRWOYZPQ5MYCQ4WW5NCB4G3SHDQHTZOVCI`). The meaningful,
> true property is **cryptographic independence from the wallet keypair**. Update
> the ticket text to match this wording.

## Follow-ups / open items

- **`freighter-mobile` must mirror the algorithm + vectors.** Track a sibling
  ticket so mobile commits the same `authKeypairVectors.ts` and asserts identical
  output. This doc is the canonical contract.
- **Update ticket #2769** acceptance #2 wording (above).
- **No new dependencies** are introduced (`crypto.subtle` + `stellar-sdk` are
  already present). Confirm in review.
