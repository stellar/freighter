# Freighter — AI Agent Context

> Non-custodial Stellar wallet browser extension. Monorepo with extension,
> client SDK, shared utilities, and docs site.

## Quick Reference

| Item              | Value                                                           |
| ----------------- | --------------------------------------------------------------- |
| Language          | TypeScript, React                                               |
| Node              | >= 22 (.nvmrc)                                                  |
| Package Manager   | Yarn 4.10.0 (workspaces)                                        |
| State Management  | Redux (extension)                                               |
| Testing           | Jest (unit), Playwright (e2e)                                   |
| Linting           | ESLint flat config + Prettier                                   |
| CI                | GitHub Actions (10 workflows)                                   |
| Docs              | Docusaurus at docs.freighter.app                                |
| Default Branch    | `master`                                                        |
| Branch Convention | `type/description` (feature/, fix/, chore/, refactor/, bugfix/) |

## Build & Test Commands

```bash
yarn setup                        # Install + allow scripts
yarn start                        # Dev mode (all workspaces)
yarn start:extension              # Extension only
yarn start:freighter-api          # SDK only
yarn start:docs                   # Docs only
yarn build:extension              # Dev build
yarn build:extension:experimental # Experimental features enabled
yarn build:extension:production   # Minified production build
yarn build:extension:translations # Auto-generate translation keys
yarn test                         # Jest watch mode
yarn test:ci                      # Jest CI mode
yarn test:e2e                     # Playwright e2e
```

## Repository Structure

```
freighter/
├── extension/                    # Browser extension
│   ├── src/popup/                # React UI (user-facing)
│   ├── src/background/           # Service worker (signing, storage, messages)
│   ├── src/contentScript/        # Content script (dApp <-> extension bridge)
│   ├── e2e-tests/                # Playwright tests
│   └── public/                   # Static assets, manifest
├── @stellar/freighter-api/       # npm SDK for dApp integration
├── @shared/                      # Shared code (api, constants, helpers)
│   ├── api/
│   ├── constants/
│   └── helpers/
├── docs/                         # Docusaurus documentation site
├── config/                       # Shared build configs (Jest, Babel, Webpack)
└── .github/
    ├── workflows/                # 10 CI/CD workflows
    └── agents/                   # Playwright test AI agents (generator, healer, planner)
```

## Architecture

The extension has three runtime contexts that communicate via message passing:

1. **Popup** (`extension/src/popup/`) — React app. UI layer. Dispatches actions
   to background via `chrome.runtime.sendMessage`.
2. **Background** (`extension/src/background/`) — Service worker. Holds
   encrypted keys, signs transactions, manages storage. Processes messages from
   popup and content script.
3. **Content Script** (`extension/src/contentScript/`) — Injected into web
   pages. Bridges `window.postMessage` from `@stellar/freighter-api` to
   `chrome.runtime.sendMessage` for the background.

### Build Variants

| Variant      | Command                             | Features                                     |
| ------------ | ----------------------------------- | -------------------------------------------- |
| Standard     | `yarn build:extension`              | Everyday development, connects to dev server |
| Experimental | `yarn build:extension:experimental` | Feature-flagged features enabled             |
| Production   | `yarn build:extension:production`   | Minified, security guardrails, no dev server |

### Dev Server URLs

| URL                                 | Purpose                                   |
| ----------------------------------- | ----------------------------------------- |
| `localhost:9000`                    | Extension popup                           |
| Extension popup `/debug` route      | Blockaid debug panel (dev mode only)      |
| `localhost:9000/#/integration-test` | Integration test helper (clears app data) |
| `localhost:3000`                    | Documentation site                        |

### Hot Reload

- **Popup changes** hot reload automatically via dev server at `localhost:9000`
- **Background/content script changes** require `yarn build:extension` + reload
  extension in browser

### Environment Variables

Only two required for local dev — create `extension/.env`:

```env
INDEXER_URL=https://freighter-backend-prd.stellar.org/api/v1
INDEXER_V2_URL=https://freighter-backend-v2.stellar.org/api/v1
```

## Key Conventions

- **Navigation:** Use `navigateTo` helper + `ROUTES` enum, never hardcoded
  paths. See `extension/STYLEGUIDE.MD`.
- **Translations:** All user-facing strings wrapped in `t()` from
  `react-i18next`. Run `yarn build:extension:translations` to generate keys. See
  `extension/LOCALIZATION.MD`.
- **Imports:** External packages first, then internal; follow this convention
  consistently.
- **Formatting:** Double quotes, 2-space indent, trailing commas, 80-char width,
  semicolons. Config in `.prettierrc.yaml`.
- **Branch naming:** `type/description` — `feature/`, `fix/`, `chore/`,
  `refactor/`, `bugfix/`.
- **Commit messages:** Imperative action verb + description. PR number appended
  on merge.

### Pre-commit Hooks

Husky runs on every commit:

1. `./.husky/addTranslations.sh` — translation build that auto-generates
   `extension/src/popup/locales/` files
2. `pretty-quick --staged` — Prettier on staged files

If using nvm, create `~/.huskyrc` to ensure correct Node version.

## Security-Sensitive Areas

These areas require careful review — do not modify without understanding the
security implications:

- `extension/src/background/` — handles private keys, signing, encrypted storage
- `extension/src/contentScript/` — attack surface between dApps and extension
  (postMessage)
- `extension/public/static/manifest/` — extension permissions and CSP
- `@shared/constants/` — network endpoints, key derivation parameters
- Any code touching `chrome.storage` or key material

## Known Complexity

- **Message passing:** Popup <-> background <-> content script communication is
  async and uses typed message enums. Follow existing patterns.
- **Build variants:** Standard, experimental, and production builds have
  different feature flags and security settings.
- **Blockaid integration:** Transaction scanning is wired through multiple
  layers. Test with the debug panel at `localhost:9000/#/debug`.
- **Soroswap:** Asset swap integration via `popup/helpers/sorobanSwap.ts` —
  three key methods (getSoroswapTokens, soroswapGetBestPath,
  buildAndSimulateSoroswapTx).
- **Store submissions:** Separate CI workflows for Chrome Web Store, Firefox
  AMO, Safari, and npm publishing.
- **AI agents:** Three Playwright test agents in `.github/agents/` (generator,
  healer, planner) for test automation.

## Key Documentation

| Topic                       | Location                                   |
| --------------------------- | ------------------------------------------ |
| Extension dev guide         | `extension/README.md`                      |
| Hardware wallet integration | `extension/INTEGRATING_HARDWARE_WALLET.MD` |
| Soroswap integration        | `extension/INTEGRATING_SOROSWAP.MD`        |
| Localization                | `extension/LOCALIZATION.MD`                |
| Style guide                 | `extension/STYLEGUIDE.MD`                  |
| E2E testing                 | `extension/e2e-tests/README.md`            |
| Changelog                   | `extension/CHANGELOG.MD`                   |
| API playgrounds             | docs.freighter.app                         |
