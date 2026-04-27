---
id: troubleshooting-guide
title: Troubleshooting Guide
slug: /troubleshooting-guide
---

_Last updated: 2026-04-08_

Common issues and solutions when developing the Freighter browser extension.

## Setup Issues

### `yarn setup` fails with permission errors

**Symptom:** `EACCES` or permission denied errors during `yarn setup`.

**Solution:** Ensure you're using the correct Node version:

```bash
nvm use    # Uses .nvmrc (Node 22)
```

If you installed Node via a system package manager, switch to nvm to avoid
permission issues.

### Husky pre-commit hooks fail

**Symptom:** Commits fail with "command not found" or wrong Node version errors.

**Solution:** If using nvm, Husky 9 (used by this project) requires a different
init file than older versions. Create `~/.config/husky/init.sh`:

```bash
# ~/.config/husky/init.sh
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use
```

> **Note:** The old `~/.huskyrc` file is not read by Husky 9. If you previously
> created that file, it has no effect — create `~/.config/husky/init.sh`
> instead.

Also verify the pre-commit script is executable:

```bash
ls -la .husky/pre-commit    # Should show -rwxr-xr-x
chmod +x .husky/pre-commit  # Fix if not executable
```

### IDE and ESLint plugins not loading

**Symptom:** ESLint errors are not shown in the editor, or the IDE reports
"ESLint server failed to start" / "No ESLint configuration found".

> **Note:** The pre-commit hook runs `pretty-quick` (formatting) and
> `addTranslations.sh` — it does **not** run ESLint. ESLint only runs in your
> editor. If ESLint is not catching errors, the issue is with your IDE
> extension, not Husky.

**Solution:** Ensure the ESLint IDE extension is installed and configured:

1. **VS Code:** Install the
   [ESLint extension](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint).
   This project uses ESLint flat config (`eslint.config.js`) — check your
   extension version is ≥3.0.10 (flat config support).
2. **WebStorm/IntelliJ:** Enable ESLint under Languages & Frameworks >
   JavaScript
   > Code Quality Tools > ESLint, and set "Automatic ESLint configuration".
3. **Verify the extension sees the config:** Run ESLint manually to confirm it
   picks up the project config before relying on IDE integration:
   ```bash
   npx eslint extension/src/popup/App.tsx
   ```

### Yarn workspaces resolution errors

**Symptom:** Module not found errors for `@shared/*` or
`@stellar/freighter-api`.

**Solution:**

```bash
yarn install     # Reinstall to rebuild workspace links
yarn build       # Build all workspaces (some depend on others)
```

## Build Issues

### Webpack build fails with "out of memory"

**Symptom:**
`FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`

**Solution:** Increase Node memory:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
yarn build:extension
```

### Extension not loading in Chrome after build

**Symptom:** Chrome shows "Manifest file is missing or unreadable" or extension
doesn't appear.

**Solution:**

1. Ensure you built first: `yarn build:extension`
2. Point Chrome to `extension/build/` (not `extension/`)
3. Check that `extension/build/manifest.json` exists
4. If updating, click the refresh icon on the extension card in
   `chrome://extensions`

### Firefox temporary add-on disappears

**Symptom:** Extension is gone after restarting Firefox.

**Solution:** This is expected — Firefox temporary add-ons don't persist. Reload
via `about:debugging#/runtime/this-firefox` each time.

### Changes not reflecting in the extension

**Symptom:** You edited code but the extension still shows old behavior.

**Solution:**

- **Popup changes:** If using dev server (`yarn start`), changes hot-reload at
  `localhost:9000`. If testing as an extension, rebuild: `yarn build:extension`.
- **Background/content script changes:** Always require `yarn build:extension` +
  reload the extension in `chrome://extensions`.
- **Hard refresh:** Try removing and re-loading the unpacked extension.

### Stale unpacked extension causing undefined behavior

**Symptom:** The extension behaves inconsistently — messages between popup,
background, and content scripts fail silently, features appear broken despite
correct code, or you see errors related to `postMessage` / the message broker.

**Solution:** Stale builds of the unpacked extension are a common source of
hard-to-diagnose bugs, especially after changes to the message passing layer
(`postMessage` broker):

