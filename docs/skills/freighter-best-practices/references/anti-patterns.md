# Anti-Patterns -- Freighter Extension

Common mistakes to watch for during code review and development.

## 1. Suppressing exhaustive-deps

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
```

This indicates tight coupling between hooks and external state, or an
intentional override of the dependency array. When encountered during code
review, investigate why the suppression is needed.

**For new code:** fix the dependency array instead of suppressing the warning.
Refactor the hook to accept stable references, or use `useCallback`/`useMemo` to
stabilize dependencies.

**If truly needed:** add a comment explaining WHY the suppression is necessary.
A bare `eslint-disable` without explanation is not acceptable.

## 2. Non-null Assertions on Optional Data

```typescript
// WRONG: crashes silently if icons[asset] is undefined
const icon = icons[asset]!;
```

Always handle the missing case explicitly:

```typescript
// CORRECT
const icon = icons[asset];
if (!icon) {
  return <DefaultIcon />;
}
```

## 3. Type Assertion Workarounds

```typescript
// WRONG: forced cast indicates incomplete types
const payload = action?.payload as typeof action.payload & { extra?: string };
```

This pattern works around incomplete type definitions. Fix the types at the
source instead of casting at the usage site. Update the action creator's return
type, the thunk's generic parameters, or the slice's state type.

## 4. Module-Level State in Background

```typescript
// WRONG: this variable will be lost when the MV3 worker restarts
let cachedData = {};

export const handler = () => {
  cachedData.foo = "bar"; // lost on next restart
};
```

MV3 service workers are ephemeral. Chrome can terminate and restart them at any
time. Any variable declared outside a function will be reset.

**Use `browser.storage.session`** for ephemeral data or
**`browser.storage.local`** for persistent data.

## 5. Direct browser.runtime.sendMessage from Popup

```typescript
// WRONG: bypasses the shared API layer
browser.runtime.sendMessage({ type: SERVICE_TYPES.GET_DATA });
```

Always use the `sendMessageToBackground()` wrapper from
`@shared/api/helpers/extensionMessaging`:

```typescript
// CORRECT
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
await sendMessageToBackground({
  activePublicKey: null,
  type: SERVICE_TYPES.GET_DATA,
});
```

Prefer `browser.*` APIs from `webextension-polyfill` for cross-browser
functionality. In popup code, still route through the shared helper instead of
calling the runtime directly.

## 6. Hardcoded URL Paths in Navigation

```typescript
// WRONG
navigate("/account/send");
```

Use the `ROUTES` enum and `navigateTo()` helper:

```typescript
// CORRECT
navigateTo(ROUTES.sendPayment, navigate);
```

## 7. Inline Object/Function Creation in JSX Props

```typescript
// WRONG: new object/function on every render, defeats memo()
<AssetList
  filter={{ type: "native" }}
  onSelect={(asset) => handleSelect(asset)}
/>
```

Extract to `useMemo` and `useCallback`:

```typescript
// CORRECT
const filter = useMemo(() => ({ type: "native" }), []);
const onSelect = useCallback((asset) => handleSelect(asset), [handleSelect]);
<AssetList filter={filter} onSelect={onSelect} />
```

## 8. Non-Serializable Objects in Redux Store

```typescript
// WRONG: Stellar SDK objects contain methods and circular references
state.transaction = new Transaction(xdr);
```

Store serializable representations only:

```typescript
// CORRECT: store the XDR string, reconstruct the object when needed
state.transactionXdr = transaction.toXDR();
```

## 9. Silent Error Swallowing

```typescript
// WRONG: error is completely lost
try {
  await riskyOperation();
} catch (e) {
  // do nothing
}
```

At minimum, report to Sentry:

```typescript
// CORRECT
try {
  await riskyOperation();
} catch (error) {
  captureException(error);
}
```

## 10. TODO Comments Without Tracking

```typescript
// TODO: refactor this later
```

If leaving a TODO, create a GitHub issue and reference it:

```typescript
// TODO(#1234): refactor balance calculation to use BigNumber
```

This ensures TODOs are tracked and not forgotten.

## 11. Identifying Assets by Code

An asset's identity is the pair `(code, issuer)` -- or, for a contract token,
its contract id. Asset codes are not unique: more than one asset can share a
code, so a bare code comparison never establishes that two assets are the same
asset, or that an asset is the native lumen.

```typescript
// WRONG: a code alone doesn't identify the asset
if (token.code === "XLM") { ... }

