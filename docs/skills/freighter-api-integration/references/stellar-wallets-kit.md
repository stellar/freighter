# Integrating Freighter via stellar-wallets-kit

[`@creit.tech/stellar-wallets-kit`](https://github.com/Creit-Tech/Stellar-Wallets-Kit)
(SWK) is a wallet-abstraction layer that supports Freighter, xBull, Albedo,
Ledger, and others behind one interface. Use it when your dApp needs to support
more than Freighter.

## When to choose SWK vs direct

| Situation                                    | Pick       |
| -------------------------------------------- | ---------- |
| You only support Freighter                   | Direct SDK |
| You support 2+ Stellar wallets               | SWK        |
| You want a ready-made wallet-selection modal | SWK        |
| You need the smallest possible bundle        | Direct SDK |
| You need features not yet exposed by SWK     | Direct SDK |

If you start direct and later add wallets, migration is straightforward: the
method names on an SWK instance mirror `@stellar/freighter-api`.

## Minimal setup

```ts
import {
  StellarWalletsKit,
  WalletNetwork,
  FREIGHTER_ID,
  FreighterModule,
  xBullModule,
} from "@creit.tech/stellar-wallets-kit";

const kit = new StellarWalletsKit({
  network: WalletNetwork.PUBLIC,
  selectedWalletId: FREIGHTER_ID, // default; user can switch via the modal
  modules: [new FreighterModule(), new xBullModule()],
});
```

`FreighterModule` wraps `@stellar/freighter-api` — you do **not** install
`@stellar/freighter-api` separately when using SWK. SWK pulls it in.

## Connecting

```ts
await kit.openModal({
  onWalletSelected: async (option) => {
    kit.setWallet(option.id);
    const { address } = await kit.getAddress();
    setAccount(address);
  },
});
```

If you already know the user wants Freighter (e.g., a "Use Freighter" button),
skip the modal and set the wallet directly:

```ts
kit.setWallet(FREIGHTER_ID);
const { address } = await kit.getAddress();
```

## Signing through SWK

The `kit.signTransaction` signature is **not** identical to the direct SDK. SWK
accepts `{ networkPassphrase, address }` plus framework-specific fields and
returns `{ signedTxXdr, signerAddress }`:

```ts
const { signedTxXdr, signerAddress } = await kit.signTransaction(tx.toXDR(), {
  address: account,
  networkPassphrase: WalletNetwork.PUBLIC,
});
```

SWK also exposes `signMessage` and `signAuthEntry` with analogous shapes. The
behavior and pitfalls documented in `references/signing.md` still apply —
especially matching the `networkPassphrase` to the wallet's active network.

## Pitfalls specific to SWK

- **Do not install `@stellar/freighter-api` alongside SWK in the same app
  without a reason.** You will duplicate code and can end up with two different
  SDK versions. Pick one and stick with it.
- **SWK's `signTransaction` return is awaited**, unlike some older
  wallet-abstraction libraries. No `.then(resolve, reject)` dance needed.
- **`kit.setWallet(id)` is synchronous**, but every method you call on the kit
  afterwards targets that wallet. Remember to call `setWallet` again if you let
  the user switch wallets mid-session.
- **Version skew.** SWK lags behind new Freighter features (for example, a new
  option added to `signTransaction` may not be exposed by SWK for a release). If
  you need a feature immediately, fall back to the direct SDK for that one call.

## Further reading

- SWK README and API docs: `@creit.tech/stellar-wallets-kit` on npm.
- This skill's `references/connection-flow.md`, `references/signing.md`, and
  `references/error-handling.md` all apply equally to the SWK path — they
  describe Freighter semantics, not SDK plumbing.
