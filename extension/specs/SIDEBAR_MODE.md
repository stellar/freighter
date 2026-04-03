# Sidebar Mode Implementation Spec

## Overview

Freighter's sidebar mode allows the extension to render in the browser's side panel instead of a popup window. When active, signing requests navigate within the sidebar rather than opening separate popup windows.

## How Sidebar Mode Is Detected

**File:** `src/popup/helpers/isSidebarMode.ts`

```ts
export const isSidebarMode = () =>
  /^(chrome|moz)-extension:$/.test(window.location.protocol) &&
  new URLSearchParams(window.location.search).get("mode") === "sidebar";
```

The URL `index.html?mode=sidebar` is set in the manifest and passed by `openSidebar()`.

## How Sidebar Mode Is Activated

**UI entry point:** `src/popup/components/account/AccountHeader/index.tsx` (lines 185-200)

The account options dropdown (test ID: `account-options-dropdown`) shows a "Sidebar mode" menu item, conditionally rendered only when the browser supports it (`chrome.sidePanel.open` or `browser.sidebarAction.open`).

**Activation function:** `src/popup/helpers/navigate.ts` — `openSidebar()`

- **Chrome:** Calls `chrome.sidePanel.setOptions({ path: "index.html?mode=sidebar" })` then `chrome.sidePanel.open({ windowId })`.
- **Firefox:** Calls `browser.sidebarAction.open()`.
- In both cases, `window.close()` is called afterward to close the popup.

**Manifest config:**

```json
"permissions": ["storage", "alarms", "sidePanel"],
"side_panel": { "default_path": "index.html?mode=sidebar" },
"sidebar_action": {
  "default_panel": "index.html?mode=sidebar",
  "open_at_install": false
}
```

## Architecture: Signing Flow in Sidebar Mode

### 1. Sidebar connects to background

When `isSidebarMode()` returns true, `Router.tsx` mounts `<SidebarSigningListener />`.

**File:** `src/popup/components/SidebarSigningListener/index.tsx`

On mount, the component:

1. Opens a long-lived port to the background: `browser.runtime.connect({ name: "sidebar" })`
2. Sends the window ID to the background: `port.postMessage({ windowId: win.id })`
3. Overrides `window.close()` to navigate to the account route instead of closing the panel
4. Listens for `SIDEBAR_NAVIGATE` messages on the port

### 2. Background registers the sidebar

**File:** `src/background/index.ts` — `initSidebarConnectionListener()` (line 65)

When the background receives a port connection named "sidebar":

1. **Validates the sender** — rejects content scripts (`!port.sender?.tab` check ensures only extension pages connect)
2. Stores the port via `setSidebarPort(port)` (in `src/background/helpers/sidebarPort.ts`)
3. Stores the window ID via `setSidebarWindowId()` when the sidebar sends its first message
4. On disconnect, clears state and schedules a 500ms deferred cleanup (to allow quick sidebar reloads without dropping requests)

### 3. Signing request routing

**File:** `src/background/messageListener/freighterApiMessageListener.ts` — `openSigningWindow()` (line 76)

When a dApp triggers a signing request:

1. Checks `getSidebarWindowId()` — if not null, sidebar is active
2. **Sidebar path:** Sends `{ type: SIDEBAR_NAVIGATE, route: hashRoute }` over the port, then calls `chrome.sidePanel.open()` to focus it. Returns `null` (no popup created).
3. **Popup fallback:** If no sidebar, creates a standalone popup window via `browser.windows.create()`

### 4. Sidebar handles navigation

Back in `SidebarSigningListener`, the port handler receives the `SIDEBAR_NAVIGATE` message:

1. **Route validation:** Only allows navigation to known signing routes (`signTransaction`, `signAuthEntry`, `signMessage`, `grantAccess`, `addToken`, `reviewAuthorization`)
2. **Concurrent request handling:** If the user is already on a signing route, navigates to `ConfirmSidebarRequest` interstitial instead of silently swapping the screen
3. **Otherwise:** Navigates directly to the signing route via React Router

### 5. Concurrent request interstitial

**File:** `src/popup/views/ConfirmSidebarRequest/index.tsx`

Shows "New Signing Request" with two options:

- **Reject:** Extracts the UUID from the pending route's query string, calls `rejectSigningRequest()` to clean up all queues, navigates to account
- **Continue to review:** Navigates to the new signing route (passed via `?next=` query param, validated against open redirect)

## Queue Tracking

**File:** `src/background/helpers/queueCleanup.ts`

