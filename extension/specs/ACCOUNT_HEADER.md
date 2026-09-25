# Account Header Restructure Spec

## Overview

Home's header becomes the mobile app's 72px top row: an account chip on the
left, and QR + connected-apps buttons on the right. The two dropdown menus it
used to carry — account options (the three dots) and the network globe — are
deleted, and what lived in them moves to a sheet, to Settings, or nowhere.

**Design source:** Figma `lcdj2ucnJ2BfvRvsLboBNC` ("Varial"), node `1443:166677`.
Layout and information architecture only; colors and type stay on existing
tokens.

## Where Everything Went

| Was                                 | Now                                                  |
| ----------------------------------- | ---------------------------------------------------- |
| Three-dot menu → Copy address       | Account sheet, copy action                           |
| Three-dot menu → Account details    | Header QR button (`ROUTES.viewPublicKey`)            |
| Three-dot menu → Settings           | Account sheet, gear (top-left)                       |
| Three-dot menu → Share feedback     | Settings → Support & About → Leave Feedback          |
| Globe → network list                | Settings → Network (already a `<select>`; no new UI) |
| Globe → latest connection + remove  | Connected apps sheet                                 |
| Globe → Connected apps              | Header connected-apps button → sheet                 |
| Account name row (under the header) | The chip, in the header                              |

`AccountHeaderModal` had exactly one importer (`AccountHeader`) and is deleted
with both dropdowns.

## The Three Surfaces

### `AccountChip`

`components/account/AccountChip/` — identicon, account name, chevron. Opens the
account sheet.

It keeps the **`account-view-account-name`** test id rather than taking a new
one: e2e already clicked that element to reach the wallet list, so the twelve
existing call sites keep working unchanged. `account-chip` is added for the
cases that want the whole control.

### `AccountSheet`

`components/account/AccountSheet/` — the former `views/Wallets` screen, which
already matched the sheet mock almost exactly (identicon, name, address, the
same four actions, divider, list, Add wallet). The hook and stylesheet moved
with it; only the chrome changed.

Three body states, not overlays: `list | rename | add`.

The screen this replaces rendered `RenameWallet` and `AddWallet` as
absolutely-positioned layers. That cannot work inside a sheet — `SlideupModal`
sets `will-change: transform`, making it a containing block for `position:
fixed` descendants, and it measures its height from in-flow content only, so an
overlay is both clipped and invisible to the measurement. `AddWallet` therefore
lost its `SubviewHeader` + `View.Content` and renders as a bare row list, the
same strip-the-nested-`View` treatment Discover needed.

**Switching accounts closes the sheet first.** Home renders `<Loading />` while
the new account loads, which unmounts the sheet anyway; closing first keeps that
from reading as a flicker.

### `ConnectedAppsSheet`

`components/account/ConnectedAppsSheet/` — the former
`views/ManageConnectedApps`, minus its network `<select>`.

`allowList` is a prop from Home rather than something the sheet fetches, so it
calls `onRefresh()` on open as well as after every disconnect. Without the
on-open call, a dApp connecting while the popup sits open would not appear until
Home happened to refetch. `refreshAppData` dispatches `FETCH_DATA_SUCCESS`
directly without passing through `LOADING`, so this refresh does **not** unmount
the sheet — unlike the account switch above.

## Routes

`ROUTES.wallets` and `ROUTES.manageConnectedApps` keep their strings and become
`<Navigate to={ROUTES.account} replace />`. The popup restores its last route on
reopen, so a live popup sitting on either path must land on Home rather than a
blank screen. Same treatment as `manage-assets` in the assets workstream, and it
keeps `metrics/views.ts` mappings valid (its test asserts every `ROUTES` value
has one).

## Header Layout

