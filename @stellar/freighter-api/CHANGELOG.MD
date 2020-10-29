# v1.0.0-beta.0

- Name change to Freighter
- `isConnected` now coerces the value into being a `boolean` if it is `undefined`

# v1.0.0-alpha.3

- `signTransaction` now receives type `string` instead of `{ transactionXdr: string; }` as a function parameter
- All methods now `throw` on error rather returning `{ error: string}`
- Since `getPublicKey` and `signTransaction` no longer return errors, they now simply return a `string` rather than an object
