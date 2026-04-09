# AGENTS.md

> Freighter -- Non-custodial Stellar wallet browser extension (Chrome, Firefox,
> Safari). Monorepo with extension, client SDK, shared utilities, and docs site.

## Setup commands

- Install deps: `yarn setup`
- Start all workspaces: `yarn start`
- Start extension only: `yarn start:extension`
- Build extension (dev): `yarn build:extension`
- Build extension (production): `yarn build:extension:production`
- Build translations: `yarn build:extension:translations`
- Run unit tests: `yarn test`
- Run unit tests (CI): `yarn test:ci`
- Run e2e tests: `yarn test:e2e`

## Environment setup

Create `extension/.env`:

```env
INDEXER_URL=https://freighter-backend-prd.stellar.org/api/v1
INDEXER_V2_URL=https://freighter-backend-v2.stellar.org/api/v1
```

Requires Node >= 22 (.nvmrc), Yarn 4.10.0 (workspaces).

## Code style

- Double quotes, 2-space indent, trailing commas, 80-char width, semicolons
- Config in `.prettierrc.yaml`
- ESLint flat config (`eslint.config.js`)
- Named exports preferred (97%), arrow functions dominate (85%)
- For detailed rules:
  `docs/skills/freighter-best-practices/references/code-style.md`

## Pre-commit hooks

Husky runs on every commit:

1. `./.husky/addTranslations.sh` -- auto-generates
   `extension/src/popup/locales/`
2. `pretty-quick --staged` -- Prettier on staged files

## Testing instructions

- Unit tests: `yarn test` (Jest, JSDOM environment)
- E2E tests: `yarn test:e2e` (Playwright, Chromium only)
- Test files use `.test.ts` / `.test.tsx` in `__tests__/` directories
- For detailed patterns:
  `docs/skills/freighter-best-practices/references/testing.md`

## PR instructions

- Branch naming: `type/description` -- `feature/`, `fix/`, `chore/`,
  `refactor/`, `bugfix/`
- Commit messages: imperative action verb + description
- Default branch: `master`
- Run `yarn test:ci` and `yarn build:extension` before pushing
- For detailed workflow:
  `docs/skills/freighter-best-practices/references/git-workflow.md`

## Security considerations

These areas require careful review:

- `extension/src/background/` -- private keys, signing, encrypted storage
- `extension/src/contentScript/` -- attack surface between dApps and extension
- `extension/public/static/manifest/` -- extension permissions and CSP
- `@shared/constants/` -- network endpoints, key derivation parameters
- Any code touching `chrome.storage` or key material
- For detailed rules:
  `docs/skills/freighter-best-practices/references/security.md`

## Architecture

Three runtime contexts communicate via message passing:

1. **Popup** (`extension/src/popup/`) -- React UI, dispatches to background
2. **Background** (`extension/src/background/`) -- service worker, keys,
   signing, storage
3. **Content Script** (`extension/src/contentScript/`) -- bridges dApps to
   extension

State: Redux Toolkit (createSlice, createAsyncThunk, createSelector).

For detailed architecture:
`docs/skills/freighter-best-practices/references/architecture.md`

## Best practices entry points

Detailed best practices are split by concern area. Read the relevant file when
working in that domain:

| Concern              | Entry Point                                                         | When to Read                                             |
| -------------------- | ------------------------------------------------------------------- | -------------------------------------------------------- |
| Code Style           | `docs/skills/freighter-best-practices/references/code-style.md`     | Writing or reviewing any code                            |
| Architecture         | `docs/skills/freighter-best-practices/references/architecture.md`   | Adding features, understanding the codebase              |
| Security             | `docs/skills/freighter-best-practices/references/security.md`       | Touching keys, messages, storage, or dApp interactions   |
| Testing              | `docs/skills/freighter-best-practices/references/testing.md`        | Writing or fixing tests                                  |
| Performance          | `docs/skills/freighter-best-practices/references/performance.md`    | Optimizing renders, bundle size, or load times           |
| Error Handling       | `docs/skills/freighter-best-practices/references/error-handling.md` | Adding error states, catch blocks, or user-facing errors |
| Internationalization | `docs/skills/freighter-best-practices/references/i18n.md`           | Adding or modifying user-facing strings                  |
| Messaging            | `docs/skills/freighter-best-practices/references/messaging.md`      | Adding popup/background/content script communication     |
| Git & PR Workflow    | `docs/skills/freighter-best-practices/references/git-workflow.md`   | Branching, committing, opening PRs, CI                   |
| Dependencies         | `docs/skills/freighter-best-practices/references/dependencies.md`   | Adding, updating, or auditing packages                   |
| Anti-Patterns        | `docs/skills/freighter-best-practices/references/anti-patterns.md`  | Code review, avoiding common mistakes                    |

## Key documentation

| Topic                       | Location                                   |
| --------------------------- | ------------------------------------------ |
| Extension dev guide         | `extension/README.md`                      |
| Hardware wallet integration | `extension/INTEGRATING_HARDWARE_WALLET.MD` |
| Soroswap integration        | `extension/INTEGRATING_SOROSWAP.MD`        |
| Localization                | `extension/LOCALIZATION.MD`                |
| Style guide                 | `extension/STYLEGUIDE.MD`                  |
| E2E testing                 | `extension/e2e-tests/README.md`            |
| API reference               | `@stellar/freighter-api/README.md`         |
| User guides                 | https://docs.freighter.app                 |
