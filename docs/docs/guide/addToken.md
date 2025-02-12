---
id: addToken
title: Adding a Token through the API
slug: /add-token
---

## Adding a Soroban Token through the `addToken` API

You can trigger an "add token" workflow by utilizing the [addToken API](https://docs.freighter.app/docs/playground/addToken).
The API takes a **Contract Id** and a (optional) **Network Passphrase** as input which Freighter will use to load token details like **symbol, name, decimals and balance**. If the passphrase is ommited it will default to Pubnet's passphrase.

Freighter will then show these token details on a modal popup along with any applicable warnings so you can review it and verify the token's legitimacy. You will need to approve it in order for the token to be added.

Freighter will return the same Contract Id to the application that called the API after user confirmation in case the request succeeds, otherwise it'll return an error.

After adding the token Freighter will keep track of its balance and display it along with the other existing account balances.
