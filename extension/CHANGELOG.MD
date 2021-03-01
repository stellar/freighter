# v1.0.7-beta.0

- Allow custom account names for generatred/imported accounts
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
