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
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { SERVICE_TYPES } from "@shared/constants/services";

// 3. Internal popup/* modules
import { ROUTES } from "popup/constants/routes";
import { navigateTo } from "popup/helpers/navigate";
```

Note: `@shared/*` packages (e.g. `@shared/api`, `@shared/constants`) are
workspace-internal — treat them like `popup/*` imports, not third-party
packages. `@stellar/design-system` is a published external package; group it
with `react` and `react-redux`, not with `@shared/*`.

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
  LOAD_SETTINGS = "LOAD_SETTINGS",
  LOAD_ACCOUNT = "LOAD_ACCOUNT",
}

// PascalCase enum with SCREAMING_SNAKE string values
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
  AMOUNT = "set-amount",
  DESTINATION = "set-destination",
}
```

### const enum vs enum

Never use `const enum` — all enums in the codebase are standard runtime enums.

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

The codebase has a few remaining union types that should be enums (`InputType`,
`AssetVisibility`, `NotificationType`, `PillType`). Don't add more.

## Type vs Interface

Follow this pattern consistently across the codebase:

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

All `browser.storage` keys must use constants from
`extension/src/constants/localStorageTypes.ts` — never hardcoded strings.

### Action Type Strings

The reducer action types (`"FETCH_DATA_START"`, `"FETCH_DATA_SUCCESS"`,
`"FETCH_DATA_ERROR"`) are string literals in the shared reducer. This is
acceptable for the shared `useReducer` pattern, but Redux slice action types
should always use `createSlice` (which auto-generates them).

## Function Style

Arrow functions are the standard. Function declarations are acceptable for
complex utilities:

```typescript
// STANDARD — arrow function export
export const getAccountBalances = async (publicKey: string) => { ... };
export const useNetworkFees = () => { ... };

// ACCEPTABLE — function declaration for complex utilities
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

Inline parameter destructuring is preferred:

```typescript
// PREFERRED — inline destructuring
const AccountCard = ({ balance, network, onSelect }: AccountCardProps) => { ... };

// ACCEPTABLE — separate destructuring
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

Renaming during destructuring is occasionally useful:

```typescript
const { data: balanceData, error: fetchError } = response;
```

## Optional Chaining and Nullish Coalescing

Both optional chaining (`?.`) and logical AND (`&&`) are acceptable — pick
whichever reads better:

```typescript
// Both patterns used — pick whichever reads better
const name = account?.name; // optional chaining
const name = account && account.name; // logical AND
```

Prefer `??` (nullish coalescing) for new code when you need to preserve `0` or
`""`:

```typescript
// PREFERRED for new code
const timeout = config.timeout ?? DEFAULT_TIMEOUT;

// LEGACY — still common but treats 0 and "" as falsy
const timeout = config.timeout || DEFAULT_TIMEOUT;
```

## Export Patterns

Named exports are the standard. Default exports are rare (mostly layout
components):

```typescript
// STANDARD — named export
export const AccountHeader = () => { ... };
export const getBalance = async () => { ... };

// RARE — default export (mostly layout components)
export default View;
```

Barrel files (index.ts re-exports) are used sparingly. Most imports go directly
to source files.

## Component Prop Types

Separate Props interface is preferred for complex props:

```typescript
// PREFERRED — separate interface
interface AccountCardProps {
  balance: Balance;
  network: string;
  onSelect: (account: Account) => void;
}
const AccountCard = ({ balance, network, onSelect }: AccountCardProps) => { ... };

// ACCEPTABLE — inline for simple props
const Loading = ({ size }: { size: number }) => { ... };
```

Do NOT use `React.FC<Props>` (legacy). Use plain typed params:

```typescript
// WRONG — legacy pattern
const MyComponent: React.FC<Props> = ({ title }) => { ... };

// CORRECT — modern pattern
const MyComponent = ({ title }: Props) => { ... };
```

## Conditional Rendering

`&&` pattern is most common for conditional rendering:

```typescript
// STANDARD — logical AND
{isLoading && <Loading />}
{error && <ErrorMessage text={error} />}

// USED FOR EITHER/OR — ternary
{isLoading ? <Loading /> : <AccountList items={accounts} />}
```

Early returns for loading/error states are also used:

```typescript
if (!data) return <Loading />;
if (error) return <ErrorMessage />;
return <AccountList items={data} />;
```

## Array/Object Operations

- `.map()` is preferred over `.forEach()`
- Spread `{ ...obj }` is overwhelmingly preferred over `Object.assign`
- `.reduce()` is rare — prefer `.map()` + `.filter()` chains
- Template literals are standard — never use string concatenation

## Async Patterns

`async/await` is the standard. `.then().catch()` is legacy:

```typescript
// STANDARD
const data = await fetchBalance(publicKey);

// LEGACY — avoid for new code
fetchBalance(publicKey).then(data => { ... }).catch(e => { ... });
```

`try/catch` wraps whole functions or specific operations. `Promise.all` is
commonly used. Prefer `Promise.allSettled` when you need partial results and
failures should not short-circuit the batch.

## Type Assertions and Generics

Always use `as Type` syntax (TSX files forbid angle-bracket `<Type>` syntax):

```typescript
const payload = action.payload as ErrorMessage; // CORRECT
const payload = <ErrorMessage>action.payload; // WRONG in TSX
```

Prefer descriptive generic names over single letters:

```typescript
// PREFERRED
function fetchData<TResponse>(url: string): Promise<TResponse> { ... }

// ACCEPTABLE for simple generics
function identity<T>(value: T): T { ... }
```

Common utility types in use: `Pick<>`, `Omit<>`, `Partial<>`, `Record<>`,
`keyof`, and `typeof`.

## TypeScript Strictness

- `any` exists in the codebase (mostly test files). Avoid in production code.
  Use `unknown` instead.
- Prefer `unknown` over `any` for new code
- Double-cast `as unknown as Type` is acceptable in tests only

## CSS/SCSS Patterns

SCSS files use BEM naming with kebab-case:

```scss
.AssetDetail {
  &__wrapper { ... }
  &__balance-info { ... }
  &__actions { ... }
}
```

Design system tokens: use `var(--sds-clr-*)` CSS variables and `pxToRem()` mixin
from `styles/utils.scss`. Never use raw pixel values or hardcoded colors.

## Test File Patterns

- File naming: always `.test.ts` / `.test.tsx` (never `.spec.ts`)
- Structure: `describe("feature")` + `it("should...")` (universal standard)
- Setup: Use `beforeEach` to initialize test state
- Assertions: `expect().toBe()` for primitives, `expect().toEqual()` for objects

## Comments

Comments are intentionally sparse (~2-5 per 500 lines). Don't add unnecessary
comments.

- **JSDoc:** Only on exported types/interfaces in shared packages
- **Inline comments:** Only for non-obvious logic
- **TODOs:** Must reference a GitHub issue (`// TODO(#1234): description`)
- **No license headers** — files begin directly with imports
