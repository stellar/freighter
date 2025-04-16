---
id: whatsNew
title: What's New
slug: /whatsNew
---

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

## Additional bugfixes and stability fixes

[Full changelog](https://github.com/stellar/freighter/releases/tag/5.31.0)
