# Code Style -- Freighter Extension

## Prettier Configuration

The project uses Prettier (`.prettierrc.yaml`) with the following settings:

- **Quotes:** double quotes (`singleQuote: false`)
- **Indentation:** 2 spaces (`tabWidth: 2`)
- **Print width:** 80 characters
- **Trailing commas:** all (`trailingComma: "all"`)
- **Semicolons:** always (`semi: true`)
- **Arrow parens:** always (`arrowParens: "always"` — `(x) => x`, never
  `x => x`)
- **Bracket spacing:** true (`{ foo }` not `{foo}`)
- **Prose wrap:** always

## ESLint Configuration

Flat config (`eslint.config.js`) with:

- **Parser:** `@typescript-eslint/parser`
- **Plugins:** React, React Hooks, JSX A11y, Import, TypeScript ESLint
- **Key rules:**
  - `semi` -- error (semicolons required)
  - `react-hooks/rules-of-hooks` -- error
  - `react-hooks/exhaustive-deps` -- warn
  - `react/prop-types` -- off (TypeScript replaces prop-types)
  - `import/no-unresolved` -- warn

## Import Ordering

External packages first, then internal modules. This is a team convention only;
no ESLint `import/order` rule enforces it. Keep imports organized like this:

```typescript
// 1. External packages (react, redux, i18next, design system)
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useTranslation } from "react-i18next";
import { Button } from "@stellar/design-system";

// 2. Internal @shared/* packages
import { sendMessageToBackground } from "@shared/api/internal";
import { SERVICE_TYPES } from "@shared/constants/services";

// 3. Internal popup/* modules
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
```

Note: `@shared/*` packages are internal despite the `@` prefix -- group them
with internal imports. `@stellar/design-system` is an external package; treat it
like `react` or `react-redux`.

## Enum Conventions

### Enum Naming (Two Patterns)

The codebase uses two naming patterns for enums. Follow the established
convention:

| Pattern                  | When                                             | Examples                                                                                          |
| ------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| **SCREAMING_SNAKE_CASE** | Constants, service types, routes, network enums  | `SERVICE_TYPES`, `EXTERNAL_SERVICE_TYPES`, `ROUTES`, `NETWORKS`, `OPERATION_TYPES`, `STEPS`       |
| **PascalCase**           | Domain types, status enums, classification enums | `ActionStatus`, `WalletType`, `AccountType`, `RequestState`, `SecurityLevel`, `NetworkCongestion` |

### Enum Values

All enums use **string values** — no numeric enums in the codebase:

```typescript
// SCREAMING_SNAKE enum with SCREAMING_SNAKE values
export enum SERVICE_TYPES {
  GET_ACCOUNT_HISTORY = "GET_ACCOUNT_HISTORY",
  LOAD_SETTINGS = "LOAD_SETTINGS",
}

// PascalCase enum with PascalCase values
export enum ActionStatus {
  IDLE = "IDLE",
  PENDING = "PENDING",
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
}

// PascalCase enum with display-name values
export enum WalletType {
  LEDGER = "Ledger",
}

// SCREAMING_SNAKE enum with kebab-case values (for CSS/URL identifiers)
export enum STEPS {
  SELECT_ASSET = "select-asset",
  SET_AMOUNT = "set-amount",
}
```

### const enum vs enum

Never use `const enum` — all 37+ enums in the codebase are standard runtime
enums.

### Prefer Enums Over Union Type Aliases

When you have a finite set of named string values, use an enum, not a union
type:

```typescript
// BAD — union type for a finite set
type SwapStatus = "pending" | "confirming" | "completed" | "failed";
type InputType = "crypto" | "fiat";
type AssetVisibility = "visible" | "hidden";
type NotificationType = "warning" | "info";

// GOOD — enum
enum SwapStatus {
  Pending = "pending",
  Confirming = "confirming",
  Completed = "completed",
  Failed = "failed",
}
```

