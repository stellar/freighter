# Freighter

> Non-custodial Stellar wallet browser extension for Chrome and Firefox.
> Monorepo: extension, client SDK (`@stellar/freighter-api`), shared utilities,
> and Docusaurus docs site.

## Glossary

Domain terms you will encounter throughout this codebase:

| Term               | Meaning                                                                            |
| ------------------ | ---------------------------------------------------------------------------------- |
| **Popup**          | Browser extension UI — React app at `extension/src/popup/`, runs in its own page   |
| **Background**     | Service worker at `extension/src/background/` — holds keys, signs, manages storage |
| **Content Script** | Injected into web pages; bridges dApp `window.postMessage` to the extension        |
| **dApp**           | Decentralized app that connects to Freighter via `@stellar/freighter-api`          |
| **XDR**            | Stellar binary serialization format used for transactions and ledger entries       |
| **Soroban**        | Stellar smart contract platform; transactions carry `SorobanData`                  |
| **Blockaid**       | Third-party malicious-transaction scanning service integrated into sign flows      |
| **Horizon**        | Stellar REST API for querying ledger data and submitting transactions              |
| **Mnemonic**       | BIP-39 seed phrase used to derive HD wallet private keys                           |
| **Redux slice**    | Feature-scoped reducer + actions created with `createSlice` (Redux Toolkit)        |
| **i18n key**       | Translation token; all user-facing text must go through `t()` from `react-i18next` |

## Documentation