`View.AppHeader` renders three boxes and `View__inset--inline` gives each
`flex: 1`. With no page title, the empty centre box would take a third of a
360px row and squeeze the chip, so `AccountHeader/styles.scss` overrides them
under `.View__inset--account-header`: left flexes and may shrink, centre is
`display: none`, right is content-sized. `isAccountHeader` has exactly one
consumer, so those rules are scoped in practice despite the class belonging to
`View`.

### A long account name must not widen the popup

The extension popup has no viewport of its own — Chrome sizes the window to fit
the document's content — so anything that inflates the intrinsic width inflates
the window. The chip's name is `white-space: nowrap`, which made its min-content
width the whole unwrapped string: a 24-character name (`ACCOUNT_NAME_MAX_LENGTH`)
took the popup from 360px to **572px**.

`min-width: 0` on the name and a zero `flex-basis` both fail here — measured, not
assumed. They let the text shrink during flex layout, but the intrinsic-sizing
pass still walks into it. Only `contain: inline-size`, on
`.View__header__box--left`, takes the contents out of that calculation. The box
keeps `flex-grow: 1`, so it still receives the space the buttons leave and the
chip ellipsizes within it.

This is the same failure and the same fix as the Discover trending carousel.
Any future header content that can grow unboundedly needs the same treatment.

## Network Switching Moved — and Took a Guarantee With It

The header's network switcher called
`fetchData({ useAppDataCache: false, shouldForceBalancesRefresh: true })`, so
every network change refetched balances. `changeNetwork` in Settings does not,
and `balanceData`/`historyData` are network-keyed, so switching away and back
re-served whatever was cached for that network.

The guarantee moves into `ducks/cache.ts`, onto the existing
`settings/changeNetwork/fulfilled` `extraReducer` that already cleared
`tokenLists`. Putting it there means **every** entry point gets it, not just the
Settings screen. `loadAccount.test.ts`'s "Switches network and fetches correct
balances while clearing cache" is the regression test.

## Testing Notes

Test ids preserved so existing specs keep working: `account-header`,
`account-view-account-name`, `account-view-total-balance`, `wallets-header`,
`wallets-header-qr`, `wallets-header-copy`, `wallets-header-explorer`,
`wallets-header-edit-name`, `add-wallet`, `disconnect-all`,
`connected-apps-empty`, `go-to-discover`.

New: `account-chip`, `account-sheet-settings`, `AccountSheet`,
`AccountSheet__close`, `ConnectedAppsSheet`, `ConnectedAppsSheet__close`,
`account-header-qr-button`, `account-header-connected-apps-button`,
`settings-network-link`, `network-settings-select`.

`e2e-tests/helpers/network.ts` holds `goToSettings`, `switchNetwork` and
`goToConnectedApps`. **They address rows by test id, not by label** — the
Portuguese login helper goes through `switchNetwork`, and both the Settings page
title and the "Network" row are translated. `ListNavLink` gained a `dataTestId`
prop for this.

The `<select>` options are `NETWORK_NAMES` ("Main Net"), not the display names
the old dropdown showed ("Mainnet"); the helper maps between them.

### Screenshot baselines are weak here

The affected baselines are 1280×720 with the app occupying a ~848px column on a
flat dark background, so a total redesign of the content measures ~2.7% changed
pixels against `maxDiffPixelRatio: 0.02`. That is close enough to the threshold
that the same test passes or fails on incidental differences (a banner, toast
timing, worker count). Treat a pass on these as uninformative until the
baselines are refreshed.

## Known Gaps

- **Per-network connected apps.** The old screen let you disconnect apps on a
  network you were not currently on; the mock has no picker, so that is gone.
  The data is untouched — switching networks in Settings brings it back. Raised
  for design rather than silently kept.
- **No active-network indicator.** Following the mocks, nothing in the header
  names the active network, so a user on Testnet gets no persistent signal.
- **Header icon.** The mock's connected-apps glyph is a rounded square with a
  detached corner circle, which is `Icon.NotificationBox` — the same glyph the
  empty state already used.
