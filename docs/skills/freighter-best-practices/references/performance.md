# Performance -- Freighter Extension

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

## React.memo

**RULE: For new components rendered in lists or hot paths, prefer
`React.memo()`.** The codebase currently has low memo() adoption — this is a
known gap, not the established pattern. Don't refactor existing components to
add memo() unless you are already touching them or there is a measured
performance problem.

```typescript
// Good pattern for list-rendered components
export const AssetRow = memo(
  ({ asset, onSelect }: AssetRowProps) => { ... },
  (prev, next) => isEqual(prev.asset, next.asset),
);
```

## useMemo

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

## useCallback

**RULE: Callbacks passed as props should be wrapped in useCallback** to avoid
causing unnecessary re-renders in memoized children.

```typescript
// Good — passed to child component
const handleSelect = useCallback(
  (asset: Asset) => { dispatch(selectAsset(asset)); },
  [dispatch],
);

// Anti-pattern — inline arrow recreates the function on every render
// WRONG:
<AssetList onClick={() => handleClick(asset)} />

// CORRECT:
const onClick = useCallback(() => handleClick(asset), [asset]);
<AssetList onClick={onClick} />
```

## Inline Functions in JSX

Inline arrow functions inside `.map()` or list renders create a new function
reference on every render, defeating memoization.

**RULE: Extract callbacks used in list renders to useCallback.**

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

## Selector Memoization

**RULE: For non-trivial derived state, prefer `createSelector` over inline
computation in components.** Simple primitive derivations (e.g.
`const isMainnet = network === NETWORKS.PUBLIC`) don't need a selector.

```typescript
// CORRECT — memoized selector
export const selectFormattedBalances = createSelector(
  [selectBalances, selectNetwork],
  (balances, network) => balances.map((b) => formatBalance(b, network)),
);

// WRONG — recomputes every render
const formatted = balances.map((b) => formatBalance(b, network));
```

## useEffect Dependencies

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

## Code Splitting

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

## Context Usage

Only a small number of React contexts exist (`InputWidthContext`,
`AccountTabsContext`, `View`). All hold simple primitive values. Do not add more
contexts for data state — use Redux.

## Key Props

**RULE: Use stable unique identifiers as keys, not array indices.**

## useReducer + Redux Dispatch Separation

For complex async flows, separate local UI loading state from global Redux
state:

- Use `useReducer` for local component state (loading spinners, form validation,
  step tracking)
- Use Redux dispatch for global state changes (account data, network state,
  transaction results)
