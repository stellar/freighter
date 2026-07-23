# CLAUDE.md — Freighter extension

Guidance for Claude (and human reviewers) working in this repo. `/code-review`
reads this file and audits changes against it, so rules must be **specific and
citable** — a reviewer should be able to point at a line and say "this violates
rule X." Do **not** add rules a linter/typechecker/CI already enforces, or vague
aspirations ("write clean code"); those get filtered out and only add noise.

## Standing invariant: secret material never leaks

The wallet mnemonic, seed, derived private/auth keypairs, and passwords must
never be:

- written to disk or unencrypted storage — they live only in the encrypted
  session store;
- logged, sent to Sentry/analytics/breadcrumbs, or included in error messages or
  stack traces;
- returned across the background→popup boundary — key derivation happens in the
  background service worker; only `{ status, body }` (never the mnemonic/key)
  crosses back to the popup;
- placed in a network request or a JWT payload beyond the pubkey `sub` claim;
- left resident in memory past lock / logout / expiry.

## freighter-backend-v2 access

- All backend-v2 calls go through the background chokepoint. Popup callers use
  `fetchBackendV2()` (which sends the `FETCH_BACKEND_V2` message to
  `callBackendV2` in the background); never construct a `fetch`/`URL` to
  `INDEXER_V2_URL` at a call site, and don't re-declare the `FETCH_BACKEND_V2`
  message shape — add a new v2 caller via `fetchBackendV2()`.
- An endpoint that must never be auth-gated (e.g. rpc-health) passes
  `skipAuth: true` so it does not derive the auth keypair.

## Caching and side-effect ordering (past regressions)

- Response caching (`cachedFetch` and similar): validate `res.ok` before caching
  — never cache a non-2xx/error body (it poisons the cache for the whole TTL) —
  and ensure a cache miss / empty stored value triggers a real fetch (don't let a
  `"{}"` default satisfy a staleness gate).
- Persist side effects only after validating the request. Never write state
  (e.g. the allow-list) on a path that then returns denied/error.

## Dependencies

- Pin `@stellar/*` packages (`stellar-sdk`, `stellar-base`, `js-xdr`, etc.) to
  exact versions — no caret ranges.

## Domain invariants

The domain truths the code can't state and a reviewer can't infer. Keep this list
growing as new classes bite us — each a one-line, citable assertion ("never X",
"always Y when Z"):

- **Token/asset decimals:** SEP-41 / custom tokens have variable `decimals` —
  never format amounts with a hardcoded `CLASSIC_ASSET_DECIMALS` (7); look up the
  token's real decimals. _(from #2647)_
- **Network handling — support all networks, not just Mainnet/Testnet.** Every
  network-dependent path must handle Mainnet (`NETWORKS.PUBLIC`), Testnet,
  Futurenet, **and** custom networks (detected via `isCustomNetwork(networkDetails)`).
  A `switch`/map keyed on `NETWORKS` must have a default/custom branch — never
  assume only PUBLIC/TESTNET. If a feature genuinely can't support a network
  (e.g. an endpoint that exists only for pubnet/testnet), handle it explicitly
  with a graceful fallback (skip/no-op or a clear message), not an unhandled case
  or a guaranteed error. Derive the network from `networkDetails`; for
  passphrase-keyed logic, account for custom networks that reuse a known
  passphrase.
- **Address handling — cover all address types.** Any code that accepts,
  parses, displays, resolves, or routes a Stellar address must handle all four:
  classic **G** accounts, contract **C** addresses (`isContractId`), **muxed M**
  accounts (`isMuxedAccount`), and **federated** addresses (`isFederationAddress`
  / `isValidFederatedDomain`). Never assume a bare G key. In particular: resolve
  federated addresses before use; preserve/extract the muxed memo id (don't strip
  or mislabel it — e.g. sent-vs-received attribution); reject or route C addresses
  appropriately where a fundable account is expected; and validate with
  `isValidStellarAddress` rather than ad-hoc string checks.
- **Signing preconditions — always attempt a Blockaid scan before signing.**
  Every flow that signs or submits a transaction (dApp sign requests, send,
  swap, send-collectible) must call `scanTx` (via the `useScanTx` hook) and
  surface the resulting `scanResult` before the user signs. If the scan can't
  complete, show the explicit "unable to scan" warning — never silently skip the
  scan or present the transaction as if it were safe. Do not add a signing or
  submit entry point that bypasses the scan. (Add-token/asset flows follow the
  parallel rule with `scanAsset`.)
