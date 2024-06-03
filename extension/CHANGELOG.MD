# Release notes - Wallets - FE Freighter 5.18.3

### Bug

Cannot find paths for swaps

# Release notes - Wallets - FE Freighter 5.18.2

### Bug

browser storage overrides by local storage

# Release notes - Wallets - FE-Freighter-5.18.1

### Feature

Upgrade stellar-sdk

# Release notes - Wallets - FE-Freighter-5.18.0

### Bug

Asset icons load late

### Story

Contract ID truncation does not adapt

Add Soroswap and Lobstr token allowlists

Add token allowlist management UI

Better usability of contract id in ReviewAuth

Redesign Settings views

# Release notes - Wallets - FE-Freighter-5.17.7

### Bug

Use indexer to fetch token details for Futurenet

# Release notes - Wallets - FE-Freighter-5.17.6

### Bug

Unable to Add Token when stellar.expert API is down

# Release notes - Wallets - FE-Freighter-5.17.5

### Bug

Standalone token transfer summary throws error

# Release notes - Wallets - FE-Freighter-5.17.4

### Bug

Check contract against allowList \+ native contract

Account sub 400 level errors not properly handled

Add an option to send from the select asset detail screen for Soroban tokens

Fix missing loading state glitch during switch accounts

Fix scrolling issue on search/add asset screens

Show Horizon errors in extension UI

### Story

Upgrade Typescript to v5

Address dependabot alerts

Special case token transfers in sign tx details overview

Upgrade React to v18

\[FE\] Generic extension notification from Freighter BE

\[FE\] Add degraded service notification for Horizon outage

# Release notes - Wallets - Freighter-5.17.3

### Bug

Improve alerting for Soroban RPC issues

### Story

Move bottom nav out of pages to improve loading UX

Streamline Sentry error tracking

# Release notes - Wallets - Freighter-5.17.2

### Bug

Missing loading state in loadSettings

unfunded accounts hit runtime error on swap

Fix sorobanRpcUrl missing error

# Release notes - Wallets - Freighter-5.17.1

### Bug

Account for contract creation when rendering auth entry invocation tree

Freighter backend has downtime between deploys

Token balances not being formatted for decimals

Fix displaying balances for Standalone networks

Fix SendPayment flow for Standalone networks

### Story

Global error handler and better error states

Add amplitude events to new screens/actions in sign tx flow

\[TESTS\] Allow list warnings

\[TESTS\] Auth signing flow in Sign TX

Add invoker auth warning to auth entry in tx sign flow

Adds rpc health route to backend

Restore client only mode for custom networks

Check rpc health and disable Soroban functionality if needed

Add GetPublicKey method that doesn't prompt users for access

# Release notes - Wallets - Freighter-5.17.0

### Bug

Create account error string

Account for contract creation when rendering auth entry invocation tree

Display scvBytes as array of numbers

### Story

Enable Soroban on Mainnet ahead of vote

Add invoker auth warning to auth entry in tx sign flow

Copy updates for token allowlist warnings

# Release notes - Wallets - Freighter-5.16.0

### Story

Update Sign TX Preview with Summary, Detail, Data tabs

Check tokens against stellar.expert top 50 asset list

Add notifications for assets not on stellar.expert asset list \(adding token,
sending payment, signing tx\)

# Release notes - Wallets - Freighter-5.15.2

### Bug

Account for optional wasm hash when rendering contract create invocations

# Release notes - Wallets - Freighter-5.15.1

### Bug

Fixes bug in transaction signing preview for scvMap rendering

# Release notes - Wallets - Freighter-5.15.0

### Story

Improve types for SignTransaction

Add stop gap for token payment sub invocations

# Release notes - Wallets - Freighter-5.14.0

### Bug

Editing transaction fee and slippage percentage takes user to Review screen

### Story

Create interface to allow Hardware Wallets to easily add themselves to repo

# Release notes - Wallets - Freighter-5.13.0

### Story

Add 24-word mnemonic phrase toggle in Recover Account onboarding screen

# Release notes - Wallets - Freighter-5.12.0

### Bug

accounts list not scrollable

### Story

Upgrade stellar-sdk to v11.1.0

# Release notes - Wallets - Freighter-5.11.0

### Bug

Fix memo display in SignTransaction

### Story

\[Automated Tests\] Add tests for a Swap payment

\[Automated Tests\] Managing a trustline

\[TEST\] Add tests for different memos in SignTransaction

Disable account migration

# Release notes - Wallets - Freighter-5.10.0

### Bug

Freighter's testnet Soroban migration hit runtime error on new installs

\[Layout\] UI fixes

### Story

Add full screen support

Key migration

# Release notes - Wallets - Freighter-5.9.0

### Story

Upgrade stellar-sdk for Protocol 20

# Release notes - Wallets - Freighter-5.8.0

### Bug

Send Settings view warns about React keys because of SDS Tooltip

### Story

Direct users to discord and GH to leave feedback

Remove split between soroban-client and js-stellar-sdk

# Release notes - Wallets - Freighter-5.7.1

### Story

Remove serializable check in Redux

Update SDS to stable build \(v1.0.0\)

# Release notes - Wallets - Freighter-5.7.0

### Bug

Soroban Preview 10: Allow removing old tokens from token list

Disable Soroban tokens in swap

# Release notes - Wallets - 5.6.4

### Bug

Soroban Tx history isn't showing up on testnet

Existing checks for experimental mode block some Testnet Soroban functionality

### Story

\[Automated Tests\] Add tests for signing Soroban tx's

Show Soroban RPC Url for Testnet

# Release notes - Wallets - Freighter-5.6.3