- [User Guides](https://docs.freighter.app/docs/guide/introduction)
- [API Playgrounds](https://docs.freighter.app/docs/playground/getAddress)
- [Extension Dev Guide](./extension/README.md)
- [E2E Testing Guide](./extension/e2e-tests/README.md)
- [Style Guide](./extension/STYLEGUIDE.MD)
- [Localization](./extension/LOCALIZATION.MD)
- [Hardware Wallet Integration](./extension/INTEGRATING_HARDWARE_WALLET.MD)
- [Soroswap Integration](./extension/INTEGRATING_SOROSWAP.MD)
- [@stellar/freighter-api SDK](./@stellar/freighter-api/README.md)
- [Getting Started](./README.md)
- [Contributing](./CONTRIBUTING.MD)

## Quick Reference

| Item              | Value                                                        |
| ----------------- | ------------------------------------------------------------ |
| Language          | TypeScript, React                                            |
| Node              | >= 22 (`.nvmrc`)                                             |
| Package Manager   | Yarn 4.10.0 (workspaces)                                     |
| State Management  | Redux Toolkit                                                |
| Testing           | Jest (unit), Playwright (e2e)                                |
| Linting           | ESLint flat config + Prettier                                |
| Default Branch    | `master`                                                     |
| Branch Convention | `type/description` (`feature/`, `fix/`, `chore/`, `bugfix/`) |

## Build & Test Commands

```bash
yarn setup                         # Install + allow scripts
yarn start                         # Dev mode (all workspaces)
yarn start:extension               # Extension only
yarn build:extension               # Dev build
yarn build:extension:experimental  # Experimental features enabled
yarn build:extension:production    # Minified production build
yarn build:extension:translations  # Auto-generate translation keys
yarn test                          # Jest watch mode
yarn test:ci                       # Jest CI mode (use before pushing)
yarn test:e2e                      # Playwright e2e
```

## Environment Setup

Create `extension/.env`:

```env
INDEXER_URL=your_backend_v1_prod_url_here
INDEXER_V2_URL=your_backend_v2_prod_url_here
```

## Repository Structure

```
freighter/
├── extension/
│   ├── src/popup/          # React UI
│   ├── src/background/     # Service worker (keys, signing, storage)
│   ├── src/contentScript/  # dApp ↔ extension bridge
│   ├── e2e-tests/          # Playwright tests
│   └── public/             # Static assets, manifest
├── @stellar/freighter-api/ # npm SDK for dApp integration
├── @shared/                # Shared api, constants, helpers
├── docs/                   # Docusaurus site
├── config/                 # Shared Jest/Babel/Webpack configs
└── .github/
    ├── workflows/          # 10 CI/CD workflows
    └── agents/             # Playwright test AI agents (generator, healer, planner)
```

## Architecture

Three runtime contexts communicate exclusively via message passing:

1. **Popup** — React UI, dispatches to background via
   `sendMessageToBackground()` (which wraps `browser.runtime.sendMessage`)
2. **Background** — service worker, processes messages, never directly touches
   the DOM
3. **Content Script** — injected per tab, relays between `window.postMessage`
   and the background via `browser.runtime.sendMessage`

Dev server URLs:

| URL                                 | Purpose                                   |
| ----------------------------------- | ----------------------------------------- |
| `localhost:9000`                    | Extension popup (hot reload)              |
| `localhost:9000/#/debug`            | Blockaid debug panel (dev only)           |
| `localhost:9000/#/integration-test` | Integration test helper (clears app data) |

Background and content script changes require `yarn build:extension` + extension
reload. Popup changes hot reload automatically.

## Security-Sensitive Areas

Do not modify these without fully understanding the security implications:

- `extension/src/background/` — private keys, signing, encrypted storage
- `extension/src/contentScript/` — postMessage attack surface from dApps
- `extension/public/static/manifest/` — extension permissions and CSP
- `@shared/constants/` — network endpoints, key derivation parameters
- Any code touching `browser.storage` or key material

## Invariants — must always hold

Hard, review-checkable rules. Written to be citable against a specific line —
human and automated reviewers (including `/code-review`, which reads this via the
`CLAUDE.md` symlink) audit changes against them. Keep them specific; don't add
anything a linter/typechecker/CI already enforces.

### Secret material never leaks

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

### freighter-backend-v2 access

- All backend-v2 calls go through the background chokepoint. Popup callers use
  `fetchBackendV2()` (which sends the `FETCH_BACKEND_V2` message to
  `callBackendV2` in the background); never construct a `fetch`/`URL` to
  `INDEXER_V2_URL` at a call site, and don't re-declare the `FETCH_BACKEND_V2`
  message shape — add a new v2 caller via `fetchBackendV2()`.
- An endpoint that must never be auth-gated (e.g. rpc-health) passes
  `skipAuth: true` so it does not derive the auth keypair.

### Caching and side-effect ordering

- Response caching (`cachedFetch` and similar): validate `res.ok` before caching
  — never cache a non-2xx/error body (it poisons the cache for the whole TTL) —
  and ensure a cache miss / empty stored value triggers a real fetch (don't let a
  `"{}"` default satisfy a staleness gate).
- Persist side effects only after validating the request. Never write state
  (e.g. the allow-list) on a path that then returns denied/error.

### Dependencies

- Pin `@stellar/*` packages (`stellar-sdk`, `stellar-base`, `js-xdr`, etc.) to
  exact versions — no caret ranges.

### Domain invariants

The domain truths the code can't state and a reviewer can't infer. Keep this list
growing as new classes bite us — each a one-line, citable assertion:

- **Token/asset decimals:** SEP-41 / custom tokens have variable `decimals` —
  never format amounts with a hardcoded `CLASSIC_ASSET_DECIMALS` (7); look up the
  token's real decimals. _(from #2647)_
- **Network handling:** every network-dependent path must handle Mainnet
  (`NETWORKS.PUBLIC`), Testnet, Futurenet, **and** custom networks
  (`isCustomNetwork(networkDetails)`); a `switch`/map keyed on `NETWORKS` needs a
  default/custom branch. If a feature can't support a network, handle it with an
  explicit graceful fallback, not an unhandled case or guaranteed error.
- **Signing — always attempt a Blockaid scan before signing.** Every flow that
  signs or submits a transaction (dApp sign, send, swap, send-collectible) must
  call `scanTx` (via `useScanTx`) and surface the `scanResult` before the user
  signs; on unable-to-scan, show the explicit warning rather than proceeding as
  if safe. Don't add a signing/submit entry point that bypasses the scan.
  (Add-token/asset flows follow the parallel rule with `scanAsset`.)
- **Address handling:** any code that accepts, parses, displays, resolves, or
  routes a Stellar address must handle all four types — classic **G** accounts,
  contract **C** addresses (`isContractId`), muxed **M** accounts
  (`isMuxedAccount`), and **federated** addresses (`isFederationAddress` /
  `isValidFederatedDomain`). Resolve federated before use; preserve/extract the
  muxed memo id (don't strip or mislabel it); route C addresses appropriately
  where a fundable account is expected; validate with `isValidStellarAddress`.

## Known Complexity / Gotchas

- **Message passing** uses typed enums. Follow existing patterns — do not add
  raw string messages.
- **Build variants** (standard / experimental / production) have different
  feature flags; test the right one.
- **Translations** require running `yarn build:extension:translations` after
  adding any `t()` call; the pre-commit hook handles this automatically but
  re-run if the hook is skipped.
- **Soroswap** swap logic lives in `popup/helpers/sorobanSwap.ts` — three
  chained async calls; debug with logs before refactoring.
- **Store submissions** use separate CI workflows per platform (Chrome, Firefox,
  npm).
- **AI test agents** live in `.github/agents/` — don't delete or rename without
  updating the workflows.

## Pre-submission Checklist

```bash
yarn test:ci                  # All unit tests must pass
yarn build:extension          # Build must succeed (catches type errors)
```

## Best Practices Entry Points

Read the relevant file when working in that area:

| Concern              | Entry Point                                                         | When to Read                                                                               |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Code Style           | `docs/skills/freighter-best-practices/references/code-style.md`     | Writing or reviewing any code                                                              |
| Architecture         | `docs/skills/freighter-best-practices/references/architecture.md`   | Adding features, understanding context/message flow                                        |
| Security             | `docs/skills/freighter-best-practices/references/security.md`       | Touching keys, messages, storage, or dApp interactions                                     |
| Testing              | `docs/skills/freighter-best-practices/references/testing.md`        | Writing or fixing tests                                                                    |
| Performance          | `docs/skills/freighter-best-practices/references/performance.md`    | Optimizing renders, bundle size, or load times                                             |
| Error Handling       | `docs/skills/freighter-best-practices/references/error-handling.md` | Adding error states, catch blocks, or user-facing errors                                   |
| Internationalization | `docs/skills/freighter-best-practices/references/i18n.md`           | Adding or modifying user-facing strings                                                    |
| Messaging            | `docs/skills/freighter-best-practices/references/messaging.md`      | Adding popup/background/content script communication                                       |
| Git & PR Workflow    | `docs/skills/freighter-best-practices/references/git-workflow.md`   | Branching, committing, opening PRs, CI                                                     |
| Dependencies         | `docs/skills/freighter-best-practices/references/dependencies.md`   | Adding, updating, or auditing packages                                                     |
| Anti-Patterns        | `docs/skills/freighter-best-practices/references/anti-patterns.md`  | Code review, avoiding common mistakes                                                      |
| Troubleshooting      | `docs/troubleshooting-guide.md`                                     | Build failures, setup issues, known bugs and gotchas                                       |
| dApp API Integration | `docs/api-integration.md`                                           | Writing or reviewing dApp code that uses `@stellar/freighter-api` or `stellar-wallets-kit` |
