---
id: signXdr
title: Sign XDR
slug: /sign-xdr
---

## Signing XDR

You trigger an "xdr signing" workflow by utilizing the [signTransaction API](https://docs.freighter.app/docs/playground/signTransaction).
The API takes an xdr string and network options as input and triggers a modal where you can review transaction/operation details and sign the transaction. Freighter will return the signed transaction to the application that called the API after user confirmation.

You can serialize an assembled transaction to a base64 encoded xdr string using [the stellar-sdk](https://stellar.github.io/js-stellar-sdk/AssembledTransaction.html#toXDR).

### Signing details

During the transaction/operation review, you can review signing details at different fidelities.

- Summary: The first tab is the summary tab which lays out high level trasnsction/operation details.
- Operation Details: The second tab exposes information about the operations in the transaction and optionally walks through the invocation chain and highlights authorizations.
- Raw XDR: The last tab lets you copy the raw XDR to be used outside of Freighter.
