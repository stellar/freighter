# Signing Transactions, Messages, and Auth Entries

Freighter exposes three signing methods. All return `{ ...data } & { error? }`
and never throw for user rejections — you must check `error`.

## `signTransaction(xdr, opts?)`

Signs a Stellar transaction XDR.

```ts
const { signedTxXdr, signerAddress, error } = await signTransaction(
  tx.toXDR(),
  {
    networkPassphrase: Networks.PUBLIC, // or Networks.TESTNET
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

Prefer `networkPassphrase`. Older user-facing docs also describe a `network`
enum option (`"PUBLIC"`, `"TESTNET"`, ...) that Freighter maps to a passphrase
via `js-stellar-sdk`, and — per those docs — it takes precedence over
`networkPassphrase` when both are passed. The current TypeScript typings in
`@stellar/freighter-api` only declare `networkPassphrase` and `address`, so
`network` is not a first-class API anymore. Pass `networkPassphrase` and you
avoid the ambiguity entirely.

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

Handle both:

```ts
const { signedMessage, signerAddress, error } = await signMessage(
  "Hello, Stellar",
  { networkPassphrase: Networks.PUBLIC },
);
if (error || !signedMessage) throw new Error(error?.message ?? "no signature");

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
const { signedAuthEntry, signerAddress, error } = await signAuthEntry(
  authEntry.toXDR("base64"),
  { networkPassphrase: Networks.PUBLIC, address: signerAddress },
);
```

## After signing

- **`signerAddress` is the source of truth.** The user may have switched
  accounts between the time your app read `getAddress()` and the time they
  confirmed the popup. Verify `signerAddress` matches the account you built the
  transaction for before submitting.
- **Do not submit the signed XDR client-side unless you mean to.** Freighter
  only signs — broadcasting is your responsibility via Horizon / Soroban RPC.
- **Do not mutate the XDR after signing.** Rebuilding
  `TransactionBuilder.fromXDR` and changing fields invalidates the signature.
