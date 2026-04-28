---
name: freighter-api-integration
description:
  Best practices for dApps integrating with the Freighter Stellar wallet. Covers
  the connection and access flow, signing transactions / messages / auth
  entries, network and account change handling, error handling, SSR safety, and
  integration via stellar-wallets-kit. Use when writing, reviewing, or
  troubleshooting dApp code that imports `@stellar/freighter-api` or uses the
  `FreighterModule` from `@creit.tech/stellar-wallets-kit`. Triggers on tasks
  involving "connect wallet", `getAddress`, `requestAccess`, `signTransaction`,
  `signMessage`, `signAuthEntry`, `WatchWalletChanges`, `isConnected`,
  `isAllowed`, `setAllowed`, `getNetwork`, `getNetworkDetails`, or `addToken`.
---

# Freighter API Integration

Freighter is a non-custodial Stellar wallet shipped as a browser extension for
Chrome, Firefox, and Safari. dApps integrate with Freighter in one of two ways:

1. **Direct** — install `@stellar/freighter-api` and call its methods.
2. **Via stellar-wallets-kit** — use `@creit.tech/stellar-wallets-kit` with the
   `FreighterModule` when your app needs to support multiple Stellar wallets
   behind a single interface.

This skill is for developers **building dApps that consume Freighter**. It is
not for developers contributing to the Freighter extension itself — that lives
under `freighter-best-practices`.

## Choose direct or stellar-wallets-kit

| Situation                                                | Use    |
| -------------------------------------------------------- | ------ |
| Freighter is the only supported wallet                   | Direct |
| Multiple Stellar wallets (Freighter, xBull, Albedo, ...) | SWK    |
| Need tree-shakeable imports and minimal bundle size      | Direct |
| Want a ready-made wallet selection modal                 | SWK    |

See `references/stellar-wallets-kit.md` for the SWK setup.

## API surface at a glance

All methods live in `@stellar/freighter-api` and return a promise that resolves
to `{ ...data } & { error?: FreighterApiError }`. No method throws for
Freighter-side failures — **always check `error` before using the result**.

| Method                       | Purpose                                                           |
| ---------------------------- | ----------------------------------------------------------------- |
| `isConnected()`              | Is the Freighter extension installed / reachable?                 |
| `isAllowed()`                | Has the user previously granted this origin access?               |
| `setAllowed()`               | Prompt the user to allow this origin (returns the allowed flag).  |
| `requestAccess()`            | Prompt for access and return the active account address.          |
| `getAddress()`               | Return the active account address (fails if not allowed).         |
| `getNetwork()`               | Return the active network name and passphrase.                    |
| `getNetworkDetails()`        | Same as `getNetwork()` plus Horizon and Soroban RPC URLs.         |
| `signTransaction(xdr, opts)` | Sign a transaction XDR. Returns `{ signedTxXdr, signerAddress }`. |
| `signMessage(msg, opts)`     | Sign an arbitrary message (shape varies by extension version).    |
| `signAuthEntry(xdr, opts)`   | Sign a Soroban auth entry XDR.                                    |
| `addToken({ contractId })`   | Prompt the user to track a Soroban-asset contract.                |
| `WatchWalletChanges`         | Polling watcher for account / network changes.                    |

## Getting started

New integration? Read in this order:

1. `references/connection-flow.md` — establish connection and get the active
   address
2. `references/signing.md` — sign your first transaction
3. `references/error-handling.md` — handle errors and SSR safely before going to
   production

If you are supporting multiple wallets, start with
`references/stellar-wallets-kit.md` instead of step 1.

## Reference Guide

| Concern                  | File                              | When to Read                                            |
| ------------------------ | --------------------------------- | ------------------------------------------------------- |
| Connection & access flow | references/connection-flow.md     | Building "Connect Wallet" UX                            |
| Signing                  | references/signing.md             | Calling any `sign*` method                              |
| Network & events         | references/network-and-events.md  | Reading network, reacting to account / network changes  |
| Error handling           | references/error-handling.md      | Wrapping calls, SSR, user rejection, transport failures |
| stellar-wallets-kit      | references/stellar-wallets-kit.md | Supporting multiple wallets                             |
| Anti-patterns            | references/anti-patterns.md       | Code review, debugging flaky integrations               |
