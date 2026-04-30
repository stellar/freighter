# Freighter Extension — Quick Start Guide

Evaluate the contributor's machine against all prerequisites for Freighter
(browser extension), install what's missing, and run the initial setup.

For the full contribution guide (conventions, architecture, linting, PR
process), see [CONTRIBUTING.MD](CONTRIBUTING.MD).

## Step 1: Check all prerequisites

Run every check below and collect results. Report all at once — don't stop at
the first failure.

For each tool, try the version command first. If it fails (e.g., sandbox
restrictions), fall back to `which <tool>` to confirm presence.

```bash
# Node.js >= 22
node --version 2>&1 || which node

# nvm (needed for node version management — repo has .nvmrc)
if command -v nvm >/dev/null 2>&1 || test -d "$HOME/.nvm"; then echo "nvm found"; else echo "nvm missing"; fi

# Corepack
corepack --version 2>&1 || which corepack

# Yarn 4.10.0
yarn --version 2>&1 || which yarn

# Browser (at least one needed for testing the extension)
# macOS
if [ "$(uname -s)" = "Darwin" ]; then
  test -d "/Applications/Google Chrome.app" && echo "Chrome: found" || echo "Chrome: not found"
  test -d "/Applications/Firefox.app" && echo "Firefox: found" || echo "Firefox: not found"
else
  # Linux/other
  command -v google-chrome >/dev/null 2>&1 || command -v google-chrome-stable >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1 || command -v chromium-browser >/dev/null 2>&1
  test $? -eq 0 && echo "Chrome: found" || echo "Chrome: not found"
  command -v firefox >/dev/null 2>&1 && echo "Firefox: found" || echo "Firefox: not found"
fi

```

## Step 2: Present results

Show a clear summary:

```
Freighter Extension — Prerequisites Check
==========================================
  Node.js        v22.x.x        >= 22 required        OK
  nvm            found           any                   OK
  Corepack       0.x.x           any                   OK
  Yarn           4.10.0          4.10.0 required       OK
  Chrome         found           at least one browser  OK
  Firefox        not found       (Chrome is enough)    OK
```

## Step 3: Install missing tools

Present the missing tools and ask the user: "I can install [list] automatically.
Want me to proceed?"

If the user confirms, **run the install commands** for each missing tool. After
each install, re-check the version to confirm it succeeded. If an install fails,
report the error and continue with the next tool.

If the user declines, skip to Step 4 and note the missing tools in the final
summary.

**Auto-installable (run after user confirms):**

- **Homebrew** (macOS): Follow the official installation instructions:
  <https://brew.sh/>. If you use the installer script, review it before running.
- **nvm**: Follow the official installation instructions:
  <https://github.com/nvm-sh/nvm#installing-and-updating>. If you use the
  installer script, review it before running. Then source nvm:
  `export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"`
- **Node.js 22**: `nvm install 22`
- **Corepack + Yarn**:
  `corepack enable && corepack prepare yarn@4.10.0 --activate`
- **Chrome**: `brew install --cask google-chrome` (macOS) or install via system
  package manager (Linux)

**Manual — guide the user:**

- If using nvm, create `~/.huskyrc` so pre-commit hooks load the correct Node
  version:
  ```bash
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  ```

## Step 4: Run initial setup

```bash
nvm use               # Switch to Node 22 (.nvmrc)
yarn setup            # Install deps + allow scripts
```

## Step 5: Configure environment

Check if `extension/.env` exists. If not, copy the example and set the backend
URLs:

```bash
cp extension/.env.example extension/.env
```

Set `INDEXER_URL` and `INDEXER_V2_URL` to your running backend instances:

- **V1** →
  [stellar/freighter-backend](https://github.com/stellar/freighter-backend)
  (TypeScript) — follow its README for setup and default local port
- **V2** →
  [stellar/freighter-backend-v2](https://github.com/stellar/freighter-backend-v2)
  (Go) — follow its README for setup and default local port

If `extension/.env` already exists, verify it has both `INDEXER_URL` and
`INDEXER_V2_URL` set.

## Step 6: Verify

```bash
yarn build:extension
```

If the build succeeds, tell the user they're ready:

1. Run `yarn start`
2. Open `chrome://extensions` (or `about:debugging` in Firefox)
3. Load unpacked from `extension/build/`
4. The popup is at `localhost:9000`

If the build fails, read the error and diagnose — common causes are missing
`.env` vars or wrong Node version.

## Step 7: Summary

At the end, produce a final summary:

```
Setup Complete
==============
  Installed: [list of tools installed]
  Configured: extension/.env with backend endpoints

  Ready to run:
  1. yarn start
  2. Load extension/build/ in Chrome (chrome://extensions > Load unpacked)
  3. Popup at localhost:9000
```
