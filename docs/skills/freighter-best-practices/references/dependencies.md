# Dependencies -- Freighter Extension

## Package Manager

- **Yarn 4.10.0** with workspaces enabled
- Node requirement: **>= 22** (specified in `.nvmrc`)
- Always use `nvm use` or equivalent before running commands to ensure the
  correct Node version

## Workspace Structure

The root `package.json` defines 6 workspaces:

```json
{
  "workspaces": [
    "extension",
    "@stellar/freighter-api",
    "@shared/api",
    "@shared/constants",
    "@shared/helpers",
    "docs"
  ]
}
```

## Dependency Placement

| Dependency Type            | Where to Add                          | Example                                   |
| -------------------------- | ------------------------------------- | ----------------------------------------- |
| Extension runtime deps     | `extension/package.json`              | `react`, `redux`, `stellar-sdk`           |
| freighter-api runtime deps | `@stellar/freighter-api/package.json` | Minimal, SDK-only deps                    |
| Shared module deps         | `@shared/*/package.json`              | Shared utilities                          |
| Dev tooling (shared)       | Root `package.json`                   | `typescript`, `eslint`, `webpack`, `jest` |
| Docs                       | `docs/package.json`                   | Documentation tooling                     |

## @shared Modules

Shared packages are imported as workspace dependencies. Yarn resolves them via
the workspaces configuration:

```json
// extension/package.json
{
  "dependencies": {
    "@shared/api": "1.0.0",
    "@shared/constants": "1.0.0",
    "@shared/helpers": "1.0.0"
  }
}
```

In code, import directly:

```typescript
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { SERVICE_TYPES } from "@shared/constants/services";
```

## Adding Dependencies

1. Identify the correct workspace (see table above)
2. Add from the workspace directory:

```bash
cd extension && yarn add some-package
# or from root:
yarn workspace extension add some-package
```

3. For dev dependencies shared across workspaces, add to root:

```bash
yarn add -D some-dev-tool
```

## Lavamoat

Lavamoat provides a script allowlist in `package.json` for supply-chain
security. It restricts which packages can run install scripts (postinstall,
preinstall, etc.). When adding a package that requires install scripts, you may
need to update the Lavamoat configuration.

## npmMinimalAgeGate

The `.yarnrc.yml` file includes:

```yaml
npmMinimalAgeGate: 7d
```

This means newly published packages must be at least 7 days old before Yarn will
allow installation. This protects against supply-chain attacks using freshly
published malicious packages. If you need to install a package published less
than 7 days ago, you will need to wait or temporarily override this setting
(with team approval).

## Upgrading Dependencies

1. Run `yarn install` to resolve and update the lockfile
2. Verify workspace symlinks are intact (`@shared/*` packages resolve correctly)
3. Build all workspaces -- some depend on others:

```bash
yarn build        # builds all workspaces in dependency order
```

4. Run the full test suite to verify nothing broke:

```bash
yarn test:ci
yarn test:e2e
```

5. Check for breaking changes in changelogs, especially for `stellar-sdk`,
   `react`, and `webpack`