### Bug

getNetworkDetails does not return Soroban RPC URLs

# Release notes - Wallets - Freighter-5.5.1

### Bug

SignTransaction not properly parsing auth field in Soroban XDR's

# Release notes - Wallets - Freighter-5.2.6

### Story

Allow removing domain connection

Allow Freighter to sign arbitrary blobs

# Release notes - Wallets - Freighter-5.2.5

### Bug

Implement LavaMoat to block lifecycle scripts

# Release notes - Wallets - Freighter-5.2.4

### Bug

Freighter shows an empty screen when request to sign a transaction including
setTrustLineFlagsOp

# Release notes - Wallets - Freighter-5.2.3

### Story

Soroban Preview 10: scVal conversion and tx signing using latest soroban-client

# Release notes - Wallets - Freighter-5.2.2

### Bug

Firefox blocks signing transactions

# Release notes - Wallets - Freighter-5.2.1

### Bug

Sign Transaction throws error if contract args don't follow standard token
interface

# Release notes - Wallets - Freighter-5.2.0

### Story

Improve XDR decoder for transfer/mint transaction signing

# Release notes - Wallets - Freighter-5.1.2

### Bug

0 decimal tokens not formatted correctly

# Release notes - Wallets - Freighter-5.1.1

### Bug

freighter-api's getUserInfo doesn't check if dapp is on allowlist before
transmitting

# Release notes - Wallets - Freighter-5.1.0

### Story

Let dapps know if it is on Freighter's Allow List

freighter-api: add ability to request public key without prompting a user

# Release notes - Wallets - Freighter-5.0.5

### Bug

Dead screen when api call requires a user login through external window.

# Release notes - Wallets - Freighter-5.0.4

### Bug

Users experiencing disabled Send button when confirming payment details

Soroban Preview 9: parse tx history using new operation format

# Release notes - Wallets - Freighter-5.0.3

### Bug

Reset wordlist state after incorrect phrase

Should not use an empty memo when the user does not provide one

Should not handle 504 as tx failure

### Story

Add commas to balances on Account

# Release notes - Wallets - Freighter-5.0.1

### Bug

Soroban Preview Release 9: Update \`soroban-client\` for tx signing

# Release notes - Wallets - Freighter-5.0.0

### Bug

Migrate to browser.storage

Confirm that users are able to onboard with mnemonic phrase

Update CD deployments for 5.0.0

# Release notes - Wallets - Freighter-4.0.2

### Bug

some values are not properly decoded for Soroban token balances

# Release notes - Wallets - Freighter-4.0.1

### Bug

Add "Has FriendBot" toggle when creating a custom network

NFT names can overflow space in DOM

Removing custom network goes to blank screen

Sentry doesn't factor in version

Creating an account on payment no longer works

Entering incorrect mnemonic on "recover-account" leads to blank screen

# Release notes - Wallets - Freighter-2.12.3

### Story

Check for malicious accounts when sending from the app

Use decimals field on Soroban token for amount display

# Release notes - Wallets - Freighter-2.12.2

### Bug

Replace PopupWrapper with SimpleBar scrolling

### Story

Upgrade soroban-client to v0.5.0

# Release notes - Wallets - Freighter-2.12.1

### Story

Soroban xfer in account history

# Release notes - Wallets - Freighter-2.12.0

### Bug

Asset Details doesn't show Send/Swap buttons properly

Inconsistent token icons

### Story

When Sending payment, choosing Token Asset should use \`InvokeHostFunctionOp\`
instead of classic \`Payment\` op

# Release notes - Wallets - Freighter-2.11.1

### Bug

Make Settings version number dynamic

Switching account causes authentication gore on asset select screen

Connecting to an insecure Soroban-RPC throws error

Token and asset balances not loading at same time

# Release notes - Wallets - Freighter-2.11.0

### Story

Show Soroban Token balance on Account screen

Show Asset Details screen for Soroban Token

Create UI for adding Soroban token by contract id

# Release notes - Wallets - Freighter-2.10.0

### Story

Upgrade soroban-client with v0.4.0

# Release notes - Wallets - Freighter-2.9.3

### Story

Bug: negative balance on send/swap

Bug: stale error state on add additional account

More consistent loading on accounts tab

# Release notes - Wallets - Freighter-2.9.2

### Bug

Limit the number of chars in the amount field

Fetch correct asset icon if TOML has multiple assets with the asset code

### Story

Suggest removing trustline after sending entire balance

Fix cursor reset on amount fields

# Release notes - Wallets - 2.9.1

## Bug

Upgrade soroban-client

# Release notes - Wallets - 2.9.0

## Bug

\[Ledger\] Freighter is not saving recent accounts the user sent to when Ledger
is used

\[Ledger\] When sending, if the device is not connected the screen already opens
with a warning message

## Story

Automatically recreate user accounts if they are funded

If asset balance is 0, display swap button in the asset page

# Release notes - Wallets - 2.8.0

## Bug

Add a scam asset using a hardware wallet causes error

## Story

Implement necessary analytics updates

Replace localStorage calls with abstracted function

# Release notes - Wallets - 2.7.1

## Bug

Unable to sign transactions on Main Net

# Release notes - Wallets - Version 2.7.0

### Bug

Adding asset manual allows user to add assets not on their selected network

Scam asset warning should use `basics/Infoblock` instead of SDS InfoBlock

Scam Asset alert icon should show when search results include a scam asset

Better error messages for Add Custom Network

### Story

Scam assets prevention measures

# Release notes - Wallets - Version 2.6.0

### Story

Sign new XDR containing smart contracts

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
