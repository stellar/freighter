# Bottom Tab Bar Implementation Spec

## Overview

The popup gets a persistent bottom tab bar with three destinations — History,
Home and Discover — matching the Freighter mobile app. Home and History are
already routes; Discover is promoted from a sheet to a route so it can be one.

This replaces the Home header's clock and globe nav buttons and its Discover
pill, which are deleted when the header is restructured.

## Where It Lives

**File:** `src/popup/Router.tsx`

`<TabBar />` renders as a sibling of `<Outlet />` inside `Layout`, and `<View>`
gains a `hasTabBar` prop that adds bottom clearance to the content inset.

### Why not a `View.Footer` variant

`View.Footer` is a flex child of `.View`, positioned by `justify-content:
space-between`. Twenty-one screens already render their own footer holding
primary action buttons (`AddToken`, `GrantAccess`, `UnlockAccount`,
`SignAuthEntry`, `NetworkForm`, …). Making the bar a footer variant would put
every one of them a single prop away from stacking two 80px bars inside a 600px
popup.

Home is also `View--scrollable` — the _document_ scrolls, not an inner
scrollport — so a flex-child footer would scroll off the bottom of the token
list rather than staying put.

### Why not a nested layout route

Visibility is not purely a function of route shape. It also depends on window
mode (`isSidebarMode()`, `isFullscreenMode()`, standalone signing popups) and on
`APPLICATION_STATE.APPLICATION_ERROR`, which `Layout` already short-circuits on.
A layout route would still need those predicates inside it, leaving shell
decisions in two places. `Layout` already concentrates exactly this kind of
decision (`isAppLayout` from `NO_APP_LAYOUT_ROUTES`, `isScrollableView` from
`pathname === "/"`).

## Route Gating

**File:** `src/popup/constants/tabBar.ts`

```ts
export const TAB_BAR_ROUTES: readonly ROUTES[] = [
  ROUTES.account,
  ROUTES.accountHistory,
  ROUTES.discover,
];

export const shouldShowTabBar = (pathname: string): boolean => ...
```

An **allow-list, not a deny-list**: default-off means the 21 footer-owning
screens need no changes and cannot regress. The mode predicates stay in `Layout`
so `shouldShowTabBar` remains pure and unit-testable.

All three paths are exact — no splats — so string equality is sufficient.
Contrast with `manageAssets`, `swap` and `send`, which are splat routes; none is
a tab, so the limitation never bites. This constraint is documented on the
constant.

## Positioning

`.TabBar` is `position: fixed; bottom: 0; left: 0; right: 0`. No ancestor sets
`transform`, `filter` or `backdrop-filter`, so the containing block is the
viewport and the bar stays put whether the route scrolls the document (Home) or
an inner scrollport (History, Discover). Because it is fixed, its position in the
tree is irrelevant; it is mounted inside `<View>` only so it inherits `.View`'s
custom properties.

Clearance comes from a `View--has-tab-bar` class on the `View` root. Home
overrides `View__content`/`View__inset` to `overflow: visible` and does its
clearance on `.multi-pane-slider__pane` instead, so it is handled separately.

## Navigation Semantics

Tabs navigate with `<NavLink replace end>`.

- **`replace`** — `BackButton` (`src/popup/basics/buttons/BackButton/index.tsx`)
  calls `navigate(-1)` with no depth guard and backs almost every non-tab screen
  via `SubviewHeader`. With push, a user who taps between tabs and then drills
  into a detail screen would walk backwards through tab switches instead of
  returning to a tab root.
- **`end`** — mandatory on Home. `ROUTES.account` is `"/"`, and without `end`
  react-router treats it as a prefix match, so Home would render active on every
  route.
- **No-op when already active.** Re-navigating to `/` remounts `<Account />`,
  which fires `fetchData({ useAppDataCache: false })` — a full account refetch
  for a tap that should do nothing.

Home navigates to bare `ROUTES.account` with no query string. `ActiveTabProvider`
is mounted inside the `/` route element, so `activeTab` is local to that mount
and resets to `TOKENS` on every Home entry regardless; carrying `?tab=` would
produce a URL that outlives the user's intent.

## Window Modes

| Mode                      | Bar shown? | Notes                                                                                                                  |
| ------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------- |
| Popup (360×600)           | Yes        | The default case                                                                                                       |
| Sidebar (`?mode=sidebar`) | Yes        | The long-lived browsing surface, where persistent History and Discover earn their keep                                 |
| Fullscreen (up to 1100px) | Yes, inset | An inner `.TabBar__inset` is centred at `max-width: 480px` so the bar reads as a control rather than a stretched strip |
| Standalone signing popups | No         | Opened directly onto signing routes, none of which is in the allow-list — no special-casing needed, but assert it      |

