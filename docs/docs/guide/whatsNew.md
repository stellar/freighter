---
id: whatsNew
title: What's New
slug: /whatsNew
---

## Release 5.33.0

## Discover

You can now find dapps to connect your Freighter wallet to from the `Discover`
screen. Here, you'll find dapps that provide different services, like lending,
DEXs, and bridging.

To access, simply click the `Discover` button on the home screen.

<img src={require('./assets/5.33.0/discover-button.png').default} alt="Discover
Button" width="300"/>

From here, you can click the `Open` button next to any protocol to navigate to
the dapp.

<img src={require('./assets/5.33.0/discover-screen.png').default} alt="Discover
Screen" width="300"/>

## Filtering claimable balances

Many users have reported their Stellar accounts receive a good deal of claimable
balance "spam" in their account history - claimable balances they have no
intention of claiming. These often present themselves as a transaction
containing many `create claimable balance` operations.

<img src={require('./assets/5.33.0/create-claimable-spam.png').default}
alt="Create Claimable Balance Spam" width="300"/>

To filter out this noise and provided a better experience for users, Freighter
now automatically hides these types of transactions for you. If you do want to
engage with any of these, they still exist on your account. You can find them by
visiting a block explorer like [stellar.expert](https://stellar.expert).

## Additional bugfixes and stability fixes

[Full changelog](https://github.com/stellar/freighter/releases/tag/5.33.0)

## Release 5.32.0

## Add Asset Unification

The "Add Asset" flow is now unified so that users do not have to select "Add
Manually" in order to add custom tokens. You can now use the single search bar
in order to search for issuers, domains, and contract IDs when looking for an
asset to add to your balances screen.

<img src={require('./assets/5.32.0/asset-unification.png').default} alt="Add
Assets" width="300"/>

## Improved Support for Asset Icons

Traditionally, you have only been able to see an asset's icon if it was
correctly defined in
[the asset's toml file](https://developers.stellar.org/docs/tokens/publishing-asset-info#sample-stellartoml)
hosted on the asset's home domain.

Custom tokens have no corresponding toml file or home domain which meant there
was no support for displaying a custom token's asset icon. We've expanded icon
support by including icons defined in any
[SEP 42 Stellar Asset List](https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0042.md)
that is active in your wallet. This change will allow more asset icons to be
available for Freighter assets and include custom tokens that are vetted by the
community and added to the maintained asset lists.

## Failed Transaction in History

Your history previously only included transactions that were successful and
included in the ledger. We've updated our history data to include failed
transactions in order to give users a better view of the actions they attempt to
take.

<img src={require('./assets/5.32.0/failed-history-row.png').default} alt="Failed
History Row" width="300"/> <img
src={require('./assets/5.32.0/failed-history-item.png').default} alt="Failed
History Item" width="300"/>

## Additional bugfixes and stability fixes

[Full changelog](https://github.com/stellar/freighter/releases/tag/5.32.0)

## Release 5.31.0

## Coinbase Onramp:

You can now fund your wallet directly from Freighter. To do so, first, make sure
you are on Mainnet. Then, click on the `...` dropdown on the Account screen.
You'll see a button labeled `Add funds`. This will bring you to a screen with a
button labeled `Buy With Coinbase`. This button takes you to Coinbase where you
can select any asset Coinbase offers. At checkout, you will find your Freighter
address prefilled. Completing checkout will send the asset to your Freighter
wallet.

<img src={require('./assets/5.31.0/coinbase_account.png').default} alt="Account"
width="300"/> <img
src={require('./assets/5.31.0/coinbase_add_funds.png').default} alt="Add funds"
width="300"/>

If your account is unfunded, you can simply click the `Add XLM` button on the
Account screen. This will take you to a screen where you can
`Buy XLM With Coinbase`. This button will take you to Coinbase where `XLM` will
be preselected for you and your Freighter address will be prefilled as the
destination.

<img src={require('./assets/5.31.0/coinbase_account.png').default} alt="Account"
width="300"/> <img src={require('./assets/5.31.0/coinbase_add_xlm.png').default}
alt="Add XLM" width="300"/>

## Hide Assets:

You can now choose to hide assets you own. Click the `...` dropdown and click
`Manage assets` (when your account is funded). Here you will see a button in the
top right corner wher you can toggle assets. This is useful if you have many
assets but only want to see a few that you care about.

<img src={require('./assets/5.31.0/hide_assets.png').default} alt="Hide assets"
width="300"/>

## Paste Mnemonic Phrase:

During onboarding, if you choose to import an account by mnemonic phrase, you
can now paste your mnemonic phrase. If you paste the complete phrase into the
first input, it will populate the rest of the inputs with each word.

Please note that when you do so, we will automatically clear your clipboard
after successful paste. This is because keeping your mnemonic phrase (or secret
key) in your clipboard is a vulnerable place that hackers may have access to.
Because of that, we generally encourage users to never store sensitive
information in their clipboard.

For more information:

- [Demonic vulnerability](https://www.halborn.com/disclosures/demonic-vulnerability)
- [StilachiRAT vulnerability](https://www.microsoft.com/en-us/security/blog/2025/03/17/stilachirat-analysis-from-system-reconnaissance-to-cryptocurrency-theft/)

<img src={require('./assets/5.31.0/recover_paste.png').default} alt="Paste
recovery phrase" width="300" style={{verticalAlign: "top"}} /> <img
src={require('./assets/5.31.0/recover_pasted.png').default} alt="Pasted recovery
phrase" width="300"/>

## Security Improvements:

We've made some changes to how users deal with connected apps in Freighter.

Previously, if you tried to sign a transaction/message/auth entry for a dapp
that was NOT on the your connected apps list, Freighter would present a warning
message but still allow you to continue signing if you so choose. This design
made sense from the perspective of reducing user friction and allowing people to
sign things quickly.

As the ecosystem continues to evolve and grow, the Freighter team feels it would
be best to start giving you a bit more security in this flow. Starting in this
release, Freighter will automatically block you from signing a
transaction/message/auth entry if the app is not on your connected apps list.
The only way for you to sign for a dapp is to first go through the "connection
flow" that the dapp should offer. Behind the scenes, the dapp will be using the
@stellar/freighter-api methods setAllowed or requestAccess to do so. The goal
here is to you users from accidentally signing for a dapp that you do not intend
to.

Also, previously, if you went through the aforementioned "connection flow", it
would connect all of your Freighter addresses across ALL networks to an app.
Again, this design made sense from the perspective of reducing user friction and
allowing people to sign quickly.

Going forward, when you connect to a dapp, only the active keypair on the
currently selected network will be connected to the app. If you want to sign
using another one of your Freighter accounts, they will need to go through the
connection flow for that address.

<img src={require('./assets/5.31.0/sign_unconnected.png').default} alt="Sign for
unconnected apps" width="300"/>

## Additional bugfixes and stability fixes

[Full changelog](https://github.com/stellar/freighter/releases/tag/5.31.0)
