# Architecture -- Freighter Extension

## Three Runtime Contexts

Freighter runs code in three isolated contexts, each with different lifetimes
and capabilities:

### Popup (`extension/src/popup/`)

- A React single-page application rendered when the user clicks the extension
  icon
- **Lifetime:** created when opened, destroyed when closed -- no persistent
  state in memory
- Communicates with the background via `sendMessageToBackground()` (which wraps
  `browser.runtime.sendMessage`)
- Served from `localhost:9000` during development (hot reload)

### Background Service Worker (`extension/src/background/`)

- A Manifest V3 service worker that handles all privileged operations (key
  management, signing, storage)
- **Lifetime:** ephemeral -- Chrome may terminate it at any time after
  inactivity. All state must be persisted to `chrome.storage`
- Listens for messages from the popup and content scripts via
  `browser.runtime.onMessage`
- Uses `browser.storage.session` to persist the Redux store (including the
  derived hash key) and `browser.storage.local` for the encrypted vault and
  encrypted temporary key material. Decrypted private keys are never written to
  storage -- they are produced on demand during signing.

### Content Script (`extension/src/contentScript/`)

- Injected into every tab at `document_start`
- **Lifetime:** per tab, lives as long as the tab
- Bridges dApp requests from the page to the background: listens for
  `window.postMessage` from the page, forwards valid messages via
  `browser.runtime.sendMessage`
- Filters messages by source (`EXTERNAL_MSG_REQUEST`) and only forwards valid
  `EXTERNAL_SERVICE_TYPES`

## Monorepo Workspaces

```
freighter/
  extension/             -- The browser extension (popup, background, content script)
  @stellar/freighter-api/  -- npm SDK for dApp integration
  @shared/               -- Shared packages
    api/                 -- API helpers (internal messaging, external endpoints)
    constants/           -- Shared constants and enums
    helpers/             -- Utility functions
  docs/                  -- Documentation and skills
  config/                -- Shared build configuration
```

## State Management Patterns

The codebase uses two patterns depending on the scope of the state:

### Redux Toolkit Duck Pattern (Cross-Cutting Global State)

For state shared across multiple components or that must persist across
navigation (account data, settings, cache):

- **`createAsyncThunk`** for all async operations (API calls, background
  messages)
- **`createSlice`** for reducers with immer-based immutable updates
- **`createSelector`** (reselect) for memoized derived state -- never compute
  inline in components
- **`ActionStatus` enum** tracks async lifecycle: `IDLE`, `PENDING`, `ERROR`,
  `SUCCESS`

```typescript
// Example duck structure
export const fetchAccountBalances = createAsyncThunk(
  "accountBalances/fetch",
  async (publicKey: string, { rejectWithValue }) => {
    try {
      const balances = await getBalances(publicKey);
      return balances;
    } catch (error) {
      if (error instanceof Error) {
        return rejectWithValue({ errorMessage: error.message });
      }
    }
  },
);

const accountBalancesSlice = createSlice({
  name: "accountBalances",
  initialState,
  reducers: {
    /* sync reducers */
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccountBalances.pending, (state) => {
        state.status = ActionStatus.PENDING;
      })
      .addCase(fetchAccountBalances.fulfilled, (state, action) => {
        state.status = ActionStatus.SUCCESS;
        state.balances = action.payload;
      })
      .addCase(fetchAccountBalances.rejected, (state, action) => {
        state.status = ActionStatus.ERROR;
        state.error = action.payload?.errorMessage;
      });
  },
});
```

### useReducer + RequestState Pattern (View-Level Local State)

For state scoped to a single view that doesn't need to persist (data-fetching
hooks for specific screens):

- **`useReducer`** with the shared `reducer`/`initialState` from
  `helpers/request.ts`
- **`RequestState` enum** from `constants/request` tracks: `IDLE`, `LOADING`,
  `SUCCESS`, `ERROR`
- Composes existing hooks (e.g., `useGetCollectibles`, `useGetBalances`) for
  data fetching
- Used by 8+ views: Discover, AddCollectibles, GrantAccess, SignMessage,
  RecoverAccount, etc.

```typescript
// Example: view-level data hook
import { initialState, reducer } from "helpers/request";
import { RequestState } from "constants/request";

const useGetScreenData = () => {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    dispatch({ type: "FETCH_DATA_START" });
    fetchData()
      .then((data) => dispatch({ type: "FETCH_DATA_SUCCESS", payload: data }))
      .catch(() => dispatch({ type: "FETCH_DATA_ERROR" }));
  }, []);

  return state;
};
```

**When to use which:** If the data is needed by multiple screens or must survive
navigation, use Redux. If it's a single screen's fetch-and-display lifecycle,
use `useReducer`.

## Background Store Hydration

The background service worker persists the Redux store to survive ephemeral
restarts:

1. Store is saved to `chrome.storage.session` on every change via
   `store.subscribe(() => saveStore(store.getState()))`
2. On startup, the store is hydrated from `chrome.storage.session` using
   `REDUX_STORE_KEY`
3. Firefox fallback: uses `chrome.storage.local` where session storage is
   unavailable

## Component Patterns

- **Functional components only** -- no class components except `ErrorBoundary`
- **View/hook separation** -- complex components split into a view (JSX) and a
  hook (logic)
- **`memo()`** for component memoization. `lodash/isEqual` is available in the
  codebase for deep comparisons where needed

## Cache Duck

A centralized cache duck manages network data:

- Keyed by `[network][publicKey]` for per-account, per-network isolation
- 3-minute expiration enforced by `isCacheValid()` helper
- Prevents redundant API calls when switching between accounts or networks

## Custom Middleware

- **`metricsMiddleware`** -- dispatches analytics events for tracked actions
- **`activePublicKeyMiddleware`** -- detects account mismatch between popup and
  background state

## Navigation

- All routes defined in `ROUTES` enum
- Navigation uses `navigateTo()` helper function
- Never hardcode route paths as strings -- always reference the enum
