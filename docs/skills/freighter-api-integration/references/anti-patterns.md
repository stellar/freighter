# Anti-Patterns

Common mistakes in Freighter integrations, drawn from support issues and review
feedback. Each entry is a "don't / do" pair so you can grep for the bad pattern.

## Ignoring the `error` field

```ts
// Don't — silently proceeds with address === ""
const { address } = await getAddress();
buildTx(address);
```

```ts
// Do
const result = await getAddress();
if (result.error) return handleError(result.error);
buildTx(result.address);
```

Every SDK method returns a `{ ...data, error? }` union. See
`references/error-handling.md`.

## Hardcoding the network passphrase

```ts
// Don't — breaks the moment the user is on testnet or a custom network
await signTransaction(xdr, { networkPassphrase: Networks.PUBLIC });
```

```ts
// Do — read it from Freighter right before signing
const { networkPassphrase } = await getNetwork();
await signTransaction(xdr, { networkPassphrase });
```

## Using `window.freighter` directly

```ts
// Don't — undocumented, not part of the public API, prone to breakage
if (window.freighter) await window.freighter.signTransaction(...);
```

```ts
// Do
import { signTransaction } from "@stellar/freighter-api";
await signTransaction(...);
```

The SDK wraps the extension bridge; bypassing it skips version shims and message
validation.

## Calling `setAllowed()` / `requestAccess()` on page load

Popups triggered without a user gesture are blocked by some browsers and feel
invasive to users. Only trigger those from an explicit action (button click).
Read-only methods (`isConnected`, `isAllowed`, `getNetwork`) are fine on load.

## Polling `getAddress()` instead of using `WatchWalletChanges`

```ts
// Don't
setInterval(async () => setAddr((await getAddress()).address), 1000);
```

```ts
// Do
const watcher = new WatchWalletChanges();
watcher.watch(({ address }) => setAddr(address));
useEffect(() => () => watcher.stop(), []);
```

`WatchWalletChanges` only fires the callback on actual change. Your `setState`
will not churn every second.

## Forgetting `watcher.stop()`

The watcher is a `setTimeout` loop. If a component mounts and unmounts without
stopping the watcher, the loop keeps running, holding a closure reference to
your component and messaging the extension forever.

```ts
useEffect(() => {
  const w = new WatchWalletChanges();
  w.watch(handler);
  return () => w.stop(); // critical
}, []);
```

## Trusting the pre-sign address

```ts
// Don't — user may have switched accounts in the popup
const { address } = await getAddress();
const tx = buildTx({ source: address });
const { signedTxXdr } = await signTransaction(tx.toXDR(), opts);
submit(signedTxXdr);
```

```ts
// Do — verify the signer matches the source you built for
const { signedTxXdr, signerAddress, error } = await signTransaction(
  tx.toXDR(),
  { ...opts, address: expectedAddress },
);
if (error) return handleError(error);
if (signerAddress !== expectedAddress) {
  return handleError({ code: 0, message: "Signer does not match source." });
}
```

Passing `opts.address` also tells Freighter to reject the sign if the user has a
different active account.

## Calling SDK methods from the server

```ts
// Don't — returns { error: FreighterApiNodeError } and never does anything
export default async function Page() {
  const { address } = await getAddress();
  return <div>{address}</div>;
}
```

Move any Freighter call into a client component or effect. See the SSR guard
section of `references/error-handling.md`.

## Storing the address as long-lived auth state

A connected address is not a login session. The user can revoke access, lock the
wallet, or switch accounts. Treat the Freighter address as ephemeral UI state —
re-derive it on every relevant action, and use `WatchWalletChanges` to keep it
fresh.

## Assuming `signMessage` returns a `Buffer`

```ts
// Don't — breaks on Freighter v4.x where the return is a base64 string
const sig: Buffer = (await signMessage(msg)).signedMessage!;
```

```ts
// Do — handle both shapes
const { signedMessage } = await signMessage(msg);
const bytes =
  typeof signedMessage === "string"
    ? Buffer.from(signedMessage, "base64")
    : signedMessage;
```

See the `signMessage` section of `references/signing.md`.

## Mixing the direct SDK and stellar-wallets-kit in the same app

Pick one. Using both doubles bundle size, risks version drift, and leads to
split-brain state (two sources of truth for "which account is connected"). See
`references/stellar-wallets-kit.md` for how to pick.
