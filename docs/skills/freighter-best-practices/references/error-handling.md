# Error Handling -- Freighter Extension

## Async Thunks

All async thunks must catch errors and use `rejectWithValue` to propagate them
through Redux:

```typescript
export const submitTransaction = createAsyncThunk(
  "transactionSubmission/submit",
  async (xdr: string, { rejectWithValue }) => {
    try {
      const result = await sendTransaction(xdr);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue({ errorMessage: error.message });
      }
      return rejectWithValue({ errorMessage: "Unknown error" });
    }
  },
);
```

Handle rejected cases in extra reducers:

```typescript
builder.addCase(submitTransaction.rejected, (state, action) => {
  state.status = ActionStatus.ERROR;
  state.error = (action.payload as ErrorMessage)?.errorMessage;
});
```

## Background Handlers

Background message handlers must never throw. Always return structured response
objects:

```typescript
// CORRECT: return result or error objects
export const handleGetBalance = async (publicKey: string) => {
  try {
    const balance = await fetchBalance(publicKey);
    return { result: balance };
  } catch (error) {
    captureException(error);
    return { error: "Failed to fetch balance" };
  }
};

// WRONG: throwing from a handler
export const handleGetBalance = async (publicKey: string) => {
  const balance = await fetchBalance(publicKey); // throws on failure
  return balance;
};
```

Use `captureException()` from Sentry for unexpected errors that should be
tracked.

## ErrorBoundary

The popup wraps its component tree in a class-based `ErrorBoundary` at
`popup/components/ErrorBoundary/`:

- Implements `getDerivedStateFromError` to catch render errors
- Implements `componentDidCatch` to report errors to Sentry
- Displays a fallback UI when a render crash occurs
- This is the only class component in the codebase -- React does not support
  error boundaries as functional components

## Network Errors

Horizon transaction submission can return specific error codes that need
user-friendly mapping:

| Horizon Error Code    | Meaning                                    |
| --------------------- | ------------------------------------------ |
| `op_underfunded`      | Insufficient balance for the operation     |
| `tx_insufficient_fee` | Fee too low for current network conditions |
| `op_no_destination`   | Destination account does not exist         |

These are parsed by the `getResultCodes()` helper and mapped to translated
user-facing messages.

## Error Type Hierarchy

- **`FreighterApiDeclinedError`** -- thrown when the user declines a dApp
  request (signing, access). This is an expected error, not a bug.
- **`ErrorMessage` type** -- `{ errorMessage: string }` used as the payload for
  thunk rejections via `rejectWithValue`.

## Sentry Integration

- `captureException()` for unexpected errors in handlers and async operations
- Error boundaries catch and report render crashes automatically
- Do not call `captureException()` for expected errors (user cancellation,
  invalid input)
- Never swallow errors silently -- at minimum, report to Sentry if the error is
  unexpected