Hiding the bar in fullscreen would **strand History and Discover**: their old
triggers are deleted by the header restructure and there would be no replacement.

`isFullscreenMode()` reads `window.innerHeight`/`innerWidth` at call time and is
**not reactive to resize**. That does not bite while the answer is "show in both",
but any future fullscreen-only branch must use `helpers/useIsLargeWidthScreen`,
which is reactive.

## Interaction With the Floating Sheet

The only contract between the tab bar and `SlideupModal` is one custom property:

```scss
--app--bottom-offset: 3.75rem; /* set by the shell when the bar is visible */
```

`SlideupModal` derives its bottom inset, its `max-height` and its exit transform
from that token, so the sheet lifts above the bar and shrinks its ceiling
automatically. Nothing else is shared; either change can land first.

## The Floating Add Button

`FloatingAddButton` is `position: fixed; bottom: 24px` and would sit under the
bar. It lifts to `calc(var(--tab-bar--height) + 12px)`, with the pane
`padding-bottom` following. The designs keep this pill floating above the bar
rather than docking it into the list.

## Vertical Budget

At `POPUP_HEIGHT = 600`, Home's chrome is ~334px, leaving ~266px of list — about
4.1 `BalanceRow`s at ~64px each.

The bar costs **60px**. The header restructure returns **~28px** (the account
name row and its gap move into the 72px top row, which is already paid for).
Net ≈ **−32px**, roughly half a token row: ~4.1 rows down to ~3.6.

## Key Constants

| Constant               | Value                                 | Location                    |
| ---------------------- | ------------------------------------- | --------------------------- |
| `--tab-bar--height`    | `3.75rem` (60px)                      | `popup/styles/global.scss`  |
| `--z-index--tab-bar`   | `15`                                  | `popup/styles/global.scss`  |
| `--app--bottom-offset` | `3.75rem` when visible, else `0`      | `popup/styles/global.scss`  |
| `TAB_BAR_ROUTES`       | `[account, accountHistory, discover]` | `popup/constants/tabBar.ts` |
| `ROUTES.discover`      | `"/discover"`                         | `popup/constants/routes.ts` |

`--z-index--tab-bar: 15` sits above `--z-index--banner` (10) so the add-token
pill cannot cover the bar, and below `--z-index-tooltip` (20) and
`--z-index-modal` (30) so sheets, dropdowns and backdrops still cover it.

## Metrics

Add `[ROUTES.discover]` to `SCREEN_BY_ROUTE` in `popup/metrics/views.ts`, or the
navigate handler `captureException`s on every visit. **Delete
`trackDiscoverViewed`** from `popup/metrics/discover.ts` at the same time: it
already emits `screen.viewed` from a mount effect, so leaving both doubles every
Discover open.

`METRIC_NAMES.historyFullHistoryOpened` keeps firing but its `source` changes
from `"account_header"` to `"tab_bar"` — any dashboard filtering the old value
goes to zero.

## Testing Notes

Existing test ids are **reused** on the tab items rather than replaced:
`nav-link-account-history` (12 e2e call sites) and
`account-header-discover-button` (7). That keeps their meaning ("the thing you
click to reach history") and avoids ~19 edits.

`TabBar.test.tsx` must assert the bar does **not** render on a footer-owning
screen (`/sign-transaction`, `/add-token`, `/grant-access`) — that is the
regression most likely to slip in silently.

Nothing in the e2e suite covers sidebar mode, so it needs a manual pass.

## File Reference

| File                                                         | Role                                                 |
| ------------------------------------------------------------ | ---------------------------------------------------- |
| `src/popup/constants/tabBar.ts`                              | `TAB_BAR_ROUTES`, `shouldShowTabBar()`               |
| `src/popup/components/TabBar/index.tsx`                      | The bar: three `NavLink`s, active state, metrics     |
| `src/popup/Router.tsx`                                       | Mounts `<TabBar />` in `Layout`; defines `/discover` |
| `src/popup/basics/layout/View/index.tsx`                     | `hasTabBar` prop → bottom clearance                  |
| `src/popup/styles/global.scss`                               | Height, z-index and `--app--bottom-offset` tokens    |
| `src/popup/components/SlideupModal/styles.scss`              | Consumes `--app--bottom-offset`                      |
| `src/popup/components/account/FloatingAddButton/styles.scss` | Lifts above the bar                                  |
| `src/popup/views/Discover/index.tsx`                         | Promoted from sheet to route                         |
| `src/popup/metrics/views.ts`                                 | `SCREEN_BY_ROUTE` entry for `/discover`              |
