# Connection and Access Flow

Freighter uses a three-stage model: **installed → allowed → account**. Get each
stage right and the "Connect Wallet" button just works; skip a stage and you end
up with silent failures, infinite spinners, or rogue permission prompts.

## The correct order

```ts
import {
  isConnected,
  isAllowed,
  setAllowed,
  requestAccess,
  getAddress,
} from "@stellar/freighter-api";

async function connect() {
  // 1. Is the extension installed and reachable?
  const connected = await isConnected();
  if (connected.error || !connected.isConnected) {
    return { error: "Please install Freighter." };
  }

  // 2. Has this origin been allowed before?
  const allowed = await isAllowed();
  if (allowed.error) return { error: allowed.error.message };

  // 3. If not, prompt the user. `requestAccess` both asks permission and
  //    returns the active account address in a single round-trip.
  if (!allowed.isAllowed) {
    const access = await requestAccess();
    if (access.error) return { error: access.error.message };
    return { address: access.address };
  }

  // 4. Already allowed — just read the active address.
  const { address, error } = await getAddress();
  if (error) return { error: error.message };
  return { address };
}
```

## What each method really does

- **`isConnected()`** — resolves true when the extension is reachable. Fast
  path: checks `window.freighter` synchronously before falling back to a message
  round-trip. Safe to call on page load.
- **`isAllowed()`** — asks the extension whether the current origin has
  previously been granted access. Never opens a popup.
- **`setAllowed()`** — opens the "Connect" popup. Returns
  `{ isAllowed: boolean }`. Does **not** return an address; call `getAddress()`
  afterwards if you need one.
- **`requestAccess()`** — opens the "Connect" popup **and** returns
  `{ address }` in one call. Prefer this over `setAllowed() + getAddress()` when
  you need the address immediately after connecting.
- **`getAddress()`** — returns the active account address. Fails with a
  Freighter error if the user has not allowed the origin, so gate it behind
  `isAllowed()` or `requestAccess()`.

## Pitfalls

- **Do not poll `isConnected` in a tight loop.** Call it once on mount. Use
  `WatchWalletChanges` (see `network-and-events.md`) if you need to react to
  account changes over time.
- **Do not cache the address in localStorage as "the user is logged in".** The
  user can switch accounts or lock the wallet at any time. Always re-read via
  `getAddress()` or `WatchWalletChanges`.
- **Do not call `setAllowed()` or `requestAccess()` on page load.** Both open a
  popup. Trigger them from an explicit user gesture (button click) so browsers
  do not block the popup and users do not feel ambushed.
- **Do not skip `isAllowed()` before `getAddress()`.** Calling `getAddress()`
  when the origin is not allowed returns an error, not a popup. Users will not
  see a prompt — your UI will just show an error and they will not know why.
- **`requestAccess()` skips the popup for already-allowed origins when the
  wallet is unlocked.** If the origin is allowed AND the wallet is unlocked, it
  returns the address immediately. If the wallet is locked, a popup opens to
  prompt the user to unlock — even for previously-allowed origins. This is
  expected behavior, not an error.
- **Do not call `getAddress()` more than once per user action.** Cache the last
  known address in component state and re-fetch only when `WatchWalletChanges`
  reports a change. Excessive extension calls add latency and can queue up
  requests against the extension service worker.

## `addToken({ contractId })`

Prompts the user to add a Soroban-asset contract to their Freighter asset list.

```ts
import { addToken } from "@stellar/freighter-api";

const result = await addToken({
  contractId: "CBIELTK6YBZJU5UP2WWQEQ4YKX64VPD9AKHF4C673OPKXQM2TQEP7LB",
  networkPassphrase: networkPassphrase, // read from getNetwork() first
});
if (result.error) return handleError(result.error);
// result.isTokenAdded is true if the user confirmed
```

**Key details:**

- Requires the origin to be allowed first. Run the connection flow before
  calling `addToken` — if the origin is not allowed, it returns an error rather
  than prompting for access.
- `contractId` must be a valid Soroban contract address (C... address).
- The user can decline — `error` will be set with a declined code (`-4`). Always
  check `error` before assuming the token was added.
- `networkPassphrase` should always be read from `getNetwork()` rather than
  hardcoded, so the token is added to the correct network context.
