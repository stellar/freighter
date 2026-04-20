# Anti-Patterns -- Freighter Extension

Common mistakes to watch for during code review and development.

## 1. Suppressing exhaustive-deps

```typescript
// eslint-disable-next-line react-hooks/exhaustive-deps
```

Found ~50 times in the codebase. This indicates tight coupling between hooks and
external state, or an intentional override of the dependency array.

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

**Use `chrome.storage.session`** for ephemeral data or
**`chrome.storage.local`** for persistent data.

## 5. Direct chrome.runtime.sendMessage from Popup

```typescript
// WRONG: bypasses the shared API layer
chrome.runtime.sendMessage({ type: SERVICE_TYPES.GET_DATA });
```

Always use the `sendMessageToBackground()` wrapper from `@shared/api/internal`:

```typescript
// CORRECT
import { sendMessageToBackground } from "@shared/api/internal";
await sendMessageToBackground({ type: SERVICE_TYPES.GET_DATA });
```

The wrapper provides consistent typing, response parsing, and error handling.

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
