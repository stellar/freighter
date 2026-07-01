# Swap to New Token (Browser Extension) — Design Doc

> **Status:** Draft for team review · **Author:** Cássio Goulart · **Date:** 2026-06-23
>
> **Reference (mobile):** This feature already shipped on freighter-mobile —
> PR [stellar/freighter-mobile#879](https://github.com/stellar/freighter-mobile/pull/879)
> and its design doc [`docs/swap-to-new-token-design.md`](https://github.com/stellar/freighter-mobile/blob/main/docs/swap-to-new-token-design.md).
> This document ports that work to the extension;
>
> **Figma ([Freighter Extension file](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8629-18284&t=23iJx0ZSxxk26eJM-1)):** links are inline in §1.2 and §3.

This document has three main sections to facilitate the review:

- **§1 High-level design** — summary + architecture diagram.
- **§2 Differences from mobile** — the deltas and nuances vs the mobile design.
- **§3 Technical design** — implementation-grade detail.

---

## §1 — High-level design

### 1.1 Context & goal

Today the extension's Swap flow can only swap **between tokens the user already
holds** (assets with an existing trustline). To swap into a new asset, a user
must first leave Swap, complete the "Add asset" flow to create a trustline, and
only then return to Swap.

**Goal:** let users swap from a held token to **any Stellar classic asset** in a
single flow — discovering the destination through their own balances, a curated
**Popular tokens** list, and free-text search — and **bundling the `changeTrust`
operation into the swap transaction** when the destination has no trustline yet.

**Out of scope:** swapping to/from **Soroban custom tokens**. The flow stays
classic-only for now (Soroban contract tokens are filtered out at every stage);
Soroban support can come later behind the same discovery/routing seams.

### 1.2 What changes for users

| Area                             | Today                                 | After this work                                                                                                                                                                                                                                                                                                                                               |
| -------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Destination picker**           | Held balances only                    | A "Swap to" picker with **Your tokens**, **Popular tokens**, and (when searching) **Verified** / **Unverified** sections ([Figma — picker default](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-35309), [search results](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-35483)) |
| **Source picker**                | Held balances only                    | Unchanged in content — same "Swap from" picker, **Your tokens** only ([Figma](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-33048))                                                                                                                                                                                    |
| **Trustline**                    | Manual, separate "Add asset" trip     | **Automatic** — bundled into the swap as one atomic transaction                                                                                                                                                                                                                                                                                               |
| **Security**                     | Only held assets are Blockaid-scanned | **Every** destination candidate (held, popular, search result) is Blockaid-scanned before it is selectable, and the combined transaction XDR is scanned at review                                                                                                                                                                                             |
| **New-trustline cost**           | Not surfaced                          | A purple **"This will add a trustline to {CODE}"** banner on review + a tappable info sheet explaining the 0.5 XLM reserve ([Figma — review](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-34246), [info sheet](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-34721))           |
| **Insufficient XLM for reserve** | On-chain failure                      | A pre-flight **"You need XLM to create a trustline"** sheet with a _Swap for 0.5 XLM_ helper + _Copy my wallet address_ ([Figma](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-33468))                                                                                                                                 |

The Swap home screen has this shape ([Figma](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8629-32073)):
_You sell_ / _You receive_ cards, a direction chevron, `25% / 50% / 75% / Max`
buttons, and the `Fee · Slippage · Settings` row at the bottom, directly above
the **Review swap** button. Unlike mobile, **there is no "Trending/Popular
tokens" list on the Swap home** — that limited vertical space is reserved for
the percentage buttons and the Fee/Slippage/Settings controls. The Popular list
appears **only inside the "Swap to" picker**. We can later migrate the
"Trending/Popular tokens" list onto the Swap home once we adopt the same
unified transaction settings sheet we have on mobile.

### 1.3 Architecture (navigation) diagram

The extension Swap flow is a single `/swap` route whose sub-steps are an internal
`STEPS` state machine (not pushed routes). Purple = new/extended for this work;
slate = exists today.

```mermaid
flowchart TD
    Home([Home / Asset Detail]) -->|tap 'Swap'| Amount[Swap home step — 'You sell' and 'You receive' cards, 'Review swap' button]

    Amount -->|tap 'You sell' token| PickerFrom[Swap from step — 'Your tokens' only]
    Amount -->|tap 'You receive' token| PickerTo[Swap to step — idle: 'Your tokens' + 'Popular' / search: 'Your tokens' + 'Verified' + 'Unverified']
    PickerFrom -->|pick held token| Amount
    PickerTo -->|pick held or NEW token| Amount

    Amount -->|tap 'Review swap'| ReserveCheck{destination requiresTrustline AND available XLM < 0.5 reserve?}
    ReserveCheck -->|Yes| XlmSheet[XLM-reserve sheet — 'Swap for 0.5 XLM', 'Copy my wallet address', 'Why do I need XLM?']
    ReserveCheck -->|No| Build[/Build + Blockaid-tx-scan/]

    Build --> Review[Review Tx — 'You are swapping', trustline banner, Blockaid warnings, Wallet, Rate, details]
    Review -->|tap trustline banner| TrustInfo[Trustline info sheet]
    Review -->|tap 'Confirm'| TxBuild{destination requiresTrustline?}

    TxBuild -->|Yes| Atomic[changeTrust op + pathPaymentStrictSend op]
    TxBuild -->|No| PathOnly[pathPaymentStrictSend op]
    Atomic --> Submit([sign + submit single atomic tx])
    PathOnly --> Submit
    Submit --> Done[SubmitTransaction — swapping… / success]

    classDef new fill:#5b3aa8,stroke:#a48cd9,color:#fff
    classDef existing fill:#1f2937,stroke:#6b7280,color:#fff
    classDef decision fill:#3b3120,stroke:#d97706,color:#fff
    class PickerTo,XlmSheet,TrustInfo,Atomic new
    class Home,Amount,PickerFrom,Build,Review,PathOnly,Submit,Done existing
    class ReserveCheck,TxBuild decision
```

**One picker, parameterised.** A single picker component (`SwapAsset`, extended)
serves both sides; a `selectionType: "source" | "destination"` param toggles the
header ("Swap from" / "Swap to"), whether the Popular/search sections appear
(destination only), and whether non-held results are reachable.

### 1.4 Scope & non-goals

**In scope**

- Swap from a held token to any held **or non-held classic** asset, in one flow.
- Destination discovery: held balances + Popular tokens + free-text search.
- Atomic `changeTrust + pathPaymentStrictSend` when the destination is new.
- Blockaid scanning of every destination candidate and of the combined XDR.
- Trustline-reserve education + a pre-flight XLM-reserve helper.

**Non-goals**

- Soroban-token swaps (classic-only; Soroban contracts filtered out everywhere).
- A "Trending/Popular tokens" list on the Swap **home** screen (picker only).
- Changing the Send flow's behavior (only shared components are extracted).

### 1.5 Rollout summary

- Ship as a single feature branch. The new picker fully replaces the current
  held-only swap picker.
- **No feature flag** — the new picker fully replaces the held-only swap picker
  directly (same call as mobile).
- Backend stellar.expert proxy is a **separate, non-blocking** follow-up (§3.13);
  the frontend ships against stellar.expert directly first.

---

## §2 — Differences between extension and mobile

The _feature_ is the same; the _platform_ is materially different.

### 2.1 State management & navigation

- **Mobile:** Zustand stores (`useSwapStore`, `useTransactionBuilderStore`) +
  react-navigation; the picker and amount screen are distinct pushed screens
  (`SwapToScreen`, `SwapAmountScreen`).
- **Extension:** **Redux** (`transactionSubmission` slice) + react-router
  `HashRouter`; the whole swap is **one `/swap` route** whose steps
  (`SwapAmount`, `SwapAsset`, settings, confirm) are an internal **`STEPS` enum
  state machine** in [`views/Swap/index.tsx`](../src/popup/views/Swap/index.tsx).
  There is no navigation stack — "screens" are conditional renders.

### 2.2 Send & Swap "live together"

- **Mobile:** Send and Swap are fully decoupled (separate screens, separate
  state machines), and they _share_ reusable `AmountCard` + `PercentageButtons`.
- **Extension:** Send and Swap already **share** the `transactionSubmission`
  Redux slice, the `ReviewTx` review modal, the `SubmitTransaction` screen,
  `getAvailableBalance`, `useNetworkFees`, and the formatter helpers — but they
  have **separate** view files, `STEPS` enums, and amount components.
  [`SendAmount`](../src/popup/components/send/SendAmount/index.tsx) owns the
  amount card and the `25/50/75/Max` buttons (`PERCENTAGE_OPTIONS`,
  `handlePercentage`); [`SwapAmount`](../src/popup/components/swap/SwapAmount/index.tsx)
  reimplements its own input and only has a single **Max** button.
  - **Decision note:** we will **extract shared `AmountCard` + `PercentageButtons`
    components** from `SendAmount` and use them in both flows (matching mobile's
    shared-component approach). This is the one place we deliberately refactor
    working Send code; see §3.3 for the safety boundary.

### 2.3 No trending list on the Swap home

- **Mobile:** the `SwapAmountScreen` renders a virtualized **Trending Tokens**
  list as its body, with a `TrendingTokenDetailBottomSheet` ("Buy {code}").
- **Extension:** **no trending list on the home screen**, and therefore **no
  `TrendingTokenDetail` sheet.** The space below the amount cards is occupied by
  the `Fee · Slippage · Settings` row. The **Popular tokens** list lives **only
  in the "Swap to" picker** (same curated source as mobile — see §3.1). On
  **custom networks** the Popular section is omitted entirely — an extension-only
  concern (mobile has no custom networks): verified-token lists and
  stellar.expert cover only Mainnet/Testnet; the picker falls back to held-only
  there (§3.1).

### 2.4 Pickers, sheets & the design system

- **Mobile:** full-screen `SectionList` picker; bottom sheets (`TrustlineInfo`,
  `XlmReserve`) via the native bottom-sheet primitive.
- **Extension:** the picker is a **step** inside the fixed **360×600 popup**,
  built on the `View` layout primitives + `TokenList`. The mobile bottom sheets
  map onto the extension's existing **`SlideupModal`** component — which today
  wraps the swap **Review** sheet ([`SwapAmount/index.tsx:641`](../src/popup/components/swap/SwapAmount/index.tsx#L641)) —
  or the Radix **`Sheet`** primitive. SDS (`@stellar/design-system`) provides
  `Button`, `Input`, `Notification`, `Icon`, `Card`, etc. The purple trustline
  banner is an SDS **`Notification`** (the component `ReviewTx` already uses for
  warnings); if the installed SDS version has no lilac/"highlight" variant, add a
  custom-styled variant — mobile added a `highlight` variant to its own SDS for
  exactly this.
- **No clipboard "Paste" button.** Mobile offers a one-tap paste affordance on the
  search bar; the extension **omits** it — a programmatic clipboard read needs an
  extra `clipboardRead` manifest permission + user opt-in, which the team decided
  isn't worth it on web. Users can still paste an address into the search field
  manually (`⌘/Ctrl+V`).

### 2.5 Amount input

- **Mobile:** migrated to the **system numeric keyboard** + the shared
  `useTokenFiatConverter` reducer.
- **Extension:** uses a **DOM `<input>`** with the existing
  `formatAmountPreserveCursor` / `cleanAmount` helpers and the existing
  `inputType: "crypto" | "fiat"` toggle (lifted from the Swap parent). There is
  **no `useTokenFiatConverter`** to adopt; we keep the extension's current
  crypto/fiat conversion logic and move it into the shared `AmountCard`. We may
  want to revisit this during implementation in case we see that using a similar
  useTokenFiatConverter hook would work better for extension too.

### 2.6 Transaction building, fee & quote

- **Mobile:** `buildSwapTransaction({ includeTrustline })` prepends `changeTrust`
  so a new-token swap is a **single atomic 2-op transaction**; fee is the **total
  across ops** (`baseFee = total / opCount`); the quote (best path +
  slippage-adjusted `destMin`) is **frozen once the amount is entered** and reused
  unchanged through review and submit; Horizon **`op_under_dest_min`** _and_
  **`op_too_few_offers`** rejections trigger an **alert + auto-refetch** of a
  fresh quote.
- **Extension today:** [`useSimulateSwapData.getBuiltTx`](../src/popup/components/swap/SwapAmount/hooks/useSimulateSwapData.tsx)
  builds a **single** `pathPaymentStrictSend`; `changeTrust` is a **standalone**
  tx via [`getManageAssetXDR`](../src/popup/helpers/getManageAssetXDR.ts); fee is
  applied as the **per-op base fee** (so a 2-op tx would cost ≈2× the displayed
  fee); there is **no quote freeze**.
  - **Decision — atomic tx:** when the destination is new, build
    `changeTrust + pathPaymentStrictSend` as **one atomic 2-op transaction**
    (**not** a standalone `changeTrust` tx), exactly like mobile (§3.5).
  - **Decision — fee:** adopt the mobile **total-across-ops** fee model for
    swaps (divide the user-set total by op count). Send stays 1-op, unchanged.
  - **Decision — quote:** **port mobile's quote handling** — freeze the quote
    once the amount is entered, reuse it unchanged through review and submit, and
    on **`op_under_dest_min` / `op_too_few_offers`** show an alert + **auto-refetch**
    a fresh quote (§3.5).

### 2.7 Slippage default

- **Mobile:** 2%. **Extension today:** **1%** (`allowedSlippage: "1"` in
  [`transactionSubmission.ts:507`](../src/popup/ducks/transactionSubmission.ts#L507)
  and `defaultSlippage = "1"` in
  [`SwapAmount/index.tsx:61`](../src/popup/components/swap/SwapAmount/index.tsx#L61)).
  - **Decision:** change the default to **2%** to match mobile. With the frozen
    quote, the wider tolerance materially reduces `op_under_dest_min` /
    `op_too_few_offers` rejections between amount entry and submit, improving
    success rate.

### 2.8 Blockaid & caching

- **Scan timing:** mobile bulk-scans every destination before it is
  selectable. The extension scans only held assets + the review XDR today.
  **Decision:** adopt mobile's **pick-time bulk scan** of Popular + search
  results (closes the same security gap), keeping the review-time XDR scan.
- **Caching:** mobile uses a 3-layer cache (a **module-memory cache that survives
  remounts** + a disk-backed 30-min `cachedFetch` + SWR background revalidate),
  with the trending list **fetched on swap-screen mount** (not pre-fetched ahead of
  time). The extension has its own idioms: **`cachedFetch`** (persistent
  `localStorage`, 7-day TTL, background worker) and the **Redux `cache` slice**
  (in-memory, with `updatedAt` staleness stamps — its native SWR). **Decision:**
  reuse the verified-list cache as-is; cache **Popular tokens** + **Blockaid scan
  results** in the Redux `cache` slice with `updatedAt` staleness (~30-min window);
  back the Popular list with a short-TTL (~30-min) `cachedFetch`-style persistent
  entry so frequent popup reopens paint instantly. **No** separate module-memory
  cache (the popup refetches on open; low value given its lifecycle).

### 2.9 Naming map (mobile → extension)

| Mobile                                                  | Extension equivalent                                                                                                             |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `SwapToScreen` (picker)                                 | `SwapAsset` step, extended + parameterised                                                                                       |
| `SwapAmountScreen`                                      | `SwapAmount` step                                                                                                                |
| `useSwapTokenLookup`                                    | new `useSwapTokenLookup` (extension) — a parallel impl **built from** `searchAsset` + verified lists + Popular fetch + bulk scan |
| shared `AmountCard` / `PercentageButtons`               | new shared `AmountCard` / `PercentageButtons` extracted from `SendAmount` (mirrors mobile's shared components)                   |
| `useTokenFiatConverter`                                 | existing `inputType` toggle + `formatAmountPreserveCursor` (no new hook)                                                         |
| `buildSwapTransaction({ includeTrustline })`            | extended `useSimulateSwapData.getBuiltTx` + extracted `buildChangeTrustOperation`                                                |
| `DestinationTokenDescriptor`                            | `destinationAsset` canonical string **+** new `destinationTokenDetails` object on `TransactionData` (§3.4)                       |
| `TrustlineInfoBottomSheet` / `XlmReserveBottomSheet`    | `SlideupModal`/`Sheet`-based info sheets                                                                                         |
| `useSwapStore` / `useTransactionBuilderStore` (Zustand) | `transactionSubmission` Redux slice                                                                                              |
| `SWAP_*` Amplitude events                               | `METRIC_NAMES.*` + `emitMetric`                                                                                                  |

---

## §3 — Technical design

Implementation-grade. File paths are repo-relative to `extension/`. Existing
symbols are linked; **NEW** marks net-new code.

### 3.1 Destination-token discovery — `useSwapTokenLookup` (NEW)

A new hook owns destination discovery, mirroring mobile's `useSwapTokenLookup`
but built from the extension's existing search/verification primitives. It lives
at `src/popup/components/swap/SwapAsset/hooks/useSwapTokenLookup.ts` and is a
parallel implementation (not a wrapper) of the held-only
[`useSwapFromData`](../src/popup/components/swap/SwapAsset/hooks/useSwapFromData.tsx),
which stays for the **source** side / `holdsOnly` case.

It exposes two surfaces, switched on whether the search term is empty.

**Idle (no search term) — destination side:** two ordered sections.

1. **Your tokens** — from the user's balances (classic only; XLM included),
   reusing the held-balance fetch in `useSwapFromData` / `useGetSwapAmountData`.
2. **Popular tokens** — intersection of:

   - **stellar.expert top assets by `volume7d`** — a single un-paginated call for
     the **top 50** (`limit=50`, matching stellar.expert's default page size, so no
     over-fetch; new fetch — see §3.13), and
   - the runtime **verified-token lists** already cached via the asset-lists
     pipeline ([`getVerifiedTokens`](../src/popup/helpers/searchAsset.ts) /
     `splitVerifiedAssetCurrency`, [`ducks/cache.ts`](../src/popup/ducks/cache.ts)
     `tokenLists`).

   Held tokens are filtered **out** of the Popular section (so a user never sees
   a held token twice on the same screen). Mainnet applies a minimum-volume floor
   inside the cache layer before caching (mirroring mobile's `MIN_TRENDING_VOLUME7D`);
   on **testnet** `volume7d` is always 0, so the `sort=volume7d&order=desc` query
   params are **omitted** (accept the API's default order), the floor is a no-op,
   and the verified-list intersection is what produces a meaningful list.

   **New account / no held balances:** the **Your tokens** section is omitted and
   the idle picker renders **only Popular tokens** (matching mobile).

**Active (with search term) — destination side:** three labeled, mutually
exclusive sections (matching [Figma](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-35483)):

1. **Your tokens** — held tokens matching code / domain (partial match).
2. **Verified** — verified-list matches (excluding §1); section header carries a
   tappable **(i)** info icon → `VerifiedTokenInfoSheet` (NEW, §3.7).
3. **Unverified** — remaining stellar.expert
   [`searchAsset`](../src/popup/helpers/searchAsset.ts) results (excluding the
   above); header carries its own **(i)** → `UnverifiedTokenInfoSheet` (NEW).

**Classic-only filter.** Every record (idle or search) passes through
[`isContractId`](../src/popup/helpers/soroban.ts) / `isAssetSac` so Soroban
contract tokens are dropped. A `C…` paste that resolves to a wrapped classic
(SAC) surfaces its classic asset; a pure-Soroban paste yields nothing. When the
filtered result set is empty **and** the term is a contract address (or the
pre-filter set contained Soroban matches), show the empty-state copy _"Soroban
contract tokens aren't supported for swaps yet. Try searching for a Classic token
instead."_ (track a `hadSorobanMatches` flag, as mobile does). For a normal
no-match search (term isn't a contract address, no Soroban matches), show the
generic _"No tokens match {term}"_ empty state, reusing the Add-asset /
`ManageAssetRows` empty-state pattern.

**Blockaid bulk scan.** Every candidate **not** already in the user's
balances is scanned via
[`scanAssetBulk`](../src/popup/helpers/blockaid.ts) in `MAX_ASSETS_TO_SCAN`
(=10) chunks; results merge onto each record using the existing
`isAssetMalicious` / `isAssetSuspicious` / `shouldTreatAssetAsUnableToScan`
helpers. Mainnet-only (`isBlockaidEnabled`); on testnet the state is
"unable to scan", as today. Held tokens already carry their balance scan.

**Search mechanics.** Reuse `useSwapFromData`'s existing **300 ms lodash
debounce** + `AbortController` cancellation so the trailing keystroke wins;
dedupe by canonical `CODE:ISSUER`. `searchAsset` already targets
`${getApiStellarExpertUrl(networkDetails)}/asset?search=` per network. (The
extension keeps its existing **300 ms** debounce rather than mobile's 500 ms —
reusing the held-search primitive; the difference is immaterial.)

**Caching.** See §2.8 — verified lists reuse the existing cache; Popular +
scan results go in the Redux `cache` slice with `updatedAt` staleness; Popular
gets a short-TTL persistent `cachedFetch`-style entry.

**Graceful fallback (stellar.expert unreachable).** Held-to-held swaps must keep
working. When the Popular/search fetch fails (and no fresh cache exists):

- the picker shows **only "Your tokens"** (Popular section omitted),
- search degrades to **held-only** in-memory matches,
- a **soft inline notice** renders at the top of the picker ("Token discovery is
  temporarily unavailable. You can still swap between tokens you already hold."),
  non-blocking.

Path-finding is unaffected — it uses Horizon `strictSendPaths`
([`horizonGetBestPath`](../src/popup/helpers/horizonGetBestPath.ts)), not
stellar.expert.

**Network support (Mainnet / Testnet only).** Token discovery beyond held
balances depends on resources that exist **only for Mainnet and Testnet** — the
verified-token lists and stellar.expert. On a **custom network** (the extension
supports custom networks; mobile does not) the picker **omits the Popular
section** and search **degrades to held-only** in-memory matches — the same
held-only shape as the stellar.expert-unreachable fallback above, but a permanent
state rather than an error. Held-to-held swaps still work (Horizon
`strictSendPaths` against the custom network's Horizon).

### 3.2 Picker UI — extend `SwapAsset` (parameterised)

Extend [`SwapAsset`](../src/popup/components/swap/SwapAsset/index.tsx) (currently
`{ title, hiddenAssets, onClickAsset, goBack }`) with a
`selectionType: "source" | "destination"` prop:

- **source** → `holdsOnly` path (current `useSwapFromData`); single **Your tokens**
  section; header "Swap from".
- **destination** → `useSwapTokenLookup` (§3.1); sectioned list; header "Swap to";
  search bar.

Rendering reuses [`TokenList`](../src/popup/components/InternalTransaction/TokenList/index.tsx)
and the verified/unverified section layout from
[`ManageAssetRows`](../src/popup/components/manageAssets/ManageAssetRows/index.tsx).
A **`SwapTokenRow`** (NEW, or an extension of the existing row) renders, by section:

- **held** — fiat balance + 24h % (as on the Home balance row).
- **non-held** (Verified / Unverified) — a `⋯` context menu (**Copy address**,
  **View on stellar.expert** via the existing in-app-browser/`getStellarExpertUrl`
  pattern) and a Blockaid badge ([`ScamAssetIcon`](../src/popup/components/account/ScamAssetIcon/index.tsx))
  overlaid on the icon when suspicious/malicious.

The picker prevents nothing by default — malicious destinations remain selectable
but surface their warning in the row and again at review (matching the "Confirm
anyway" pattern). Native XLM is always trusted.

### 3.3 Amount screen — extract shared `AmountCard` + `PercentageButtons`

Extract two components from
[`SendAmount`](../src/popup/components/send/SendAmount/index.tsx):

- **`AmountCard`** (NEW, shared location e.g.
  `src/popup/components/amount/AmountCard`) — the rounded card with label,
  available-balance line, the crypto/fiat dual input (`inputType` toggle,
  `formatAmountPreserveCursor`, dynamic span-measured input width), the asset
  selector button, and the secondary fiat line. Driven by props, not by Send/Swap
  internals. It also accepts an optional `securityLevel` and overlays the
  **`ScamAssetIcon`** badge on the selected token icon when the token is
  malicious/suspicious — so the Blockaid warning stays visible **in place** on the
  Swap home after the picker is dismissed (the extension analogue of mobile's
  `TokenIconWithBadge`; mobile §9 / Figma 8629-19445). The Sell side reads the
  source balance's scan; the Receive side reads
  `destinationTokenDetails.securityLevel` (§3.4).
- **`PercentageButtons`** (NEW) — the `25% / 50% / 75% / Max` group
  (`PERCENTAGE_OPTIONS` + `handlePercentage`), parameterised by an
  `availableBalance` and an `onSelect(pct)` callback.

`SwapAmount` then renders two `AmountCard`s (You sell = editable; You receive =
read-only, fed by the path-finder result) + `PercentageButtons` + the direction
chevron + the `Fee · Slippage · Settings` row, replacing its bespoke input and
single Max button.

**Safety boundary.** The extraction must be behavior-preserving for Send:

1. Land the extracted components and **migrate `SendAmount` to them first**, with
   the existing Send E2E + unit tests green (pure refactor, no UX change).
2. Only then wire `SwapAmount` to them.

`InputWidthContext` ([`views/Send/contexts/inputWidthContext.tsx`](../src/popup/views/Send/contexts/inputWidthContext.tsx))
is Send-local today; either lift it to a shared provider used by both flows or
let `AmountCard` own its width state internally (preferred — keeps the component
self-contained).

**Spendable amount.** Reuse [`getAvailableBalance`](../src/popup/helpers/soroban.ts)
(deducts XLM minimum reserve + fee). For a **new-token** swap the destination
trustline adds **0.5 XLM** to the required reserve on the source side when the
source is XLM; the spendable/`Max` computation and the CTA gating must account
for it (see §3.6 for the pre-flight check).

**CTA states & the post-scan unable-to-scan gate.** The single **Review swap**
button mirrors mobile's CTA state machine (mobile §6.6). Most states already exist
in today's `SwapAmount` and are unchanged: **select** (a side unset → "Select an
asset", taps to the picker), **enter** (both set, amount 0 → "Enter an amount"),
**insufficient** (amount > spendable → disabled), **loading** (path-finding in
flight), **review** (valid + path found → "Review swap"). The **net-new** behavior
is the **post-scan unable-to-scan gate**: because we now scan the destination
token (§3.1) and the combined XDR (§3.9), the **Review swap** tap must **build +
scan first, then decide from the fresh scan result** — if any side (source/
destination token scan **or** the transaction-level XDR scan) is unable-to-scan,
surface an acknowledgement (the existing Blockaid warning surface) **before**
opening the review, then proceed. On the `Review` branch this sits between the
reserve pre-flight (§3.6) and the review sheet (§3.7).

### 3.4 Destination representation — descriptor without breaking the canonical string

The extension stores the destination as a **canonical string**
(`destinationAsset` on `TransactionData`), and downstream code
(`getAssetFromCanonical`, `isPathPaymentSelector` = `destinationAsset !== ""`,
path-finding, `getBuiltTx`) depends on that shape. Rather than replace it, **keep
`destinationAsset` as the canonical-string key** and add a sibling object that
carries the non-held metadata:

```ts
// transactionSubmission TransactionData — NEW field
destinationTokenDetails: {
  tokenCode: string;        // e.g. "AQUA" / "XLM" — lets the banner, review rows,
                            //   and warnings render without re-parsing destinationAsset
  requiresTrustline: boolean; // true when the user has no trustline for it
  decimals: number;         // 7 for classic (mobile may also read tomlInfo)
  issuer?: string;          // omitted for native XLM
  securityLevel?: SecurityLevel;        // from the bulk scan
  iconUrl?: string;         // from the search record, before balances hydrate
} | null;
```

`destinationAsset` (the canonical string) stays the identity/key used by
path-finding, build, selectors, and Send; `destinationTokenDetails` carries the
display + non-held metadata. `tokenCode` + `issuer` together fully describe the
asset for rendering, so consumers never have to re-split the canonical string.

Populated by `saveDestinationAsset` (or a new `saveDestinationTokenDetails`
reducer) when a row is picked: held rows → `requiresTrustline: false` (from the
balance), non-held rows → `requiresTrustline: true` (from the `searchAsset` /
Popular record). This is the extension's analogue of mobile's
`DestinationTokenDescriptor`, minimally invasive to the existing plumbing.

Two fields from mobile's descriptor are intentionally **dropped**: `tokenType`
(mobile keeps it for its Soroban gate; the §3.1 classic-only filter guarantees
every destination is a classic asset, and the canonical string + `issuer` already
imply native-vs-classic, so no type discriminator is needed here), and
`securityWarnings[]` (we keep only `securityLevel` on the slot and re-feed the live
bulk-scan / XDR-scan results into the Blockaid components at review — §3.7 — rather
than snapshotting a warnings array on the descriptor).

### 3.5 Atomic transaction — bundle `changeTrust` + `pathPaymentStrictSend`

**Extract the op builder.** Pull the op-creation out of
[`getManageAssetXDR`](../src/popup/helpers/getManageAssetXDR.ts) into a shared
helper so both Add-asset and Swap use it:

```ts
// NEW — src/popup/helpers/getManageAssetXDR.ts (or a sibling)
buildChangeTrustOperation({ assetCode, assetIssuer, isRemove = false, sdk }):
  xdr.Operation  // Operation.changeTrust({ asset: new Asset(code, issuer), ...(isRemove ? {limit:'0'} : {}) })
```

`getManageAssetXDR` is refactored to call it internally (no behavior change for
Add-asset).

**Extend the swap builder.** In
[`useSimulateSwapData.getBuiltTx`](../src/popup/components/swap/SwapAmount/hooks/useSimulateSwapData.tsx),
when `destinationTokenDetails.requiresTrustline === true`, **prepend** the
`changeTrust` op (op index 0) before `pathPaymentStrictSend` (op index 1), so
both submit atomically in one transaction:

```
op[0] = buildChangeTrustOperation({ assetCode, assetIssuer })   // only when requiresTrustline
op[1] = Operation.pathPaymentStrictSend({ sendAsset, sendAmount, destination: self, destAsset, destMin, path })
```

A guard throws if `requiresTrustline` but `issuer` is missing (unreachable —
XLM can't be new and Soroban is filtered — but fail-fast before an on-chain
`tx_no_trust`).

**Fee = total across ops.** Today the builder sets the `TransactionBuilder`
`fee` to `xlmToStroop(fee)` (the per-op base fee). Change it so the user-set fee
is the **total**: per-op base fee = `xlmToStroop(totalFee) / opCount`, clamped to
the 100-stroop network minimum, where `opCount = requiresTrustline ? 2 : 1`. A
2-op swap then charges exactly the displayed total. Send is always 1-op
(unchanged). The fee
input's recommended default / minimum should scale with `opCount` so the
displayed value doesn't jump.

**Quote freeze + expiry recovery (ported).** Freeze the path-finder's best
`destinationAmount` and the slippage-adjusted `destMin`
([`computeDestMinWithSlippage`](../src/helpers/transaction.ts), now defaulting to
**2%**) **once the amount is entered** (when path-finding resolves) — _before_
the review step — and reuse them **unchanged through review and submit** (never
re-quoted at submit). If Horizon rejects with a quote-expired op code —
**`op_under_dest_min`** _or_ **`op_too_few_offers`** — classify it specially (a
`getQuoteExpiredOperationCodes`-style helper over `resultCodes.operations`; this
concrete code set `["op_under_dest_min", "op_too_few_offers"]` matches mobile's
`quoteErrors.ts`), show an **alert** (the extension's toast/`Notification`) reading
_"Quote has expired, please try again to get a new quote"_, fire the dedicated
metric (§3.10) instead of a generic swap-fail, and **auto-refetch** a fresh path
(`getBestPath`) so the retry uses a new quote.

**Sign & submit unchanged.** The combined 2-op XDR flows through the existing
[`signFreighterTransaction`](../src/popup/ducks/transactionSubmission.ts) →
[`submitFreighterTransaction`](../src/popup/ducks/transactionSubmission.ts)
pipeline (verify the internal signing API accepts arbitrary op counts — expected
yes).

### 3.6 Pre-flight XLM-reserve check + XLM-reserve sheet (NEW)

Before opening the review for a **new-token** swap, run a pure predicate
(`shouldShowXlmReservePreflight`, new helper) to decide whether to surface the
**XLM-reserve sheet** instead ([Figma](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-33468)):

- Returns `false` when the destination isn't new (no trustline op → no reserve
  concern).
- **XLM source:** gate on spendable XLM `< BASE_RESERVE` (0.5 XLM). The amount
  screen already deducts the reserve up-front, so this only catches accounts that
  can't cover 0.5 to begin with.
- **Non-XLM source:** gate on post-fee XLM headroom `<= BASE_RESERVE` for the
  extra `changeTrust` op (`getAvailableBalance` already subtracts the full fee,
  which is now the true total, so no extra op-fee subtraction here).

**`XlmReserveSheet`** (NEW, `SlideupModal`/`Sheet`): explains the one-time 0.5 XLM
reserve, plus —

- **"Swap for 0.5 XLM"** — sets XLM as the receive token, picks a non-XLM classic
  source (current source if it qualifies, else the best non-XLM balance), and
  pre-fills the sell amount via Horizon `strictReceivePaths` so the user receives
  ~0.5 XLM; falls back to no pre-fill on a missing path. Hidden when no qualifying
  source exists (e.g. XLM-only account).
- **"Copy my wallet address"** — copies the active `G…` (existing clipboard util).
- **"Why do I need XLM?"** — inline link to the help article via the existing
  in-app-browser pattern.

### 3.7 Review extensions + info sheets

In [`ReviewTx`](../src/popup/components/InternalTransaction/ReviewTransaction/index.tsx)
(shared with Send; gets `dstAsset` for swaps):

- **Trustline banner** — when `destinationTokenDetails.requiresTrustline`,
  render a purple SDS `Notification` _"This will add a trustline to {CODE}"_ with
  a chevron → opens
  **`TrustlineInfoSheet`** (NEW) explaining the 0.5 XLM reserve is one-time and
  refundable when the trustline is removed ([Figma](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-34721)).
  Add a lilac/`highlight` SDS `Notification` variant if one doesn't exist.
- **Blockaid warnings** — feed the destination's bulk-scan result and the
  combined-XDR scan (already produced by `useSimulateSwapData` via
  [`useScanTx`](../src/popup/helpers/blockaid.ts)) into the existing
  `BlockaidTxScanLabel` / `BlockAidScanExpanded` / `ScamAssetIcon` components. A
  malicious/suspicious destination shows the red/amber banner and flips the
  footer to **Cancel** + **Confirm anyway** ([Figma](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8629-19445));
  fold a transaction-level **unable-to-scan** into the caution banner.
- **`VerifiedTokenInfoSheet` / `UnverifiedTokenInfoSheet`** (NEW) — the picker
  section **(i)** sheets.
- **Rate / details / minimum-received** — the Figma review shows a `Rate`
  (`1 {src} ≈ {n} {dst}`) and a `Transaction details` row. Verify whether the
  shared `ReviewTx` already renders these; if not, add a swap-rate row (a
  `calculateSwapRate`-style helper) and a **minimum-received** value computed from
  the **frozen `destMin`** (§3.5). Mobile's analogue is
  `SwapTransactionDetailsBottomSheet` + `calculateSwapRate`.

### 3.8 Redux state changes (`transactionSubmission`)

In [`ducks/transactionSubmission.ts`](../src/popup/ducks/transactionSubmission.ts):

- `allowedSlippage` default `"1"` → **`"2"`** (line 507) and `defaultSlippage`
  `"1"` → `"2"` in [`SwapAmount/index.tsx:61`](../src/popup/components/swap/SwapAmount/index.tsx#L61).
- Add `destinationTokenDetails` to `TransactionData` (§3.4) + its reducer.
- Freeze fields for the quote (`destinationAmount`, frozen `destMin`) already
  largely exist (`saveSwapBestPath`); add what's needed for expiry detection.
- No change to `saveAsset` / `getBestPath` / sign / submit signatures.

### 3.9 Blockaid integration summary

Everything needed already exists in [`helpers/blockaid.ts`](../src/popup/helpers/blockaid.ts)
and [`components/WarningMessages`](../src/popup/components/WarningMessages/index.tsx):

- **Pick-time:** `scanAssetBulk` in `useSwapTokenLookup` (mainnet-only).
- **Review-time:** `useScanTx` on the combined `changeTrust + pathPaymentStrictSend`
  XDR (already wired in `useSimulateSwapData`; it now scans 2 ops).
- **Caching:** add a session/Redux scan-result cache (new — the extension has none
  today) keyed by asset id with `updatedAt`, so the picker doesn't re-scan within
  a session.
- **In-place badges:** `ScamAssetIcon` renders the warning on (a) picker rows
  (§3.2), (b) the selected Sell/Receive token icon on the Swap home `AmountCard`
  (§3.3 — persists after the picker closes), and (c) the review sheet (§3.7) — the
  extension analogue of mobile's `TokenIconWithBadge` surfaces.

### 3.10 Telemetry

Add new entries to [`constants/metricsNames.ts`](../src/popup/constants/metricsNames.ts)
(which already has `viewSwap`, `swapFrom`, `swapTo`, `swapAmount`, `swapConfirm`,
…) and emit via `emitMetric`, mirroring mobile's `SWAP_*` set:

- swap **from**/**to** picker opened (`{ source: "cta" | "dropdown" }` — `cta` =
  the empty-state "Select an asset" button, `dropdown` = tapping the token chip in
  the You sell / You receive card)
- **source** selected (`{ tokenCode, tokenIssuer, source: "balances" | "search" }`
  — the source picker is held-only, so no `popular` / `requiresTrustline`)
- **destination** selected (`{ tokenCode, tokenIssuer, requiresTrustline, source: "balances" | "popular" | "search" }`)
- direction toggled
- trustline added (on confirmed combined tx)
- XLM-reserve-insufficient shown
- quote expired (`{ sourceToken, destToken, sourceAmount, destAmount, allowedSlippage, resultCode }`)
  — fired instead of swap-fail (§3.5); `allowedSlippage` lets us measure the 2%
  default's effect (§2.7) and `resultCode` carries the Horizon op code(s)

These measure the discovery → swap funnel and first-time trustline creation.

### 3.11 i18n

All new copy goes through `i18next`
([`helpers/localizationConfig.ts`](../src/popup/helpers/localizationConfig.ts),
locales `en` + `pt`): section headers, the empty/Soroban states, the soft
fallback notice, the trustline banner + info sheet, the XLM-reserve sheet, the
verified/unverified info sheets, and the quote-expired message.

### 3.12 Testing

- **Unit (Jest):**
  - `useSwapTokenLookup` ordering/dedupe (held → popular[volume7d ∩ verified] →
    search remainder), Soroban filtering, `hadSorobanMatches` empty-state,
    held-only fallback.
  - `buildChangeTrustOperation` + the extended `getBuiltTx`: `requiresTrustline`
    produces `changeTrust` as op[0] and `pathPaymentStrictSend` as op[1]; non-new
    produces the single op (regression).
  - Fee total-across-ops: per-op base fee = total/opCount, clamped; 1-op
    send/swap unchanged.
  - Quote-expiry classification → expiry path (message + refetch) vs generic fail.
  - `shouldShowXlmReservePreflight` branches (XLM vs non-XLM source).
  - `AmountCard` / `PercentageButtons` extraction: Send behavior preserved.
- **E2E (Playwright,** [`e2e-tests/`](../e2e-tests)**):** the Playwright spec
  **replaces mobile's manual/integration matrix** (mobile §12). There is **no swap
  E2E test today** (only `sendPayment` / `sendCollectible`). Add a `swap` spec
  covering held-to-held (regression), swap-to-new-token happy path (picker →
  non-held pick → review trustline banner → confirm → combined tx), the
  XLM-reserve sheet, a Blockaid-flagged destination, search (verified / unverified
  / Soroban empty state), the **stellar.expert-unreachable fallback** (Popular
  omitted + held-only search + soft notice — §3.1), and **testnet** behavior
  (Blockaid badges absent / unable-to-scan), reusing the existing fixtures/stubs.
- **Regression:** Add-asset still calls `getManageAssetXDR` (delegating to
  `buildChangeTrustOperation`); Send amount input behavior unchanged after the
  `AmountCard` extraction.

### 3.13 Backend follow-up (non-blocking)

Mirror mobile: we've filed a `freighter-backend-v2` issue for a
`GET /stellar-expert/asset` proxy ([#102](https://github.com/stellar/freighter-backend-v2/issues/102)) so we get our API key + higher rate limits.
Until it lands, call stellar.expert directly via the existing
[`searchAsset`](../src/popup/helpers/searchAsset.ts) pattern (the new Popular/
`volume7d` call routes per-network the same way). The frontend migrates by
swapping the base URL.

### 3.14 Rollout

Ship as a single feature branch; the new picker fully replaces the held-only swap
picker. **No feature flag** — consistent with mobile, the change is incremental
enough that flagging adds more risk than it removes. No data migration is
required.

---

## Appendix — Reference designs (Figma, Freighter Extension file)

| Screen                       | Figma                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| Swap home (no trending list) | [8629-32073](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8629-32073) |
| Swap to (picker, default)    | [8641-35309](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-35309) |
| Swap to (search results)     | [8641-35483](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-35483) |
| Swap from (picker, default)  | [8641-33048](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-33048) |
| Sell side focused            | [8645-46251](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8645-46251) |
| Sell side with amount        | [8641-32549](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-32549) |
| Review with trustline banner | [8641-34246](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-34246) |
| Trustline info sheet         | [8641-34721](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-34721) |
| Review with Blockaid warning | [8629-19445](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8629-19445) |
| Add XLM bottom sheet         | [8641-33468](https://www.figma.com/design/C3G0a4Gd6RQyplRBppGDsL/Freighter-Extension?node-id=8641-33468) |
