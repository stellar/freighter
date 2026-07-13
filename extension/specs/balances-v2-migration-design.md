# Balances API v2 Migration — Design

**Date:** 2026-07-13
**Status:** Approved design, pending implementation

## Summary

Migrate the extension's account-balances data source from the v1 indexer
(`GET ${INDEXER_URL}/account-balances/:publicKey`) to freighter-backend-v2
(`POST ${INDEXER_V2_URL}/accounts/balances`), gated behind a new Amplitude
Experiment boolean flag `use_balances_v2`. The v2 response is normalized to the
legacy `AccountBalancesInterface` shape at the API boundary so all downstream
consumers (~24 call sites, the cache duck, balance helpers) need zero changes.

This mirrors the `use_token_prices_v2` migration (#2870): flag defaults **ON**
(v2), Amplitude is the no-release rollback lever.

## Background

- Field-by-field usage catalog and gap analysis: `docs/balances-api-fields.md`.
- Since that doc was written, the v2 API closed three of five hard gaps: the
  envelope now carries `is_funded` and `subentry_count`, and a
  `LIQUIDITY_POOL` balance type exists with `liquidityPoolId` + `reserves`.
- Remaining gaps, with agreed handling:
  - **`blockaidData`** — not yet in v2. Mapper emits `undefined`;
    `isAssetSuspicious()` treats assets as clean (no spam badges) while v2 is
    active. Self-heals when the backend adds the field. Amplitude can flip back
    to v1 if needed.
  - **`available`** — server-computed on every variant (verified live);
    the mapper converts it to BigNumber and passes it through, exactly like
    the v1 path.
  - **SAC `symbol`/`name`** — v2 SAC balances carry `code`/`issuer` instead;
    mapping SAC to the classic shape sidesteps the missing fields entirely.
- **Custom tokens:** v1 sends user-added contract IDs (`getTokenIds`) as
  `contract_ids` hints; v2 takes only account addresses and wallet-backend
  decides which token balances to return. Decision: trust v2 to surface them
  and verify on testnet before rollout (see Verification).

## v2 API contract

Confirmed against `freighter-backend-v2` `internal/types/account_balances.go`
(the snake_case REST mapping layer) and **verified live against the deployed
dev instance** (`freighter-backend-v2-dev`, 2026-07-13). Note: an earlier
draft of this spec documented the wallet-backend SDK's camelCase structs —
those are internal; the REST wire format is snake_case throughout.

```
POST ${INDEXER_V2_URL}/accounts/balances?network=PUBLIC|TESTNET
Body: { "addresses": ["G..."] }        // multi-address fan-out; we send one
200:  { "data": [ <AccountBalances> ] }
4xx/5xx: { "message": string, "statusCode": number }
```

Per-account result (all keys **snake_case**):

```jsonc
{
  "address": "G...",
  "is_funded": true, // false ⇢ unfunded/unindexed account, balances: []
  "subentry_count": 3,
  "balances": [
    /* discriminated by token_type */
  ],
}
```

Every balance variant shares a base: `balance`, `available`, `token_id`,
`token_type`. **`available` is server-computed** (balance minus the reserved
amount for native/classic; equal to balance for contract tokens and pool
shares) — the client no longer derives it.

Variant-specific fields (`token_type` discriminant):

| token_type       | Additional fields                                                                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `NATIVE`         | `minimum_balance`, `buying_liabilities`, `selling_liabilities`, `last_modified_ledger`                                                                             |
| `CLASSIC`        | `code?`, `issuer?`, `type`, `limit`, `buying_liabilities`, `selling_liabilities`, `last_modified_ledger`, `is_authorized`, `is_authorized_to_maintain_liabilities` |
| `SAC`            | `code`, `issuer`, `decimals`, `is_authorized`, `is_clawback_enabled`                                                                                               |
| `SEP41`          | `name?`, `symbol?`, `decimals`, `last_modified_ledger` (`balance` is raw i128, NOT decimal-scaled)                                                                 |
| `LIQUIDITY_POOL` | `liquidity_pool_id`, `reserves: [{asset, amount}]`, `last_modified_ledger` (`balance` is pool shares)                                                              |

Notes:

- `NATIVE`/`CLASSIC`/`SAC` balances are pre-formatted decimal strings; `SEP41`
  is a raw i128 string that display logic scales by `decimals`.
- `NATIVE.token_id` is the XLM SAC contract id; LP `reserves[].asset` uses the
  Horizon canonical `"native"` / `"CODE:ISSUER"` format.
- Only PUBLIC and TESTNET are valid networks; anything else is a 400. As of
  2026-07-13, the **dev and stg deployments only have a wallet-backend client
  configured for PUBLIC** — `network=TESTNET` returns a 500 (`wallet backend
client not configured for network: TESTNET`). This was the source of the
  "staging 500s" noted below; the endpoint works for PUBLIC.
- Account-not-found is NOT an error: it surfaces as `is_funded: false` with
  empty `balances` inside a 200. Top-level errors are systemic only.

## Design

### 1. Wire types — `@shared/api/types/backend-api.ts`

Add v2 types exactly mirroring the wire contract above: `V2TokenType`,
`V2NativeBalance`, `V2ClassicBalance`, `V2SacBalance`, `V2Sep41Balance`,
`V2LiquidityPoolBalance`, union `V2Balance`, and envelope `V2AccountBalances`
(`address`, `is_funded`, `subentry_count`, `balances`). Envelope properties use
quoted snake_case keys to match the wire format verbatim.

The existing untracked `mapAccountBalancesV2.ts` + test reference an older
draft of these types (per-account `error`, no envelope funding fields, no LP
variant); both get updated to this contract.

### 2. Mapper — `@shared/api/helpers/mapAccountBalancesV2.ts`

`mapAccountBalancesV2(account: V2AccountBalances | undefined): AccountBalancesInterface`

Refresh the existing mapper:

- **Envelope:** `isFunded` ← `is_funded` (default `false` when account is
  undefined), `subentryCount` ← `subentry_count` (default `0`). Delete the
  old derivations (error-based `isFunded`, hardcoded `subentryCount: 0`).
- **Keys** (must match v1/standalone conventions relied on by `sortBalances`
  and `filterHiddenBalances`):
  - `NATIVE` → `"native"`
  - `CLASSIC` / `SAC` → `"<code>:<issuer>"`
  - `SEP41` → `"<symbol>:<token_id>"`
  - `LIQUIDITY_POOL` → `"<liquidity_pool_id>:lp"` **(new)**
- **Per-entry mapping** (unchanged where already correct):
  - `total` ← `new BigNumber(balance)`; `available` ←
    `new BigNumber(available)` (both server-provided, mirroring v1)
  - `CLASSIC`/`SAC` → classic-shaped entry: nested
    `token: { type: credit_alphanum4|12, code, issuer: { key } }`. SAC maps to
    the classic shape (not Soroban) because its `balance` is already
    decimal-formatted — the Soroban display path would double-scale it.
  - `SEP41` → Soroban-shaped entry: `contractId` ← `token_id`, `symbol`,
    `name`, `decimals`; raw-i128 `total` (display layer scales it).
  - `LIQUIDITY_POOL` → `{ liquidityPoolId, total, available, reserves,
blockaidData: undefined }` — v2 `reserves: [{asset, amount}]` matches the
    Horizon `Reserve[]` shape the LP-name rendering reads **(new)**.
  - `blockaidData: undefined` on every entry until v2 provides it.
  - Unknown `token_type` → skip the entry (forward-compatible).

### 3. Fetcher — `getAccountBalancesV2` in `@shared/api/internal.ts`

```ts
export const getAccountBalancesV2 = async ({
  publicKey,
  networkDetails,
}: {
  publicKey: string;
  networkDetails: NetworkDetails;
}): Promise<AccountBalancesInterface> => { ... }
```

- `POST ${INDEXER_V2_URL}/accounts/balances?network=${networkDetails.network}`
  with body `{ addresses: [publicKey] }`.
- On `!response.ok`: `captureException` with status (same pattern as v1 and
  `getTokenPrices`) and throw — `useGetBalances` already handles thrown errors.
- On success: `mapAccountBalancesV2(data.find(a => a.address === publicKey))`.
- No `contract_ids`, no `should_skip_scan` (no Blockaid scan in v2 today).

### 4. Routing — `getAccountBalances` in `@shared/api/internal.ts`

Add a trailing `useV2 = true` param (same convention as `getTokenPrices`):

```
custom network                        → getAccountBalancesStandalone (unchanged)
useV2 && network ∈ {PUBLIC, TESTNET}  → getAccountBalancesV2
otherwise (flag off, or FUTURENET)    → getAccountIndexerBalances (v1)
```

Futurenet stays on v1 regardless of the flag because v2 rejects it.

### 5. Feature flag — `extension/src/popup/ducks/remoteConfig.ts`

- Add `"use_balances_v2"` to `BOOLEAN_FLAGS`.
- `initialState.use_balances_v2: true` — defaults to v2; Amplitude flips it
  off to roll back without a release (comment mirrors `use_token_prices_v2`).
- Add `balancesV2Selector`.
- Consumption in `useGetBalances.fetchData`: read the flag the same way
  `useGetTokenPrices` does (`balancesV2Selector(store.getState())` at fetch
  time) and pass it to `getAccountBalances`. No other hook changes — the
  mapped result is shape-identical, so the cache duck
  (`saveBalancesForAccount`) and `formatBalances` are untouched.

### 6. Error tracking — no change needed

`ErrorTracking`'s `beforeSend` match on `${INDEXER_URL}/account-balances` is a
PII scrubber: it strips the G-address embedded in the v1 URL path. The v2
endpoint is a POST whose addresses travel in the request body, so its URL
contains no public key and nothing needs scrubbing. `captureException` calls
in the fetcher keep failure reporting intact.

### 7. Docs

Update `docs/balances-api-fields.md` §6 to reflect the current v2 contract
(envelope funding fields, LP type) so the gap analysis stays truthful.

## Out of scope

- `freighter-mobile` (separate repo; same flag name convention available).
- `IntegrationTest.tsx` exercises `getAccountIndexerBalances` directly — it
  keeps testing the v1 path; a v2 case may be added later.
- Removing the v1 path — deferred until v2 has `blockaidData` and the flag has
  been fully rolled out.

## Error handling summary

| Failure               | Behavior                                                                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------- |
| v2 HTTP 4xx/5xx       | `captureException` + throw; `useGetBalances` dispatches `FETCH_DATA_ERROR` (same UX as v1 failure)   |
| Account not funded    | 200 with `is_funded: false`, mapper returns `isFunded: false`, empty balances — existing unfunded UI |
| Amplitude unreachable | Flag defaults to `true` (v2)                                                                         |
| Unknown `tokenType`   | Entry skipped, rest of balances render                                                               |

## Testing

- **Mapper unit tests** (`mapAccountBalancesV2.test.ts`, refreshed): one case
  per balance variant incl. LP; envelope funding fields; `available` math
  (native minus minimumBalance + sellingLiabilities); key formats; unknown
  tokenType skipped; undefined account.
- **remoteConfig tests**: `use_balances_v2` parsing + default (extend the
  existing `remoteConfig.test.ts` flag cases).
- **useGetBalances tests**: flag-on routes to v2 fetcher, flag-off routes to
  v1 (mock `internal.ts`).
- **Manual/e2e verification on testnet** (staging backend), before rollout:
  - Funded account with trustlines, a SAC, a pure SEP41 custom token, and an
    LP share renders identically under flag on/off (minus Blockaid badges).
  - **Custom-token coverage:** confirm a user-added token appears in the v2
    response without `contract_ids` hints — this is the explicit "trust v2,
    verify in testing" checkpoint.
  - Unfunded account shows the not-funded UI.
  - Send-flow destination checks (`isFunded`) and XLM reserve math
    (`subentryCount`) behave under v2.

## Known risks

- **TESTNET not configured on dev/stg** (root cause of the 500s, diagnosed
  2026-07-13 from dev pod logs: `wallet backend client not configured for
network: TESTNET`). `network=PUBLIC` works and was verified end-to-end
  against the dev instance (live response mapped correctly through
  `mapAccountBalancesV2`, incl. 358 LP shares). Testnet verification needs the
  backend team to wire a testnet wallet-backend into dev/stg.
- **No Blockaid badges while v2 is active** — accepted; rollback lever is the
  flag.
- **Custom-token indexing parity** — unverified assumption; checked in
  testing before rollout.