// CORRECT: use the predicate for what you're holding
if (isNativeAsset(asset)) { ... }
```

Use the predicate that matches what you have in hand:

| What you hold                                             | Use                                               |
| --------------------------------------------------------- | ------------------------------------------------- |
| an SDK `Asset`, or `{ code, issuer }`                     | `isNativeAsset(asset)`                            |
| a balance object                                          | `isNativeBalance(balance)`                        |
| a canonical id, a Horizon `asset_type`, or a `token.type` | `isNativeAssetId(id)`                             |
| a contract id                                             | `isNativeContract(contractId, networkPassphrase)` |
| the native contract id itself                             | `getNativeContractId(networkPassphrase)`          |
| a raw code and issuer, with nothing better available      | `isNativeAssetPair(code, issuer)`                 |

All of these live in `@shared/helpers/assetIdentity.ts`.

Nativeness is only half of it. For anything else that identifies an asset --
equality, map keys, list membership, or a user-visible label -- use the full
canonical from `getCanonicalFromAsset(code, issuer)` in
`@shared/helpers/stellar.ts`, never a bare code. A review row that renders an
amount and a code identifies two different assets identically.

### ESLint Enforcement

The local plugin at `config/eslint-plugin-asset-identity/` enforces this:

- **Rule:** `asset-identity/no-asset-code-comparison` (error level)
- **What it does:** reports a `===`/`!==` comparison with a native sentinel on
  either side: `"XLM"`, `"native"`, the SDK's own native code
  (`Asset.native().code` / `Asset.native().getCode()`), or the identifier names
  `NATIVE_TOKEN_CODE` and `HORIZON_NATIVE_ASSET_TYPE`. The last two name no
  constant that exists anywhere in this codebase today -- they're there so that
  code ported over from the mobile app, which does define them, is covered as
  soon as it lands. Comparing a contract id against
  `Asset.native().contractId(passphrase)` is _not_ reported: in contract space
  that is the sound check.
- **Enforcement scope:** `yarn build:extension` runs ESLint via
  `eslint-webpack-plugin`, whose lint glob is derived from the webpack context.
  That context is `<repo>/extension` under `yarn workspace extension build`, so
  the build gate only covers `extension/` -- a violation there fails the build.
  `@shared/`, the tree the predicates themselves live in, is not covered by that
  gate: today it's only checked when ESLint is run directly from the repo root,
  and there is no root `lint` script that does that automatically. Closing that
  gap is a follow-up, not something the current setup already provides.
- **What it can't do:**
  - It cannot tell which predicate a given shape needs, so choosing the wrong
    one still passes lint.
  - It only visits `===`/`!==` binary expressions, so it is silent on loose
    equality (`==` / `!=`), `switch` / `case "native"`, template literals
    (`` code === `native` ``), `.includes()` / `.indexOf()` / `.startsWith()` /
    `Object.is()`, and a sentinel hoisted into a local constant
    (`const N = "native"; token.type === N`).

  Treat it as a safety net, not a guarantee.

Do not add an `eslint-disable` for this rule. `@shared/helpers/assetIdentity.ts`
is exempt in `eslint.config.js` as a belt-and-braces safeguard, not a necessity
-- that module compares against its own local constants (`NATIVE_ASSET_ID`,
`NATIVE_ASSET_CODE`), which aren't in the rule's identifier list, so the rule
would not fire there regardless. The exemption is deliberate, self-documenting
policy: keep it.