The codebase has ~4 remaining union types that should be enums (`InputType`,
`AssetVisibility`, `NotificationType`, `PillType`). Don't add more.

## Type vs Interface

Follow this pattern (observed in ~200+ type definitions):

| Use             | When                                         | Example                                                                                                           |
| --------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **`interface`** | Object shapes with known properties          | `interface Response { ... }`, `interface UserInfo { ... }`                                                        |
| **`type`**      | Unions, intersections, aliases, mapped types | `type ExternalRequest = ExternalRequestToken \| ...`, `type MigratableAccount = Account & { keyIdIndex: number }` |

## No Magic Numbers

Extract all numeric literals into named SCREAMING_SNAKE_CASE constants:

```typescript
// BAD
const fee = amount * 0.003;
if (retries > 5) { ... }
setTimeout(() => setDidSaveFail(false), 750);

// GOOD
const FEE_RATE = 0.003;
const MAX_RETRIES = 5;
const SAVE_FEEDBACK_DELAY_MS = 750;
```

**Currently well-extracted:** Storage keys (34 constants in
`localStorageTypes.ts`), queue timeouts (`QUEUE_ITEM_TTL_MS`,
`CLEANUP_INTERVAL_MS`), image loader timeout (`DEFAULT_TIMEOUT_MS`).

**Still hardcoded in codebase:** Some `setTimeout` delays (500ms debounce, 750ms
feedback) and `setInterval` values. Extract these when modifying those files.

## No Loose Strings

### User-Facing Strings

All user-facing text must be wrapped in `t()` from `react-i18next`. Both English
and Portuguese translations required.

### Error Messages

Error messages in catch blocks are currently hardcoded strings (e.g.,
`"Failed to scan site"`, `"Failed to scan transaction"`). There is no
centralized error constants file. When adding new error messages, use
descriptive string literals — but consider extracting to a constants file for
shared messages.

### Storage Keys

All `chrome.storage` keys must use constants from
`extension/src/constants/localStorageTypes.ts` — never hardcoded strings.

### Action Type Strings

The reducer action types (`"FETCH_DATA_START"`, `"FETCH_DATA_SUCCESS"`,
`"FETCH_DATA_ERROR"`) are string literals in the shared reducer. This is
acceptable for the shared `useReducer` pattern, but Redux slice action types
should always use `createSlice` (which auto-generates them).

## Function Style

Arrow functions dominate (~85%). Function declarations are used rarely:

```typescript
// STANDARD — arrow function export (85% of codebase)
export const getAccountBalances = async (publicKey: string) => { ... };
export const useNetworkFees = () => { ... };

// ACCEPTABLE — function declaration for complex utilities (15% of codebase)
export function cleanupQueue(responseQueue: ResponseQueue) { ... }
```

Both styles are acceptable. Don't refactor between them.

## JSX Return Style

Multi-line JSX wrapped in parentheses. Single-expression returns may omit
parens:

```typescript
// Single expression — implicit return OK
const Loading = () => <div className="loading" />;

// Multi-line — always use parentheses
const AccountHeader = () => {
  return (
    <div className="account-header">
      <h1>{t("Account")}</h1>
      <BalanceDisplay />
    </div>
  );
};
```

## Boolean Naming

Use `is`, `has`, or `should` prefixes consistently:

```typescript
// CORRECT
const isConnected = true;
const hasInitialized = false;
const shouldShowWarning = true;
const isMainnet = network === NETWORKS.PUBLIC;
const isHttpsDomain = url.startsWith("https");
const hasValidMemo = memo.length > 0;

// WRONG — missing prefix
const connected = true; // Should be isConnected
const initialized = false; // Should be hasInitialized
```

## Event Handler Naming

Props use `on` prefix, internal handlers use `handle` prefix:

