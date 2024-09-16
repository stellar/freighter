---
id: account
title: Account & Network Settings
slug: /account
---

## Adding a new account

In order to use another account that is derived from your seed phrase to Freighter, you can do the following:

- From the account balances page, you can click on the "accounts" dropdown from the identicon in the upper left corner of the screen in order to open the account options.
- From the options page, you can "Import a Stellar secret key" if you already have your secret key or you can "Create new Stellar wallet" if you want to generate one.
- After importing or generating a new account, you will land on the "account balances" screen where you should see an unfunded account unless you have used the account previously.

## Custom RPC

Freighter configures it's own RPCs for the base network, but you can configure a "custom network" in order to bring your own [Horizon instance](https://developers.stellar.org/docs/data/horizon) and/or [RPC instance](https://github.com/stellar/soroban-rpc).

You can click on the on current network using the tab in the upper right corner of the screen, and select "Add custom network" from the dropdown.
At this point you can configure a custom network to be used in Freighter, you should get your network settings(passphrase, friendbot URL, etc) from your Horizon/RPC provider.
