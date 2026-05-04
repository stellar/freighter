# Contributing to Freighter

Non-custodial Stellar wallet browser extension. Monorepo with extension, client
SDK, shared utilities, and docs site.

For the Stellar organization's general contribution guidelines, see the
[Stellar Contribution Guide](https://github.com/stellar/.github/blob/master/CONTRIBUTING.md).

## Prerequisites

| Tool              | Version | Install                                                      |
| ----------------- | ------- | ------------------------------------------------------------ |
| Node.js           | >= 22   | `nvm use` (reads `.nvmrc`)                                   |
| Yarn              | 4.10.0  | `corepack enable && corepack prepare yarn@4.10.0 --activate` |
| Chrome or Firefox | Latest  | For loading and testing the extension                        |

## Getting Started

### Quick Setup with an LLM

If you use an LLM-powered coding assistant, you can automate the setup. The repo
includes a quick start guide ([`quick-start-guide.md`](quick-start-guide.md))
that checks your environment, installs missing tools, configures `.env`, and
verifies the build.

Point your LLM assistant at `quick-start-guide.md` and ask it to follow the
steps.

The skill will:

1. Check all prerequisites (Node, Yarn, Chrome/Firefox)
2. Install what it can automatically (with your confirmation)
3. Produce a list of manual steps for anything it couldn't install
4. Set up `.env` with your running backend instances
5. Run verification to confirm the build works

If you don't use an LLM assistant, follow the manual setup below.

### Manual Setup

```bash
git clone https://github.com/stellar/freighter.git
cd freighter
nvm use               # Switches to Node 22
yarn setup            # Installs dependencies and allows scripts
```

### Environment Variables

Copy `.env.example` and set the backend URLs to your running instances:

```bash
cp extension/.env.example extension/.env
```

- **V1** `INDEXER_URL` →
  [stellar/freighter-backend](https://github.com/stellar/freighter-backend)
  (TypeScript) — balances, subscriptions, feature flags, notifications
- **V2** `INDEXER_V2_URL` →
  [stellar/freighter-backend-v2](https://github.com/stellar/freighter-backend-v2)
  (Go) — collectibles, RPC health, ledger keys, protocols

Follow each repo's README for setup and default local ports.

### Run the Extension

```bash
yarn start            # Starts all workspaces in parallel
```

This runs the extension dev server (`localhost:9000`), SDK build in watch mode,
and Docusaurus (`localhost:3000`).

To start a single workspace: `yarn start:extension`, `yarn start:freighter-api`,
or `yarn start:docs`.

**Load in Chrome:**

1. Go to `chrome://extensions`, enable "Developer mode"
2. Click "Load unpacked", select `extension/build/`

**Load in Firefox:**

1. Go to `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on", select `extension/build/manifest.json`

### Hot Reload

- **Popup changes** hot reload via the dev server at `localhost:9000`
- **Background/content script changes** require `yarn build:extension` + reload
  the extension in the browser

### Dev URLs

| URL                                 | Purpose                 |
| ----------------------------------- | ----------------------- |
| `localhost:9000`                    | Extension popup         |
| `localhost:9000/#/debug`            | Blockaid debug panel    |
| `localhost:9000/#/integration-test` | Integration test helper |
| `localhost:3000`                    | Documentation site      |

## Key Commands

```bash
yarn build:extension              # Dev build
yarn build:extension:experimental # Experimental features enabled
yarn build:extension:production   # Minified production build
yarn test                         # Jest unit tests (watch mode)
yarn test:ci                      # Jest CI mode (no watch)
yarn test:e2e                     # Playwright e2e tests
```

See `package.json` for the complete list of scripts.

## Code Conventions

- **Formatting:** Double quotes, 2-space indent, trailing commas, 80-char width,
  semicolons. Enforced by Prettier (`.prettierrc.yaml`).
- **Linting:** ESLint with auto-fix. Config in `eslint.config.js`.
- **Navigation:** Use `navigateTo` helper + `ROUTES` enum — never hardcoded
  paths. See [`extension/STYLEGUIDE.MD`](extension/STYLEGUIDE.MD).
- **Imports:** Keep external packages first, then internal.
- **Translations:** All user-facing strings through `t()` from `react-i18next`.
  See [`extension/LOCALIZATION.MD`](extension/LOCALIZATION.MD).

### Pre-commit Hooks

Husky runs on every commit:

1. `./.husky/addTranslations.sh` — auto-generates locale files
2. `pretty-quick --staged` — runs Prettier on staged files

If using nvm, create `~/.huskyrc` to ensure the correct Node version loads.

## Architecture

The extension has three runtime contexts communicating via message passing:

| Context            | Location                       | Purpose                                                     |
| ------------------ | ------------------------------ | ----------------------------------------------------------- |
| **Popup**          | `extension/src/popup/`         | React app — UI the user sees                                |
| **Background**     | `extension/src/background/`    | Service worker — keys, signing, storage, message handling   |
| **Content Script** | `extension/src/contentScript/` | Bridges `window.postMessage` from dApps to `chrome.runtime` |

**Monorepo structure:**

```
freighter/
├── extension/               # Browser extension (popup, background, content script)
├── @stellar/freighter-api/  # npm SDK for dApp integration
├── @shared/                 # Shared code (api, constants, helpers)
├── docs/                    # Docusaurus site (docs.freighter.app)
└── config/                  # Shared build configs
```

## Linting

ESLint runs automatically during `yarn build:extension` via the webpack plugin.
To run it manually on a file or directory:

```bash
npx eslint extension/src/path/to/file.ts
npx eslint extension/src/          # all extension source
npx eslint --fix extension/src/    # auto-fix where possible
```

Config is in `eslint.config.js`. `lint-staged` is configured in `package.json`,
but it currently targets repo-root `src/**/*.ts?(x)` paths, so it does not cover
files under `extension/src/**`. If you want automatic pre-commit enforcement,
update those globs to match the repo's actual source locations and wire that
config into the active Husky hook.

## Testing

**Unit tests:** Jest with JSDOM. Tests in `__tests__/` alongside source. Run
`yarn test` (watch) or `yarn test:ci`.

**E2E tests:** Playwright with Chromium. See
[`extension/e2e-tests/README.md`](extension/e2e-tests/README.md) for setup and
writing tests.

```bash
yarn test:e2e                         # All tests
yarn test:e2e sendPayment.test.ts     # Specific file
yarn test:e2e --ui                    # Interactive mode
```

**Before submitting a PR:** `yarn test:ci` must pass. Test on both Chrome and
Firefox when touching extension behavior.

## Adding Features

### Adding a new feature end-to-end

A typical extension feature touches all three runtime contexts:

1. **Popup** — add the UI in `extension/src/popup/` (React component + route)
2. **Background** — add the handler in `extension/src/background/` (message
   listener, storage, or signing logic)
3. **Content Script** — if the feature involves dApp communication, add the
   message relay in `extension/src/contentScript/`

Use typed message enums for popup <-> background <-> content script
communication. Follow existing patterns in the codebase.

### Adding a new API method to `@stellar/freighter-api`

1. Add the method in `@stellar/freighter-api/src/`
2. Add the corresponding message handler in `extension/src/background/`
3. Add the content script relay in `extension/src/contentScript/`
4. Add an interactive playground in `docs/docs/playground/`
5. Update the API docs at `docs.freighter.app`

### Running the backend locally

The extension connects to two separate backend services:

- **V1** `INDEXER_URL` →
  [stellar/freighter-backend](https://github.com/stellar/freighter-backend)
  (TypeScript) — balances, subscriptions, feature flags, notifications
- **V2** `INDEXER_V2_URL` →
  [stellar/freighter-backend-v2](https://github.com/stellar/freighter-backend-v2)
  (Go) — collectibles, RPC health, ledger keys, protocols

To run your own:

1. Clone the repo for the backend you need (V1, V2, or both)
2. Follow its README for setup
3. Update `INDEXER_URL` and/or `INDEXER_V2_URL` in `extension/.env` to point at
   your local instance

## Pull Requests

- Branch from `master` with a type prefix: `feature/`, `fix/`, `chore/`,
  `refactor/`, `bugfix/`
- Commit messages: start with action verb (`Add`, `Fix`, `Update`, `Improve`)
- No mixed concerns — keep refactoring separate from features
- Include before/after screenshots for UI changes
- Update translations if adding user-facing strings (pre-commit hook handles
  generation)
- Test on both Chrome and Firefox

**CI runs on every PR:** Jest + Playwright (`runTests.yml`), CodeQL security
analysis (`codeql.yml`). All must pass.

## Security

Freighter handles private keys and signs transactions. When contributing:

- **Never log or expose** private keys, seed phrases, or passwords
- **Validate all external data** — dApp messages via content script, API
  responses
- **Don't bypass CSP** or weaken existing security guardrails
- **Be careful with `window.postMessage`** — the content script is an attack
  surface
- **Use production builds** for testing security-sensitive flows (extra
  guardrails)
- **Report vulnerabilities** via the
  [Stellar Security Policy](https://github.com/stellar/.github/blob/master/SECURITY.md)
  — not public issues

## Further Reading

| Topic                       | Location                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------- |
| Extension dev guide         | [`extension/README.md`](extension/README.md)                                           |
| Hardware wallet integration | [`extension/INTEGRATING_HARDWARE_WALLET.MD`](extension/INTEGRATING_HARDWARE_WALLET.MD) |
| Soroswap integration        | [`extension/INTEGRATING_SOROSWAP.MD`](extension/INTEGRATING_SOROSWAP.MD)               |
| Localization guide          | [`extension/LOCALIZATION.MD`](extension/LOCALIZATION.MD)                               |
| Style guide                 | [`extension/STYLEGUIDE.MD`](extension/STYLEGUIDE.MD)                                   |
| E2E testing                 | [`extension/e2e-tests/README.md`](extension/e2e-tests/README.md)                       |
| API playgrounds             | [docs.freighter.app](https://docs.freighter.app)                                       |
| All scripts & commands      | `package.json`                                                                         |

**Questions?** Open a
[GitHub Discussion](https://github.com/stellar/freighter/discussions) or join
the [Stellar Developer Discord](https://discord.gg/stellardev).
