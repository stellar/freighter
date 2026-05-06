# Testing -- Freighter Extension

## Jest Unit Tests

- Test files live in `__tests__/` directories alongside the source they test
- Environment: JSDOM (`jest-fixed-jsdom`)
- Coverage collected from `src/**/*.{ts,tsx,mjs}`
- Configuration in the root `jest.config.js`

### Mocking Pattern

Use typed mocks via `jest.requireMock` for type-safe mock access:

```typescript
const { someFunction } = jest.requireMock<
  typeof import("@shared/api/internal")
>("@shared/api/internal");
```

Factory functions create consistent test fixtures:

- `makeStore()` -- creates a Redux store with test-specific initial state
- `store.getState()` -- standard Redux method to get a snapshot of the current
  store state

### Testing Redux

1. Create a test store with `configureStore()` and the real reducers
2. Dispatch thunks against the test store
3. Assert state changes via `store.getState()`

```typescript
const store = makeStore({
  preloadedState: {
    /* ... */
  },
});
await store.dispatch(fetchAccountBalances("GABC..."));
expect(store.getState().accountBalances.status).toBe(ActionStatus.SUCCESS);
```

### Testing Background Handlers

Call handler functions directly with mock parameters:

```typescript
const response = await handleSignTransaction({
  transactionXdr: "AAAA...",
  publicKey: "GABC...",
});
expect(response).toEqual({ signedTransaction: "signed-xdr" });
expect(captureException).not.toHaveBeenCalled();
```

## Playwright End-to-End Tests

- **Browser:** Chromium only
- **Viewport:** 1280x720
- **Timeout:** 15 seconds per test
- **Retries:** 5
- **Workers:** 8 locally, 4 in CI

### Fixtures

The `test-fixtures.ts` file provides:

- A browser context with the extension loaded
- Extension ID extraction from the service worker URL
- Direct access to the service worker for background testing

### Snapshot Testing

- Snapshots stored in `[testName].test.ts-snapshots/`
- Update snapshots with `--update-snapshots` flag

## Running Tests

| Command                   | Description                          |
| ------------------------- | ------------------------------------ |
| `yarn test`               | Run Jest in watch mode               |
| `yarn test:ci`            | Run Jest for CI (no watch, coverage) |
| `yarn test:e2e`           | Run all Playwright e2e tests         |
| `yarn test:e2e --headed`  | Run e2e with visible browser         |
| `yarn test:e2e --ui`      | Run e2e with Playwright UI mode      |
| `PWDEBUG=1 yarn test:e2e` | Run e2e with Playwright debugger     |

## CI Pipeline

- **`runTests.yml`** -- runs Jest unit tests and Playwright e2e tests on every
  pull request
- **`codeql.yml`** -- runs CodeQL security analysis on every pull request