`sidebarQueueUuids: Set<string>` tracks which signing requests were routed to the sidebar. When the sidebar disconnects (and doesn't reconnect within 500ms), only these UUIDs are rejected — standalone popup requests have their own `onWindowRemoved` cleanup.

## Key Constants

| Constant                       | Value                        | Location                           |
| ------------------------------ | ---------------------------- | ---------------------------------- |
| `SIDEBAR_PORT_NAME`            | `"sidebar"`                  | `SidebarSigningListener/index.tsx` |
| `SIDEBAR_NAVIGATE`             | `"SIDEBAR_NAVIGATE"`         | `@shared/constants/services.ts`    |
| `ROUTES.confirmSidebarRequest` | `"/confirm-sidebar-request"` | `popup/constants/routes.ts`        |

## "Open Sidebar Mode by Default" — Chrome Only

The Preferences page (`src/popup/views/Preferences/index.tsx`, line 185) has a toggle labeled "Open sidebar mode by default" that makes the extension icon click open the sidebar instead of the popup. This toggle is **only shown on Chrome** — it's gated behind `typeof globalThis.chrome?.sidePanel?.open === "function"`.

**Why it's hidden on Firefox:**

The toggle works by calling `chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })` (in `src/background/index.ts` — `initSidebarBehavior()`, line 217, and `src/background/messageListener/handlers/saveSettings.ts`, line 44). This is a Chrome-only API that tells the browser to open the side panel instead of the popup when the user clicks the extension's toolbar icon.

Firefox has no equivalent API. `browser.sidebarAction` can open/close the sidebar programmatically, but:

1. `sidebarAction.open()` requires a synchronous user gesture (it cannot be called from a background script in response to an action click)
2. There is no `setPanelBehavior` equivalent to redirect action clicks to the sidebar

The setting is persisted in `localStorage` under `IS_OPEN_SIDEBAR_BY_DEFAULT_ID` (`"isOpenSidebarByDefault"`). On Chrome, `initSidebarBehavior()` reads this on startup and applies it via `setPanelBehavior`. On Firefox, the function is a no-op — the comment at line 228 documents this explicitly.

Firefox users can still open sidebar mode manually via the "Sidebar mode" menu item in the account dropdown, or via the browser's native sidebar toggle.

## E2E Testing Limitations

**Playwright cannot test true sidebar mode.** The background's `initSidebarConnectionListener` rejects port connections from pages that have `port.sender.tab` set. In Playwright, the extension page runs in a regular browser tab (not a real side panel), so the port is always rejected. This means:

- `getSidebarWindowId()` is always null in Playwright
- `openSigningWindow()` always falls back to creating popup windows
- The `SidebarSigningListener` component mounts but its port connection is rejected

To properly E2E test sidebar signing flow, Playwright would need to support Chrome's Side Panel API so the extension page runs without a tab context.

**What was tried and why it failed:** We attempted to create sidebar-specific E2E tests by navigating to `?mode=sidebar` in Playwright. While `isSidebarMode()` returns true on the frontend, the background rejects the `SidebarSigningListener` port connection because the page runs in a tab (`port.sender.tab` is set). All signing requests fall back to popup windows, making the tests functionally identical to the existing popup tests. True sidebar E2E tests require either Playwright support for Chrome's Side Panel API, or removing the `!port.sender.tab` guard in the background (which would weaken security).

## File Reference

| File                                                            | Role                                                                             |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/popup/helpers/isSidebarMode.ts`                            | Detects sidebar mode via URL param                                               |
| `src/popup/helpers/navigate.ts`                                 | `openSidebar()` — opens side panel                                               |
| `src/popup/components/SidebarSigningListener/index.tsx`         | Port connection, navigation listener, window.close override                      |
| `src/popup/views/ConfirmSidebarRequest/index.tsx`               | Concurrent request interstitial                                                  |
| `src/popup/Router.tsx`                                          | Conditionally mounts SidebarSigningListener, defines confirmSidebarRequest route |
| `src/popup/components/account/AccountHeader/index.tsx`          | "Sidebar mode" dropdown menu item                                                |
| `src/background/index.ts`                                       | `initSidebarConnectionListener()` — port validation, state management, cleanup   |
| `src/background/helpers/sidebarPort.ts`                         | Global sidebar port state                                                        |
| `src/background/helpers/queueCleanup.ts`                        | `sidebarQueueUuids` set                                                          |
| `src/background/messageListener/freighterApiMessageListener.ts` | `openSigningWindow()` — routes to sidebar or popup                               |
