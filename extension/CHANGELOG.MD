#v1.2.0 **Bug Fixes:**

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