1. Go to `chrome://extensions`
2. Click the **refresh icon** (circular arrow) on the Freighter extension card
3. If that's not enough, **remove** the extension entirely and re-add it ("Load
   unpacked" pointing to `extension/build/`)
4. Always run `yarn build:extension` before reloading — a refresh without a
   rebuild just reloads the old build

**When this matters most:** Any change to how popup, background, and content
scripts communicate (message types, payload shapes, routing logic). The message
broker is stateful in the service worker — a stale version will silently drop or
misroute messages from updated code.

### Production build won't connect to dev server

**Symptom:** `yarn build:extension:production` build can't reach
`localhost:9000`.

**Solution:** This is by design. Production builds have security guardrails that
block dev server connections. Use `yarn build:extension` for development.

## Testing Issues

### Playwright tests fail on stale build

**Symptom:** e2e tests fail with unexpected behavior, missing elements, or
assertion errors — but the code looks correct.

**Solution:** Always rebuild before running e2e tests. Playwright tests run
against the built extension, not the dev server:

```bash
yarn build:extension    # Ensure latest code is built
yarn test:e2e           # Now run tests
```

Also clear caches if the build itself seems stale:

```bash
rm -rf extension/build node_modules/.cache
yarn build:extension
yarn test:e2e
```

### Distinguishing real test failures from flaky ones

**Symptom:** Some Playwright tests fail intermittently — sometimes passing,
sometimes failing on the same code.

**Solution:** Use Playwright's UI mode to triage:

```bash
yarn test:e2e --ui
```

1. Let **all** tests run to completion first
2. Filter for failed tests only
3. Re-run the failed tests 2-3 times
4. Tests that fail consistently across multiple runs are real failures; tests
   that pass on retry are flaky

