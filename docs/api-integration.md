# Freighter API Integration

## Connection Flow

```ts
import {
  isConnected,
  isAllowed,
  requestAccess,
  getAddress,
} from "@stellar/freighter-api";

async function connect() {
  const connected = await isConnected();
  if (connected.error || !connected.isConnected) {
    return { error: "Please install Freighter." };
  }

  const allowed = await isAllowed();
  if (allowed.error) return { error: allowed.error.message };

  if (!allowed.isAllowed) {
    const access = await requestAccess();
    if (access.error) return { error: access.error.message };
    return { address: access.address };
  }

  const { address, error } = await getAddress();
  if (error) return { error: error.message };
  return { address };
}
```

- `requestAccess()` opens a popup and returns the address in one call — prefer
  it over `setAllowed()` + `getAddress()`.
- Always check `.error` before using any result. Methods never throw for
  wallet-side failures.
- Trigger `requestAccess()` / `setAllowed()` from a user gesture only, not on
  page load.
- Do not cache the address in localStorage as a login state — re-read via
  `getAddress()` or the watcher.

## Watching for Account / Network Changes

```tsx
import { WatchWalletChanges } from "@stellar/freighter-api";

useEffect(() => {
  const watcher = new WatchWalletChanges(3000); // interval in ms, default 3000
  const { error } = watcher.watch(
    ({ address, network, networkPassphrase, error }) => {
      if (error) return; // user locked wallet or revoked access
      if (!address) return; // empty-address tick that follows an error tick
      setActiveAccount(address);
      setActiveNetwork({ network, networkPassphrase });
    },
  );
  if (error) console.warn("WatchWalletChanges failed (SSR?)", error);
  return () => watcher.stop(); // required — watcher is a polling loop
}, []);
```

- `watcher.stop()` is required on unmount. Omitting it leaks timers and keeps
  messaging the extension.
- `watch()` returns `{ error? }` synchronously — on SSR it returns
  `{ error: FreighterApiNodeError }` immediately without starting the loop.
- Do not set the polling interval below 1000ms.
- One watcher per app is enough — share it via context rather than creating
  multiple.

## Signing Transactions

```ts
import { getNetwork, signTransaction } from "@stellar/freighter-api";

// Read passphrase from Freighter right before signing — never hardcode Networks.PUBLIC.
const { networkPassphrase } = await getNetwork();
const result = await signTransaction(tx.toXDR(), {
  networkPassphrase,
  address: expectedAddress, // pins which account must sign
});
if (result.error) return handleError(result.error);
// Verify signer — user may have switched accounts during the popup.
if (result.signerAddress !== expectedAddress) {
  return handleError({ code: 0, message: "Signer does not match source." });
}
const signedTx = TransactionBuilder.fromXDR(
  result.signedTxXdr,
  networkPassphrase,
);
```

- If `error` is set, `signedTxXdr` is an empty string — always guard before
  using it.
- `signTransaction` does not auto-request access; run the connection flow first.

## Signing Messages

```ts
import { signMessage } from "@stellar/freighter-api";

const result = await signMessage("hello", {
  networkPassphrase,
  address: expectedAddress,
});
if (result.error) return handleError(result.error);
// SDK v3 returns Buffer | null; v4 returns base64 string | null.
const signedMessage =
  typeof result.signedMessage === "string"
    ? Buffer.from(result.signedMessage, "base64")
    : result.signedMessage;
```

- `signMessage` auto-requests access if not yet allowed.
- Verify `result.signerAddress === expectedAddress` if account pinning matters.

## Signing Auth Entries (Soroban)

```ts
import { signAuthEntry } from "@stellar/freighter-api";

const result = await signAuthEntry(authEntryXdr, {
  networkPassphrase,
  address: expectedAddress,
});
if (result.error) return handleError(result.error);
// result.signedAuthEntry is XDR string | null
```

- `signAuthEntry` auto-requests access if not yet allowed.

## Adding a Token

```ts
import { addToken } from "@stellar/freighter-api";

const result = await addToken({
  contractId: "C...", // Soroban token contract address
  networkPassphrase, // optional; defaults to active network
});
if (result.error) return handleError(result.error);
// result.contractId echoes back the added contract
```

## Network Details (for RPC endpoints)

```ts
import { getNetwork, getNetworkDetails } from "@stellar/freighter-api";

// For passphrase only (signing):
const { networkPassphrase } = await getNetwork();

// For Horizon + Soroban RPC endpoints too:
const { networkPassphrase, networkUrl, sorobanRpcUrl } =
  await getNetworkDetails();
```

## stellar-wallets-kit (Multiple Wallets)

```ts
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  FreighterModule,
} from "@creit.tech/stellar-wallets-kit";

const kit = new StellarWalletsKit({
  network: WalletNetwork.PUBLIC,
  selectedWalletId: FREIGHTER_ID,
  modules: [new FreighterModule()],
});

kit.setWallet(FREIGHTER_ID);
const { address, error } = await kit.getAddress();
```

- Wrap all SWK calls in `try/catch` — unlike the direct SDK, SWK may throw on
  user rejection.
- `WalletNetwork` enum values are passphrase strings
  (`WalletNetwork.PUBLIC === "Public Global Stellar Network ; September 2015"`).
- Do not install `@stellar/freighter-api` alongside SWK — it is already bundled.

## Error Handling

Every method resolves to
`{ ...data, error?: { code: number, message: string } }`.

| code | When                                 |
| ---- | ------------------------------------ |
| `-4` | User declined the prompt             |
| `-1` | Extension error or SSR (no `window`) |

In SSR / Node, every method returns `{ error: { code: -1 } }` immediately — safe
to import but gate calls with `"use client"` or inside `useEffect`.

```ts
import { isBrowser } from "@stellar/freighter-api";
if (!isBrowser) return; // guard SSR paths manually if needed
```
