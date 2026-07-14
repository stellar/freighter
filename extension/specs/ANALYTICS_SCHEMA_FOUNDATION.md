# Analytics Schema Alignment — Property-Model Foundation (Design Spec)

**Status:** Approved design, pre-implementation
**Date:** 2026-07-13
**Owner:** piyal
**Tracking issue:** [stellar/freighter#2883](https://github.com/stellar/freighter/issues/2883) — Analytics refactor (extension): cross-platform schema alignment (Epic)
**Canonical schema (RFC):** [stellar/wallet-eng-monorepo#10](https://github.com/stellar/wallet-eng-monorepo/pull/10) — `analytics-refactor-report.md`
**Identity primitive (dependency, landing separately):** [stellar/freighter#2876](https://github.com/stellar/freighter/pull/2876) — derives the unified `user_id` from the seed phrase

---

## 1. Context

Issue #2883 is a 7-stream Epic to align the extension's Amplitude events with freighter-mobile on a shared `domain.action_past` schema (defined in the RFC), clean up the property model, and retire redundant events. The Epic is too large for a single spec, so it is decomposed into independently shippable slices. **This spec covers the first slice only.**

The RFC is the canonical, cross-platform schema catalog (~50 events, four-bucket property model, naming rules). We adopt it **doc-defined + mirrored**: each repo (extension, mobile) implements its own catalog matching the RFC; the doc is the source of truth and the drift guard. No shared package, no codegen.

### Key facts about the current system

- Emission is centralized: `emitMetric(name, body)` in `extension/src/helpers/metrics.ts` → `amplitude.track`.
- Event names live in a flat `METRIC_NAMES` const map (`extension/src/popup/constants/metricsNames.ts`).
- Screen-load events funnel through a Redux middleware: a `registerHandler` on the `navigate` action maps route → event name in `extension/src/popup/metrics/views.ts`.
- `buildCommonContext(state)` attaches shared context to **every** event.
- Identity: `amplitude.setUserId(...)` is already called in `initAmplitude`; the value it uses is owned by the unified-user-ID work (#2876), **not** by this refactor.

The current system works and has drawn no complaints. This slice **evolves it in place** — it does **not** re-architect it.

---

## 2. Scope

### In scope (this slice) — global, name-agnostic property-model foundation

The property-model changes live in the **central** `emitMetric` / `buildCommonContext` path, so they apply to all events at once and cannot be done per-event. That makes them a natural first slice, independent of event renaming:

1. `schema_version` stamped on every event (permanent `"2"` marker — see §4).
2. `account_id_hash` replaces the truncated `publicKey` on events (§5).
3. Stop hand-sending SDK-supplied device/app fields; rely on the SDK's built-in context (§4, Bucket 1).
4. Reclassify durable traits → Amplitude **Identify** user properties; keep volatile context event-level (§4, §6).
5. New `getSurface()` helper + `app.opened` event carrying the one-time snapshot (§7).

Event **names stay legacy** in this slice.

### Out of scope (follow-on slices)

- **Slice B** — collapse `views.ts` route map into the canonical `screen.viewed` event.
- **Slice C** — domain-event renames / consolidations / removals (`payment.completed`, `blockaid.scan_completed` + `scan_target`, trustline/asset consolidations, swap-as-first-class, missing events, redundant-event deletion).
- **Slice D** — Amplitude account-level taxonomy cleanup (dashboard hygiene, no app code). Independent; can run in parallel.
- **Identity / `user_id`** — owned by #2876. Not touched here.

---

## 3. Key decisions

| Decision                   | Choice                                                      | Rationale                                                                                                                                                                                                                              |
| -------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migration strategy         | **Hard cutover per event, no dual-write**                   | Dual-write (RFC Part 4) doubles event volume against an already-full Amplitude project and adds transitional branching in the emit path. Parity is validated in staging/QA + tests before each flip instead of via prod count-overlap. |
| Schema source of truth     | **Doc-defined, mirrored per repo**                          | Matches the team's current cross-repo workflow; lowest infra cost. `schema_version` is the drift tripwire.                                                                                                                             |
| Emission architecture      | **Evolve `emitMetric` in place** (no typed-catalog rewrite) | RFC is a naming/property cleanup, not a re-architecture. A typed `track<E>` catalog would churn every call site for compile-time safety the team is not asking for; the spec guards drift.                                             |
| `schema_version` placement | **Global, stamped now**                                     | One central change; the marker distinguishes new vs old property model in dashboards even while names are still legacy.                                                                                                                |
| `wallet_count` definition  | **`allAccounts.length`**                                    | Confirm mobile matches before shipping (mobile may count seed-phrase wallets).                                                                                                                                                         |
| `app.opened` cadence       | **Per popup/fullpage/sidebar mount**                        | Closest extension analog to mobile's foreground event; matches RFC funnel-denominator intent.                                                                                                                                          |

---

## 4. Property model — the four buckets

All centralized in `emitMetric` + `buildCommonContext` (`extension/src/helpers/metrics.ts`).

### Bucket 1 — SDK-supplied device/app metadata (stop hand-sending)

- **Delete** `platform`, `platformVersion`, `appVersion` from `buildCommonContext`.
- The Amplitude Browser SDK's context plugin already attaches `platform` / `os_name` / `os_version` / `device_model` to every event. Pass `appVersion` once in the `amplitude.init(...)` config so the SDK attaches `app_version`.
- **Do NOT enable behavioral `autocapture`** (page views, clicks, form/element interactions, sessions). For a wallet UI that risks capturing DOM/URL content. This slice adds **no** new data-collection surface — it removes duplicated fields only.

### Bucket 2 — Event-level volatile context (stays, reshaped)

`buildCommonContext` keeps/adds, per event:

- `network` (kept)
- `surface` — from `getSurface()` (new)
- `account_type`, `account_funded`, `is_hardware_account`, `account_id_hash` — the reclassified active-account fields
- **Removed:** truncated `publicKey` (→ `account_id_hash`), `connection_type` / `effective_type` (→ `app.opened` only)

### Bucket 3 — Durable Identify user traits (new; see §6)

`wallet_count`, `has_hardware_wallet`, `has_imported_account`, `bundle_id` (existing).

### Bucket 4 — One-time `app.opened` snapshot (see §7)

`surface`, `network`, `connection_type`, `effective_type`, `schema_version`.

### Reclassification of the current per-event `metricsData` props

| Current per-event prop      | New home                                                                   |
| --------------------------- | -------------------------------------------------------------------------- |
| `hw_connected`              | Identify `has_hardware_wallet`                                             |
| `secret_key_account`        | Identify `has_imported_account` + event `account_type=imported_secret_key` |
| `freighter_account_funded`  | event `account_funded`                                                     |
| `secret_key_account_funded` | split → event `account_type` + `account_funded`                            |

---

## 5. `account_id_hash` derivation

- **Algorithm:** synchronous SHA-256 of the full G-address, hex-encoded, via the Stellar SDK's `hash()` (already used in `extension/src/background/messageListener/handlers/signAuthEntry.ts`).
- **Memoized per public key** in a module-level cache — no async in the emit hot path, no per-event recompute.
- **Cross-platform:** identical input (G-address string) + identical algorithm (SHA-256 hex) on mobile ⇒ identical hash ⇒ account-level joins work across platforms. A committed test vector locks this (same approach #2876 used for its cross-platform vectors).
- **No active key (pre-unlock):** `account_id_hash` is omitted. Never emit a raw or truncated public key.

---

## 6. Identify wiring

- Extend the existing `amplitude.identify()` block in `initAmplitude`.
- Traits derive from the same `allAccounts` that `storeAccountMetricsData(publicKey, allAccounts)` already walks. The effective sync sites are `helpers/hooks/useGetAppData.tsx:74` and `views/RecoverAccount/hooks/useGetRecoverAccountData.ts`, which call the shared `helpers/metrics` implementation. **Note:** `popup/ducks/accountServices.ts` has a _private duplicate_ `storeAccountMetricsData` (it imports only the `MetricsData` type from `helpers/metrics`), so wiring `syncIdentifyTraits` into the shared function does **not** cover the active-account-switch (`makeAccountActive`) path. That is acceptable — switching the active account does not change the account _set_ the durable traits describe, and any set change (add/import/create/recover) flows through `useGetAppData` and re-syncs. Follow-up: dedupe the two `storeAccountMetricsData` implementations. Traits:
  - `has_hardware_wallet` ← `hwExists`
  - `has_imported_account` ← `importedExists`
  - `wallet_count` ← `allAccounts.length`
  - `bundle_id` ← existing
- Fire `identify()` **only when a trait value actually changes** (dirty-check against the last-sent set) — Identify is for durable traits, not per-action.
- **Consent:** no new gate — the existing `setOptOut` subscription already suppresses Identify uploads when data-sharing is off.

---

## 7. `app.opened` & `getSurface()`

### `getSurface()` → `popup | sidebar | fullpage`

- `sidebar`: synchronous via `isSidebarMode()` (`mode=sidebar` query param).
- `popup` vs `fullpage`: `browser.tabs.getCurrent()` (undefined ⇒ popup, defined ⇒ fullpage) is async, so **resolve once at init and cache in a module variable**; `buildCommonContext` reads it synchronously thereafter.

### `app.opened`

- Fires once in the init path (where `initAmplitude` runs — `extension/src/popup/App.tsx:48`), i.e. **per popup/fullpage/sidebar mount**.
- Payload (one-time snapshot): `surface`, `network`, `connection_type`, `effective_type`, `schema_version`.
- `connection_type` / `effective_type` are **removed** from `buildCommonContext` at the same time, so they ride only on `app.opened`.

---

## 8. Migration sequencing & interim state

1. Land this slice: global property-model changes + Identify + `app.opened` + `account_id_hash` + `getSurface`. **Names remain legacy.**
2. After this slice, events carry the **new property model + `schema_version: "2"` under their legacy names** until slices B/C rename them. Given hard cutover (no dual-write) and that dashboards are being rebuilt regardless, this is acceptable; `schema_version` is exactly the flag that lets a dashboard distinguish the new property model from the old.
3. Slice B renames screen events → `screen.viewed`. Slice C renames/consolidates/removes domain events. Each rename is a hard cutover.

---

## 9. Error handling & edge cases

- **Pre-unlock / no active key:** `account_id_hash`, `account_type`, `account_funded`, `is_hardware_account` are omitted. Welcome/onboarding events carry none. No crash, no placeholder.
- **Hashing:** `hash()` is sync + deterministic on a valid G-address; wrap defensively and omit `account_id_hash` on error rather than throwing in the emit path.
- **Consent gate:** unchanged — `emitMetric` early-returns when data-sharing is off; Identify covered by `setOptOut`.
- **Init failure / missing `AMPLITUDE_KEY`:** unchanged — existing `try/catch` + console-log fallback preserved.
- **`browser.tabs.getCurrent()` unavailable / throws:** default `surface` to `popup`.

---

## 10. Testing

- **Unit (`extension/src/helpers/metrics.test.ts` — extend existing):**
  - `buildCommonContext` no longer emits `platform` / `platformVersion` / `appVersion` / `publicKey` / `connection_type` / `effective_type`.
  - `buildCommonContext` emits `account_id_hash`, `account_type`, `account_funded`, `is_hardware_account`, `surface`, `schema_version`.
  - `account_id_hash` is deterministic and matches a committed cross-platform vector.
  - Identify fires only on trait change.
  - Data-sharing off ⇒ no `track`, no `identify`.
- **`app.opened`** fires once per init with the snapshot fields; those fields are absent from subsequent events.
- **Regression guard:** a test asserting **no** event payload contains a raw or truncated public key.
- Existing metric tests updated to the reshaped payload.

---

## 11. Open items to confirm before shipping

- [ ] **`wallet_count` parity:** confirm mobile also defines it as account count (not seed-phrase-wallet count). Resolved default here: `allAccounts.length`.
- [ ] Confirm the committed `account_id_hash` vector is mirrored by freighter-mobile (same G-address → same hash).

---

## 12. Follow-on slices (not this spec)

- **B** — `screen.viewed` consolidation (`views.ts` route map).
- **C** — domain-event renames/consolidations/removals + missing events (`swap.completed`/`.failed`, `transaction.submitted`, `collectible_send.*`, `asset_remove.responded`, transaction-details `screen.viewed` parity).
- **D** — Amplitude taxonomy cleanup (dashboard hygiene; runs independently, prioritized to free property headroom).
