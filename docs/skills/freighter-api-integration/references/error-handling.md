# Error Handling

Every `@stellar/freighter-api` method resolves with a discriminated-union-ish
shape:

```ts
type Result<T> = T & { error?: FreighterApiError };

interface FreighterApiError {
  code: number;
  message: string;
  ext?: string[];
}
```

**Methods never throw for wallet-side failures.** A rejected prompt, locked
wallet, or SSR call all come back as `{ error: {...} }`. If you `await` a method
and do not inspect `error`, you will silently proceed with empty data
(`address: ""`, `signedTxXdr: ""`, etc.) and get a confusing failure downstream.

## Check `error` first, always

```ts
const result = await signTransaction(xdr, opts);
if (result.error) {
  // Show a toast, log, retry, whatever — but never read the rest of `result`
  // as if the call succeeded.
  return handleFreighterError(result.error);
}
useSigned(result.signedTxXdr);
```

## Known error shapes

The SDK ships a few constants from `@shared` (referenced internally; you will
see these on the wire):

| Constant                    | `code` | When                                      |
| --------------------------- | ------ | ----------------------------------------- |
| `FreighterApiNodeError`     | `-1`   | Method called in Node / SSR (no `window`) |
| `FreighterApiInternalError` | `-1`   | Extension-side bug or unexpected state    |
| `FreighterApiDeclinedError` | `-4`   | User rejected the prompt                  |

Do not match on `code` alone — `-1` is shared between SSR and internal errors.
Branch on `message` or on context (did you just prompt a popup?) when UX
matters.

## SSR / Node safety

`@stellar/freighter-api` uses `typeof window !== "undefined"` to detect the
browser. In Node, every method returns `{ error: FreighterApiNodeError }`
immediately. Two consequences:

1. **You can safely import the SDK in server components or Next.js pages.**
   Imports do not crash. But you still need to avoid _calling_ the methods on
   the server — they will not do anything useful.
2. **Guard client-only UI with `"use client"` or effect hooks.** Do not call
   Freighter methods in module-top-level code or in server-rendered components.

```tsx
"use client";
import { isConnected } from "@stellar/freighter-api";

export function ConnectButton() {
  useEffect(() => {
    isConnected().then(({ isConnected, error }) => {
      if (error || !isConnected) return;
      // ...
    });
  }, []);
}
```

## Surfacing errors to the user

Map error codes to human messages instead of showing `error.message` verbatim:

```ts
function freighterMessage(error: FreighterApiError): string {
  switch (error.code) {
    case -4:
      return "You declined the request in Freighter.";
    case -1:
      return "Freighter could not complete the request. Try again.";
    default:
      return `Freighter error: ${error.message}`;
  }
}
```

The raw `message` field is fine for logs and telemetry, but for end users you
will generally want to rewrite it in your own voice.

## Do not swallow errors in chained calls

A common anti-pattern:

```ts
// BAD: the address is "" and the bug surfaces later as a signing failure.
const { address } = await getAddress();
const { signedTxXdr } = await signTransaction(buildTx(address).toXDR(), opts);
```

Write each step as a guard:

```ts
const accountResult = await getAddress();
if (accountResult.error) return handleError(accountResult.error);
const signResult = await signTransaction(
  buildTx(accountResult.address).toXDR(),
  opts,
);
if (signResult.error) return handleError(signResult.error);
```
