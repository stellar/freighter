# Git & PR Workflow -- Freighter Extension

## Main Branch

The primary branch is `master`. All feature work branches from and merges back
to `master`.

## Branch Naming

Use descriptive prefixes:

| Prefix     | Use Case                   | Example                        |
| ---------- | -------------------------- | ------------------------------ |
| `feature/` | New functionality          | `feature/token-swap-ui`        |
| `fix/`     | Bug fixes                  | `fix/balance-display-rounding` |
| `chore/`   | Maintenance, config, deps  | `chore/upgrade-webpack`        |
| `bugfix/`  | Alternative bug fix prefix | `bugfix/content-script-race`   |

## Commit Messages

- Start with an action verb in present tense: **Add**, **Fix**, **Update**,
  **Improve**, **Remove**, **Refactor**
- Keep the subject line concise (under 72 characters)
- PR number is auto-added by GitHub on squash merge

```
Add token swap confirmation dialog
Fix balance rounding for very small amounts
Update webpack to v5.90
Refactor background message handler registration
```

## Pull Request Expectations

- **Focused scope** -- one concern per PR. Split large changes into stacked PRs.
- **Screenshots** for any UI changes (before/after)
- **Self-review** -- review your own diff before requesting reviews
- **Tests** for new features and bug fixes
- **Cross-browser testing** -- verify in both Chrome and Firefox
- **Translations updated** -- run `yarn build:extension:translations` and commit
  locale changes

## CI on Pull Requests

Two workflows run automatically on every PR:

1. **`runTests.yml`** -- runs Jest unit tests and Playwright e2e tests
2. **`codeql.yml`** -- runs CodeQL security analysis

Both must pass before merging.

## Release Branches

Freighter uses release branches to manage versioned releases:

| Branch              | Purpose                                                        |
| ------------------- | -------------------------------------------------------------- |
| `release`           | Active release branch created by the release workflow          |
| `emergency-release` | Hotfix branch for releasing critical fixes from older versions |

## Release Process

Releases are managed by the `newRelease.yml` GitHub Actions workflow:

1. Manual dispatch triggers the workflow with `appVersion` parameter (e.g.,
   `5.12.0`)
2. Workflow creates a `release` (or `emergency-release`) branch
3. Bumps `package.json` version and `manifest.json` version on the release
   branch
4. Opens a PR into the release branch for version updates
5. After merge, `submitProduction.yml` publishes to stores and creates the
   GitHub release

## Submission Workflows

Submission workflows by channel:

- **`submitProduction.yml`** -- single workflow that handles both Chrome Web
  Store upload and Firefox AMO submission in the same job, then creates the
  semver git tag and GitHub release
- **`submitBeta.yml`** -- beta/preview submission
- **npm** -- `deployFreighterApiProduction.yml` publishes
  `@stellar/freighter-api` to the npm registry