```typescript
// Props: on + Event
interface Props {
  onClick: () => void;
  onSelect: (asset: Asset) => void;
  onClose: () => void;
}

// Internal handlers: handle + Action
const handleClick = () => { ... };
const handleApprove = () => { ... };
const handleTokenLookup = () => { ... };
```

## Naming Conventions Summary

| Category                   | Convention                       | Example                                  |
| -------------------------- | -------------------------------- | ---------------------------------------- |
| Components                 | PascalCase directory + index.tsx | `AccountHeader/index.tsx`                |
| Functions / variables      | camelCase                        | `getAccountBalances`, `isConnected`      |
| Constants                  | SCREAMING_SNAKE_CASE             | `NETWORKS`, `QUEUE_ITEM_TTL_MS`          |
| File names (helpers/hooks) | camelCase                        | `useNetworkFees.ts`, `getSiteFavicon.ts` |
| Enums (constants)          | SCREAMING_SNAKE_CASE             | `SERVICE_TYPES`, `ROUTES`                |
| Enums (domain types)       | PascalCase                       | `ActionStatus`, `SecurityLevel`          |
| Booleans                   | `is/has/should` prefix           | `isMainnet`, `hasInitialized`            |
| Event props                | `on` prefix                      | `onClick`, `onSelect`                    |
| Event handlers             | `handle` prefix                  | `handleClick`, `handleApprove`           |

## Pre-commit Hooks

Runs via Husky (`.husky/pre-commit`):

1. **Translation build** -- `addTranslations.sh` regenerates locale files and
   stages them
2. **pretty-quick --staged** -- formats staged files with Prettier

Note: `lint-staged` config exists in `package.json` but is not invoked by the
current hook.

## Destructuring Patterns

Inline parameter destructuring is the dominant pattern (75% of components):

```typescript
// PREFERRED — inline destructuring (75%)
const AccountCard = ({ balance, network, onSelect }: AccountCardProps) => { ... };

// ACCEPTABLE — separate destructuring (25%)
const AccountCard = (props: AccountCardProps) => {
  const { balance, network } = props;
};
```

For selectors, destructure the result:

```typescript
// PREFERRED
const { balances, status } = useSelector(accountBalancesSelector);

// LESS COMMON
const balances = useSelector((state) => state.accountBalances.balances);
```

Renaming during destructuring (~12% of destructuring operations):

```typescript
const { data: balanceData, error: fetchError } = response;
```

## Optional Chaining and Nullish Coalescing

The codebase uses `&&` (659 occurrences) more than `?.` (405 occurrences). Both
are acceptable:

```typescript
// Both patterns used — pick whichever reads better
const name = account?.name; // optional chaining (405 occurrences)
const name = account && account.name; // logical AND (659 occurrences)
```

`??` (nullish coalescing) is underutilized (41 occurrences vs `||`). Prefer `??`
for new code when you need to preserve `0` or `""`:

```typescript
// PREFERRED for new code
const timeout = config.timeout ?? DEFAULT_TIMEOUT;

// LEGACY — still common but treats 0 and "" as falsy
const timeout = config.timeout || DEFAULT_TIMEOUT;
```

## Export Patterns

Named exports dominate (95-97%). Default exports are rare (~17 occurrences):

```typescript
// STANDARD — named export (97%)
export const AccountHeader = () => { ... };
export const getBalance = async () => { ... };

// RARE — default export (3%, mostly layout components)
export default View;
```

Barrel files (index.ts re-exports) exist but are not heavily used (~15-20
instances). Most imports go directly to source files.

## Component Prop Types

Separate Props interface is preferred (60%) over inline (40%):

```typescript
// PREFERRED — separate interface (60%)
interface AccountCardProps {
  balance: Balance;
  network: string;
  onSelect: (account: Account) => void;
}
const AccountCard = ({ balance, network, onSelect }: AccountCardProps) => { ... };

// ACCEPTABLE — inline for simple props (40%)
const Loading = ({ size }: { size: number }) => { ... };
```

