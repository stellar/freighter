# Performance -- Freighter Extension

Based on analysis of 224 component files. Current performance score: **5.9/10**.

## CRITICAL: Complete Implementations First

**Performance patterns are optimizations WITHIN complete implementations, not
replacements.**

When asked to create a component that needs derived state:

1. **First** produce the complete React component with UI, props interface, and
   rendering logic
2. **Then** apply performance optimizations (createSelector, useMemo,
   useCallback, React.memo)

```typescript
// WRONG — only selectors, no component
export const selectTotalBalance = createSelector([...], ...);
// Missing: the actual component that USES these selectors

// CORRECT — complete implementation with performance optimizations
// 1. Memoized selectors (performance layer)
const selectTotalBalance = createSelector([balancesSelector], (balances) => ...);

// 2. Props interface (type safety)
interface DashboardProps {
  title: string;
}

// 3. Complete component (UI layer)
export const Dashboard = ({ title }: DashboardProps) => {
  const totalBalance = useSelector(selectTotalBalance);
  const formattedBalance = useMemo(() => formatBalance(totalBalance), [totalBalance]);

  return (
    <div className="Dashboard">
      <h1>{title}</h1>
      <span>{formattedBalance}</span>
    </div>
  );
};
```

**Never produce only selectors when a component is requested.**

## React.memo -- CRITICAL GAP

Only **1 memo() usage** in the entire popup codebase (`AccountAssets/AssetIcon`
with custom `shouldAssetIconSkipUpdate` comparator). This is a critical
performance gap.

**RULE: Components rendered in lists or receiving frequently-changing parent
props MUST use `React.memo()`.**

Components that should be memoized:

- All list item components (TokenList items, AssetRows, OperationsKeyVal)
- AccountTabs, AccountHeader sub-components
- ManageAssetRows children

```typescript
// REQUIRED for list-rendered components
export const AssetRow = memo(
  ({ asset, onSelect }: AssetRowProps) => { ... },
  (prev, next) => isEqual(prev.asset, next.asset),
);
```

## useMemo -- 13 occurrences across 7 files (GOOD)

Currently used for:

- Conditional computations (muxed checks, contract validation)
- Debounced function creation
- Object creation in dependencies

**RULE: Wrap in useMemo when:**

1. Computing derived values from expensive operations (parsing, formatting,
   asset lookups)
2. Creating objects/arrays that are passed as props to memoized children
3. Values used as useEffect dependencies that would otherwise change every
   render

```typescript
// REQUIRED — computed value passed as prop
const formattedBalances = useMemo(
  () => balances.map((b) => formatBalance(b, network)),
  [balances, network],
);

// NOT NEEDED — simple primitive
const isMainnet = network === NETWORKS.PUBLIC;
```

## useCallback -- 15 occurrences across 9 files (MODERATE)

**RULE: ANY callback passed as a prop MUST be wrapped in useCallback.**

```typescript
// REQUIRED — passed to child component
const handleSelect = useCallback(
  (asset: Asset) => { dispatch(selectAsset(asset)); },
  [dispatch],
);

// CRITICAL ANTI-PATTERN — 130 inline arrows found in codebase
// WRONG:
<AssetList onClick={() => handleClick(asset)} />

// CORRECT:
const onClick = useCallback(() => handleClick(asset), [asset]);
<AssetList onClick={onClick} />
```

**High-priority files needing useCallback refactoring:**

- `AccountAssets/index.tsx` — 10+ inline handlers
- `ManageAssetRows/ChangeTrustInternal/index.tsx` — 10 inline handlers
- `AccountHeader/index.tsx` — 10+ inline handlers

## Inline Functions in JSX -- CRITICAL (130 occurrences)

**130 inline arrow functions** across 54 files. **15 inline style objects**
across 8 files.

**RULE: Never create inline functions inside .map() or list renders. Extract to
useCallback.**

```typescript
// WRONG — creates new function per render per item
{balances.map((b) => (
  <Row onClick={() => handleClick(b.canonical)} key={b.canonical} />
))}

// CORRECT
const handleRowClick = useCallback((canonical: string) => {
  handleClick(canonical);
}, [handleClick]);

{balances.map((b) => (
  <Row onClick={handleRowClick} canonical={b.canonical} key={b.canonical} />
))}
```

## Selector Memoization -- createSelector in 4 files (GOOD)

`createSelector` from reselect is used in `remoteConfig.ts`, `settings.ts`,
`cache.ts`, `accountServices.ts`. 161 `useSelector` calls across 81 files.

**RULE: All derived/computed state MUST use `createSelector`. Never compute
inline in components.**

```typescript
// CORRECT — memoized selector
export const selectFormattedBalances = createSelector(
  [selectBalances, selectNetwork],
  (balances, network) => balances.map((b) => formatBalance(b, network)),
);

// WRONG — recomputes every render
const formatted = balances.map((b) => formatBalance(b, network));
```

## useEffect Dependencies -- 48 eslint-disable-next-line

48 `react-hooks/exhaustive-deps` suppressions across the codebase.

**RULE: Every eslint-disable for exhaustive-deps MUST have a comment explaining
WHY.**

```typescript
// ACCEPTABLE — documented intentional mount-only effect
useEffect(() => {
  fetchInitialData();
  // eslint-disable-next-line react-hooks/exhaustive-deps — intentional mount-only fetch
}, []);

// WRONG — bare suppression
useEffect(() => {
  fetchData(publicKey, network);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [publicKey]);
```

## Code Splitting -- 0 React.lazy (MISSED OPPORTUNITY)

No `React.lazy` or `Suspense` usage.

**RULE: Lazy-load components not needed on initial render:**

- Debug views (`Debug.tsx`, `IntegrationTest.tsx`)
- Heavy modal/drawer components
- Detail views that load on navigation

```typescript
const Debug = React.lazy(() => import("popup/views/Debug"));

// In router:
<Suspense fallback={<Loading />}>
  <Route path={ROUTES.debug} element={<Debug />} />
</Suspense>
```

## Context Usage -- EXCELLENT (3 contexts only)

Only 3 React contexts exist (`InputWidthContext`, `AccountTabsContext`, `View`).
All hold simple primitive values. Do not add more contexts for data state — use
Redux.

## Key Props -- 4 index-as-key anti-patterns

4 files use array index as key. Fix these:

- `GrantAccess/index.tsx`
- `SignMessage/index.tsx`
- `TransactionDetail/index.tsx`
- `ConfirmMnemonicPhrase/index.tsx`

**RULE: Use stable unique identifiers as keys, not array indices.**

## useReducer + Redux Dispatch Separation

For complex async flows, separate local UI loading state from global Redux
state:

- Use `useReducer` for local component state (loading spinners, form validation,
  step tracking)
- Use Redux dispatch for global state changes (account data, network state,
  transaction results)

## Performance Priority Actions

| Priority | Action                                            | Impact                       |
| -------- | ------------------------------------------------- | ---------------------------- |
| **P0**   | Add React.memo() to list item components          | 30-40% fewer re-renders      |
| **P0**   | Convert 130 inline arrow functions to useCallback | Stabilize reference equality |
| **P1**   | Add React.lazy for debug/modal views              | Reduce initial bundle        |
| **P1**   | Document all 48 exhaustive-deps suppressions      | Prevent future bugs          |
| **P2**   | Add useMemo for computed values in map() renders  | Prevent recomputation        |
