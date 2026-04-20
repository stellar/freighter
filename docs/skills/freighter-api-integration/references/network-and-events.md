# Network and Account Change Handling

Freighter does not broadcast events. To react to the user switching accounts or
networks, you poll via `WatchWalletChanges`. To read the current network once,
use `getNetwork` or `getNetworkDetails`.

## `getNetwork()` vs `getNetworkDetails()`

```ts
const net = await getNetwork();
// { network: "PUBLIC", networkPassphrase: "Public Global Stellar Network ; September 2015" }

const details = await getNetworkDetails();
// { network, networkPassphrase, networkUrl, sorobanRpcUrl? }
```

- Use **`getNetwork()`** when you only need the network name / passphrase — for
  example, to pass to `signTransaction`.
- Use **`getNetworkDetails()`** when you also need Horizon (`networkUrl`) or
  Soroban RPC (`sorobanRpcUrl`) endpoints. `sorobanRpcUrl` is optional and
  absent on networks that do not expose one.

**Always read the passphrase from Freighter before signing**, rather than
hardcoding `Networks.PUBLIC` / `Networks.TESTNET` — the user can be on a custom
network.

## `WatchWalletChanges` — polling for account / network switches

Freighter does not push events to dApps. The SDK ships a polling watcher:

```ts
import { WatchWalletChanges } from "@stellar/freighter-api";

// 3000ms default; pass a custom interval in ms.
const watcher = new WatchWalletChanges(3000);

const { error } = watcher.watch(
  ({ address, network, networkPassphrase, error }) => {
    if (error) {
      // User locked the wallet, revoked access, etc.
      return;
    }
    setActiveAccount(address);
    setActiveNetwork({ network, networkPassphrase });
  },
);
if (error) console.warn("watch failed", error);

// Later, when your component unmounts or the user disconnects:
watcher.stop();
```

**Key details:**

- The callback **fires once on start** with the current state, and then only
  when `address`, `network`, or `networkPassphrase` changes — not on every poll.
- `watcher.watch(cb)` returns `{ error? }` synchronously. A successful start
  resolves to `{}`. On Node/SSR it returns `{ error: FreighterApiNodeError }`
  immediately.
- The watcher is a polling loop. **Always call `watcher.stop()`** on unmount or
  disconnect, otherwise it leaks timers and keeps hammering the extension after
  your UI is gone.
- One watcher per app is usually enough. Share it across components via context
  or a singleton rather than instantiating multiple watchers.

## React example

```tsx
import { useEffect, useState } from "react";
import { WatchWalletChanges } from "@stellar/freighter-api";

export function useFreighterWallet() {
  const [state, setState] = useState({ address: "", network: "" });

  useEffect(() => {
    const watcher = new WatchWalletChanges();
    watcher.watch(({ address, network, error }) => {
      if (error) return;
      setState({ address, network });
    });
    return () => watcher.stop();
  }, []);

  return state;
}
```

## Pitfalls

- **Do not set the polling interval below 1000ms.** The watcher opens a message
  channel to the background service worker on every tick. Sub-second polling
  creates noticeable overhead and achieves nothing — humans do not switch
  accounts that fast.
- **Do not assume the first callback is the "connected" event.** The first
  callback just reports current state, which might be an empty address if the
  user has not allowed the origin. Gate your UI on `address` being non-empty.
- **Do not rely on the watcher to prompt for access.** If the user has not
  allowed the origin, the watcher's callback just fires with an error. Run the
  connection flow first (see `references/connection-flow.md`).
