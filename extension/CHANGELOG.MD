# Release notes - Wallets - Version 2.5.0

### Bug

Error message not following deisign

When adding a network, return to the network selection screen

Remove stellar.expert links/API for Custom network users

Add "Network Invalid" modal if stellar-sdk throws an error on networkUrl

\(tech debt\) use Redux when selecting assets in the send flow, instead of query
params

Swap won't work if there's no direct market between the selected assets

Display balances when selecting swap destination asset

### Story

Include custom network selection

# Release notes - Wallets - Version 2.4.1

### Bug

Disable Sentry tracking if Anonymous Data Sharing is not allowed

### Story

Update settings copy for stellar.expert validation

# Release notes - Wallets - Version 2.4.0

### Bug

Rename "native" to "XLM" on LP shares

LP shares should be listed after all other assets

Fees are displayed in scientific notation

Asset "Send" and "Swap" should default to that asset

Before displaying the asset name, it briefly flashes "Stellar Network"

show create account ops in account history under "sent" column

large decimals turn amount to exponential notation, causing error in send flow

Include hover states to the bottom bar menu buttons

Make sure user can't re-view mnemonic phrase after creating account

### Story

WalletConnect technical evaluation

Show swaps in history

Display error details for all errors

Display LP shares in the app

Allow Freighter to interact with applications that use https only

Display asset balance details

# Release notes - Wallets - Version 2.3.0

### Bug

handle rejected tx from ledger error message

\[Ledger\] Replace tx rejected error messages

\[Ledger\] fix bug when logging out and in with ledger, then sending transaction

transaction fee denominated in XLM always

### Story

Address demonic vulnerability

Structure to support localization

Change links on the about page

Connect using Ledger

# Release notes - Version 2.2.1

### Bug

- fix bug when going to swap screen with no trustlines

# Release notes - Version 2.2.0

### Bug

- Ajustments to the pull up menu

- After completing a swap and doing it again, when selecting asset the images
  won't load

- Images are displaying the "no image" icon while loading. They should display
  the loader state

- Fix width and paddings on the account creation yellow box

- In clickable items, allow the user to click on the entire line, not only on
  the arrow

### Story

- Ask the user to pin the extension after installation \(update image\)

- Update "Offered by" field in the Chrome web store

- Update placeholder text of the manual asset add field

- Remove network tag from onboarding screens

- Allow the user to select a key when signing and verify if the user has the
  required key requested by the app

- Set recommended fee as default when sending a payment

- Allow swapping assets using Path Payments

# v2.1.2

- Protocol 19 update
- Add tracking for new features
- Filter out LP shares from balances

**Bug Fixes:**

- Better asset icon handling
- Path Payment starting at 0 error
- Default to "recommended fee" in payment

# v2.0.0

- UI revamp
- Added managing trustlines
- Added send payments/path payments

# v1.2.0

**Bug Fixes:**

- Fix multi line operations in Account History
- Add Lumenswap logo to footer

# v1.1.5

**Bug Fixes:**

- Fixed scrollbar issue on Settings subview:
  https://github.com/stellar/freighter/issues/281
- Update @stellar/wallet-sdk so liquidity pool shares don't break asset balances

# v1.1.4

**Bug Fixes:**

- Fixed scrollbar issue: https://github.com/stellar/freighter/issues/268

**Updates:**

- Added Protocol 18 Support

# v1.1.3

- Parse non-latin characters correctly

# v1.1.2

- Add labels for Protocol 17 operations
- Update copy

# v1.1.1

- Add support for Fee Bump transactions

# v1.1.0

- Allow users to toggle between Mainnet and Testnet
- Allow Claimable Balances and Sponsorship operations
- Allow users to toggle stellar.expert checks

# v1.0.9

- Show all assets held by an account
- Show a limited transaction history for each account
- Show an unfunded account warning message

# v1.0.8-beta.0

- Use SEP-29 to flag transactions with a warning if they are missing a required
  memo
- Use stellar.expert's directory to flag transactions interacting with malicious
  and/or unsafe accounts

# v1.0.7-beta.0

- Allow custom account names for generated/imported accounts
- Stop rounding XLM balance
- Use correct identicons

# v1.0.6-beta.0

- Allow for multiple accounts: either populating next account from mnemonic
  phrase or importing a different account by secret key

# v1.0.5-beta.0

- Updated illos
- Added identicons for each public key
- Add a Typeform for users to leave feedback
- Added Sentry for bug tracking

# v1.0.4-beta.0

- No functional change in this version. Privacy Policy has been updated and
  extension resubmitted for Firefox review

# v1.0.3-beta.2

- Using `webextension-polyfill-ts` to enable Firefox compatibility, plus
  subsequent refactoring
- Properly decode all memo types

# v1.0.2-beta.0

- Address issue with `Sell order` transactions causing a breaking error
- Show all path details in `signTransaction` UI for path payments

# v1.0.1-beta.0

- Make `truncatedPublickey` return empty string on undefined input instead of
  throwing error
- Show all possible `set options` details in `signTransaction` UI

# v1.0.0-beta.1

- Initial public release
- UI cleanup
- Freighter name change