This avoids wasting time debugging timing-related flakes. If a test is
consistently flaky, use the
[Playwright MCP server](https://playwright.dev/docs/mcp) (`playwright-test`) to
diagnose and fix the root cause — it typically produces a more robust fix than
manually bumping timeouts.

### Playwright tests timeout on first run

**Symptom:** Tests timeout at 15 seconds before the extension loads.

**Solution:** First run is slow because the extension needs to initialize. Try:

```bash
yarn build:extension    # Ensure a fresh build
yarn test:e2e --headed  # Watch what's happening
```

### Playwright 1.57 high memory usage (Chrome for Testing)

**Symptom:** Playwright tests crash or the system becomes unresponsive during
parallel test execution. Each Chrome instance consumes ~20GB of memory.

**Root cause:** Playwright 1.57 switched from lightweight open-source Chromium
to Chrome for Testing, which uses significantly more memory
([microsoft/playwright#38489](https://github.com/microsoft/playwright/issues/38489)).

**Solution:**

1. **Reduce parallelism:** Limit Playwright workers in `playwright.config.ts`:
   ```ts
   workers: 1, // or 2, depending on available RAM
   ```
2. **If running in CI:** Ensure the CI runner has at least 8GB of RAM. Consider
   using `--shard` to distribute tests across multiple runners.
3. **Monitor version updates:** This is being tracked upstream — future
   Playwright versions may offer a lighter alternative.

### Playwright 1.58+ breaks `--dry-run` output parsing

**Symptom:** Docker builds or CI scripts that parse
`npx playwright install --dry-run` output fail after upgrading past 1.57.

**Root cause:** Playwright 1.58 changed the `--dry-run` output format from
`"browser: chromium"` to `"Chrome for Testing"`.

**Solution:** If you have CI scripts that grep for `"chromium"` in dry-run
output, update them to match the new format. The project is currently on
Playwright 1.57 — be aware of this if upgrading.

### Jest tests fail with module resolution errors

**Symptom:** `Cannot find module '@shared/...'` or similar.

**Solution:** Ensure all workspaces are built:

```bash
yarn build
yarn test:ci
```

## Localization Issues

### Translation keys showing as raw text

**Symptom:** UI shows `account.send.title` instead of "Send Payment".

**Solution:**

```bash
yarn build:extension:translations    # Regenerate translation files
```

If the key is new, ensure it's added to all JSON files in
`extension/src/popup/locales/`.

### Pre-commit hook adds unexpected locale changes

**Symptom:** `git diff` shows changes to locale files you didn't touch.

**Solution:** This is expected. The pre-commit hook auto-runs
`yarn build:extension:translations` and stages locale files. These are generated
— commit them as-is.

## Node.js & Build Environment Issues

### Webpack/Tailwind 4 build issues

**Symptom:** CSS not applied, styles broken, or PostCSS errors after dependency
updates.

**Current stack:** The extension uses Tailwind CSS 4.1.18 with
`@tailwindcss/postcss` and PostCSS 8.5.6. Tailwind 4 is a major version with a
new engine.

**If styles break:**

1. Clear build cache: `rm -rf extension/build node_modules/.cache`
2. Rebuild: `yarn build:extension`
3. If PostCSS errors persist, check that `postcss.config.js` uses
   `@tailwindcss/postcss` (not the legacy `tailwindcss` plugin)

## Manifest V3 Service Worker Pitfalls

### Service worker idle termination

**Symptom:** Background operations (long-running API calls, pending
WalletConnect sessions) fail silently or produce inconsistent state.

**Root cause:** Chrome terminates idle Manifest V3 service workers after ~30
seconds of inactivity. Any in-progress work is lost.

**Key rules:**

- Never use `setTimeout()` or `setInterval()` for long delays — timers are
  cancelled when the worker terminates
- Use `browser.alarms` (via `webextension-polyfill`) for delayed operations
  instead
- Store pending state with the storage helpers (`dataStorageAccess` /
  `browserLocalStorage`) so it survives worker restarts
- Register all event listeners synchronously at the top level — asynchronously
  registered listeners may not fire

### Async listener registration silently fails

**Symptom:** Events (message from content script, webRequest, etc.) stop being
handled intermittently.

**Root cause:** If you register a listener inside an `async` function or after
an `await`, the service worker may reinitialize before the listener is
registered, causing the event to be silently dropped.

**Solution:** Always register listeners at the module's top level:

```ts
// WRONG — listener may not be registered after worker restart
async function setup() {
  const config = await loadConfig();
  browser.runtime.onMessage.addListener(handler);
}

// RIGHT — listener is always registered
browser.runtime.onMessage.addListener(handler);
```

## React 19 Compatibility Issues

The extension uses React 19.0.3. These are known breaking changes that may
surface when modifying older code.

### String refs removed

**Symptom:** Runtime crash with an error about string refs not being supported.

**Root cause:** React 19 removed string refs entirely (`ref="myRef"`). Any
remaining string refs in the codebase will crash.

**Solution:** Replace with `useRef` or callback refs.

### Error handling changes

**Symptom:** Error boundaries behave differently — errors in render are no
longer re-thrown to `window.onerror` or `process.on('uncaughtException')`.

**Impact:** If Sentry or error reporting relied on re-thrown render errors,
configure `onUncaughtError` / `onCaughtError` callbacks on the root. Check that
the Sentry integration captures React errors correctly.

### Ref cleanup functions

**Symptom:** Returning a value from a ref callback causes unexpected cleanup
behavior.

**Root cause:** React 19 treats functions returned from ref callbacks as cleanup
functions (similar to `useEffect`). Components that accidentally return values
from ref callbacks will break.

**Solution:** If a ref callback doesn't need cleanup, ensure it returns
`undefined` (or nothing).

## Common Development Pitfalls

### Editing content script without rebuilding

The content script runs in the web page context, not the extension popup.
Changes to content script code require a full `yarn build:extension` and
extension reload. The dev server only hot-reloads popup code.

### Message passing type mismatches

When adding new message types between popup/background/content script, update
the typed message enums in all three contexts. A mismatch causes silent message
drops.

### Background service worker behaves differently from popup

Background scripts run as service workers (Manifest V3), which means they have
different constraints than popup or content scripts:

- No persistent state between events — use `browser.storage` to persist data
- No DOM access
- Limited lifetime (Chrome may terminate idle workers)

Test that your background code works correctly after a worker restart, not just
in the popup context where you typically develop and debug.

### Sidebar mode routes signing through a separate context

Signing requests (sign transaction, sign auth entry, etc.) can be routed through
the sidebar panel instead of the popup. The background maintains a separate
`sidebarQueueUuids` set alongside `activeQueueUuids`. Disconnect cleanup and
queue clearing behave differently in each path.

If you're modifying signing flows, message handling, or queue cleanup logic,
test in both popup and sidebar mode.