Do NOT use `React.FC<Props>` — only 17 occurrences remain (legacy). Use plain
typed params:

```typescript
// WRONG — legacy pattern
const MyComponent: React.FC<Props> = ({ title }) => { ... };

// CORRECT — modern pattern
const MyComponent = ({ title }: Props) => { ... };
```

## Conditional Rendering

`&&` pattern dominates for conditional rendering (169 files):

```typescript
// MOST COMMON — logical AND
{isLoading && <Loading />}
{error && <ErrorMessage text={error} />}

// USED FOR EITHER/OR — ternary
{isLoading ? <Loading /> : <AccountList items={accounts} />}
```

Early returns for loading/error states (~15-20 files):

```typescript
if (!data) return <Loading />;
if (error) return <ErrorMessage />;
return <AccountList items={data} />;
```

## Array/Object Operations

- `.map()` preferred over `.forEach()` (1.3:1 ratio, 162 vs 124 occurrences)
- Spread `{ ...obj }` overwhelmingly preferred over `Object.assign` (554
  occurrences vs <2%)
- `.reduce()` is rare (<10 files) — prefer `.map()` + `.filter()` chains
- Template literals are near-universal (99%+) — never use string concatenation

## Async Patterns

`async/await` is the universal pattern (>97%). `.then().catch()` is legacy
(<3%):

```typescript
// STANDARD
const data = await fetchBalance(publicKey);

// LEGACY — avoid for new code
fetchBalance(publicKey).then(data => { ... }).catch(e => { ... });
```

`try/catch` wraps whole functions (60%) or specific operations (40%).
`Promise.allSettled` preferred over `Promise.all` for robustness.

## Type Assertions and Generics

Always use `as Type` syntax (TSX files forbid angle-bracket `<Type>` syntax):

```typescript
const payload = action.payload as ErrorMessage; // CORRECT
const payload = <ErrorMessage>action.payload; // WRONG in TSX
```

Prefer descriptive generic names over single letters:

```typescript
// PREFERRED (50+ files)
function fetchData<TResponse>(url: string): Promise<TResponse> { ... }

// ACCEPTABLE for simple generics (15 files)
function identity<T>(value: T): T { ... }
```

Common utility types in use: `Pick<>` (30 files), `Omit<>` (40 files),
`Partial<>` (30 files), `Record<>` (15 files), `keyof`/`typeof` (167 occurrences
in 71 files).

## TypeScript Strictness

- `any` exists in ~330 occurrences (mostly test files). Avoid in production
  code. Use `unknown` instead.
- `unknown` has low adoption (41 occurrences) — prefer it over `any` for new
  code
- `as unknown as Type` double-cast: only 13 occurrences (acceptable in tests
  only)

## CSS/SCSS Patterns

110 SCSS files using BEM naming with kebab-case:

```scss
.AccountDetail {
  &__wrapper { ... }
  &__balance-info { ... }
  &__action-button { ... }
}
```

Design system tokens: use `var(--sds-clr-*)` CSS variables and `pxToRem()` mixin
from `styles/utils.scss`. Never use raw pixel values or hardcoded colors.

## Test File Patterns

- File naming: always `.test.ts` / `.test.tsx` (never `.spec.ts`)
- Structure: `describe("feature")` + `it("should...")` (universal — 922 test
  cases across 95 files)
- Setup: `beforeEach` in 88 of 95 test files (93%)
- Assertions: `expect().toBe()` for primitives, `expect().toEqual()` for objects

## Comments

Comments are intentionally sparse (~2-5 per 500 lines). Don't add unnecessary
comments.

- **JSDoc:** Only on exported types/interfaces in shared packages
- **Inline comments:** Only for non-obvious logic
- **TODOs:** Must reference a GitHub issue (`// TODO(#1234): description`)
- **No license headers** — files begin directly with imports
