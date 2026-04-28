# Signing Transactions, Messages, and Auth Entries

Freighter exposes three signing methods. All return `{ ...data } & { error? }`
and never throw for user rejections — you must check `error`.

## `signTransaction(xdr, opts?)`

Signs a Stellar transaction XDR.

```ts
// Always read the passphrase from Freighter — never hardcode Networks.PUBLIC/TESTNET.
const { networkPassphrase } = await getNetwork();
const { signedTxXdr, signerAddress, error } = await signTransaction(
  tx.toXDR(),
  {
    networkPassphrase,
    address: "GABC...", // optional: pin to a specific account
  },
);
if (error) throw new Error(error.message);
const signedTx = TransactionBuilder.fromXDR(signedTxXdr, networkPassphrase);
```

**Options (source of truth: `@stellar/freighter-api`):**

| Key                 | Type     | Purpose                                                    |
| ------------------- | -------- | ---------------------------------------------------------- |
| `networkPassphrase` | `string` | Bind the signature to a specific network (prevents replay) |
| `address`           | `string` | Require the user to sign with this specific account        |

Always use `networkPassphrase`. Older docs describe a `network` enum option
(`"PUBLIC"`, `"TESTNET"`, ...), but it has been removed from the SDK's transport
layer: `@shared/api/external.ts` declares `let network` locally and never
assigns it from `opts`, so it is always `undefined` in the message sent to the
extension. Passing `network` at runtime has no effect regardless of TypeScript
types. Use `networkPassphrase` exclusively.

**Passing a stale `networkPassphrase`** is one of the most common bugs. If the
user's wallet is on testnet and you pass `Networks.PUBLIC`, Freighter rejects
the sign request. Always read the passphrase from `getNetwork()` right before
signing rather than hardcoding it.

**`signTransaction` does not auto-request access.** Unlike `signMessage` and
`signAuthEntry`, this method does not call `requestAccess` internally. Run the
connection flow (`references/connection-flow.md`) before calling it.

## `signMessage(message, opts?)`

Signs an arbitrary UTF-8 string. **The return shape changes with the extension
version:**

- **Freighter v3.x:** `signedMessage: Buffer | null`
- **Freighter v4.x:** `signedMessage: string | null`

**Options:**

| Key                 | Type     | Purpose                                             |
| ------------------- | -------- | --------------------------------------------------- |
| `networkPassphrase` | `string` | Bind the signature to a specific network            |
| `address`           | `string` | Require the user to sign with this specific account |

Handle both return shapes and verify the signer:

```ts
const { networkPassphrase } = await getNetwork();
const expectedAddress = "GABC..."; // obtained from getAddress() earlier
const { signedMessage, signerAddress, error } = await signMessage(
  "Hello, Stellar",
  { networkPassphrase, address: expectedAddress },
);
if (error || !signedMessage) throw new Error(error?.message ?? "no signature");
// Verify signer even when opts.address is set — belt-and-suspenders.
if (signerAddress !== expectedAddress) {
  throw new Error("Signer does not match expected account.");
}

const signatureBytes =
  typeof signedMessage === "string"
    ? Buffer.from(signedMessage, "base64")
    : signedMessage;
```

`signMessage` auto-calls `requestAccess` if the origin is not yet allowed — the
user will see a connect prompt before the signature prompt.

## `signAuthEntry(entryXdr, opts?)`

Signs a Soroban authorization entry. Same options shape as `signTransaction`.
Returns `{ signedAuthEntry: string | null, signerAddress }`. Like `signMessage`,
auto-requests access if needed.

```ts
// Always read networkPassphrase from Freighter — never hardcode Networks.PUBLIC/TESTNET.
const { networkPassphrase } = await getNetwork();
// expectedAddress must be obtained before this call, e.g. from getAddress()
const { signedAuthEntry, signerAddress, error } = await signAuthEntry(
  authEntry.toXDR("base64"),
  { networkPassphrase, address: expectedAddress },
);
if (error) throw new Error(error.message);
// Verify signer even when opts.address is set — the user may have switched accounts.
if (signerAddress !== expectedAddress) {
  throw new Error("Signer does not match expected account.");
}
```

## After signing

- **Check `error` before using `signedTxXdr`.** If `error` is set, `signedTxXdr`
  is an empty string — submitting it produces a malformed transaction. Always
  guard `if (result.error) return handleError(result.error)` before reading the
  signed output.
- **`signerAddress` is the source of truth.** The user may have switched
  accounts between the time your app read `getAddress()` and the time they
  confirmed the popup. Verify `signerAddress` matches the account you built the
  transaction for before submitting.
- **Do not submit the signed XDR client-side unless you mean to.** Freighter
  only signs — broadcasting is your responsibility via Horizon / Soroban RPC.
- **Do not mutate the XDR after signing.** Rebuilding
  `TransactionBuilder.fromXDR` and changing fields invalidates the signature.
