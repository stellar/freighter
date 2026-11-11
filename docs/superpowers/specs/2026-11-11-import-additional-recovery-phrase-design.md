# Import an additional recovery phrase

Issue: stellar/freighter-private#55. Branch:
`feature/import-additional-recovery-phrase`, cut from
`feature/add-wallet-chooser`.

## Intent

A user who already has a wallet can bring in a second (or third) recovery phrase
from the Add wallet chooser. The phrase becomes a new source with its own group
in the account switcher, and nothing already in the wallet changes.

Today the only phrase import is onboarding's `recoverAccount`. It deletes every
`stellarkeys:*` keystore, resets `keyIdList`, and clears sources, derivation
indices, provenance and link status before storing the recovered phrase. Running
it on a live wallet destroys the first wallet. That flow stays destructive on
purpose, because it is also the "forgot password" path. This work adds a
separate, additive path.

## Goals

- A fourth option in the Add wallet chooser, "Import Recovery Phrase", with the
  description "Import wallets using a recovery phrase." It sits second, between
  "Create new wallet" and "Import Secret Key", matching the mock order. The
  comment at the top of `popup/views/AddWallet/index.tsx` saying phrase import
  will join the list later gets updated.
- Importing adds a phrase source with the next label in sequence and adds that
  phrase's accounts. Existing sources, accounts, names, derivation indices,
  provenance, link status and app settings are untouched.
- Discovery follows onboarding: index 0 is always added, and each further index
  up to the discovery depth is added if it exists on mainnet Horizon.
- Collisions are refused, never merged.

## Non-goals

- Converting or re-rooting a collision, such as turning a secret-key import into
  an account under the phrase.
- Caps on sources or accounts. #77 was closed as not planned, so nothing limits
  how many phrases or accounts a wallet holds.
- Telling the user how deep discovery goes, or that a funded account past it has
  to be added by hand. The issue asked for this line, but the decision is to
  follow onboarding, which says nothing.
- Changing onboarding recovery in any way.
- Serializing concurrent account-mutating handlers. That is #112.

## Anti-goals

- Any code path where a failed or refused import leaves the wallet partly
  changed. Every refusal happens before the first write.
- Reusing `recoverAccount` with a flag. Its job is to start the wallet afresh;
  mixing additive behavior into it puts the wipe one boolean away from a live
  wallet.

## The screens

Both screens follow the Varial mocks for the Manage accounts section ("Import"
frames), adapted to the extension the same way the other add-wallet screens
were.

1. **Import Recovery Phrase.** Back arrow to the chooser. Title "Import Recovery
   Phrase", subtitle "Restore your wallet with the 12 or 24-word recovery
   phrase". One multi-line textarea with the placeholder "Recovery phrase". A
   full-width Import button, disabled while the textarea is empty. A keyboard
   paste lands in the textarea, and the clipboard is cleared afterwards, as
   onboarding recovery does today. The mock's Paste button was dropped:
   extension pages can't read the clipboard without the `clipboardRead`
   permission, and asking for that permission on the recovery-phrase screen was
   rejected.
2. **Password.** The shared `EnterPassword` step, with a back action to the
   phrase screen, the same way `CreateWallet` asks for the password before
   calling `addRecoveryPhraseSource`. The phrase stays in component state
   between the two steps and is cleared on success and on leaving the flow.

On success the popup navigates to `ROUTES.account`, the same landing as the
other add paths. The new phrase's index 0 account is active, and its group shows
in the switcher under the new label.

While the import runs (password check, discovery, writes), the password step's
confirm button shows its loading state and the user can't submit twice.

## Validation and errors

The phrase is normalized before checking: trimmed, lowercased, with any run of
whitespace collapsed to one space.

The Import button runs the first check in the popup, so a bad phrase never
reaches the password step:

- The word count must be 12 or 24, and the phrase must pass the BIP-39 wordlist
  and checksum check. Otherwise the textarea shows "Invalid mnemonic phrase" and
  the flow stays on the phrase screen.

The background re-checks everything, in this order, and returns an error before
writing anything:

1. Word count and BIP-39 validity, with the same error.
2. The password is checked against the hot keystore, as
   `addRecoveryPhraseSource` does: log in to all accounts if there's no active
   hash key, then unlock the software keystore. The errors are the same as that
   handler's: a wrong password on a locked session fails the login and gives
   "Unable to login", and a wrong password on an unlocked session gives
   "Incorrect password". A wallet with no software keystore gives the existing
   `NO_SOFTWARE_KEYSTORE_ERROR`.
3. If the phrase's source id (`getPhraseSourceId`) is already among the wallet's
   secret sources, the import is refused with the existing
   `PHRASE_ALREADY_HELD_ERROR`: "This recovery phrase is already in your
   wallet".
4. Discovery runs (below).
5. If any address discovery would add, index 0 included, is already in
   `allAccounts`, the whole import is refused with
   `ACCOUNT_ALREADY_EXISTS_ERROR`. The popup shows "This account is already in
   your wallet.", the same mapping `ImportAccount` uses.

Errors from the background show on the password step through the usual
`authError` path.

## Discovery

The depth is **50**, from the issue. Index 0 is always added. For indices 1 to
49, the background fetches
`MAINNET_NETWORK_DETAILS.networkUrl/accounts/<publicKey>` and adds the account
if the response carries an `account_id`, which is the same test onboarding uses.
Mainnet is checked whatever network the user has selected, as onboarding does.

A lookup that fails (network error, non-JSON body, rate limit) counts as not
found. It's reported to Sentry the way onboarding reports it, and it never fails
the import.

The 50-lookup loop needs to finish in a reasonable time. How it does that is the
builder's call: bounded concurrency is fine, as long as the stored order stays
by ascending index.

The new constant sits next to `numOfPublicKeysToCheck` in
`popupMessageListener.ts` and is passed in the same way. Onboarding's depth of 5
stays as it is.

## Writes

Only after every check passes, and in this order:

- `addSecretSource` with type `PHRASE`, which assigns the next phrase label. It
  goes first so that if a later write fails, the accounts already stored sit
  under a labeled group, and a retry gets the clear "already in your wallet"
  refusal. The user can then add any missing account through "Add account to
  existing wallet". (Call made in design review.)
- `storeAccount` for each account to add, in ascending index order, with
  `mnemonicPhrase`, `phraseSourceId` and `sourceId` set to the new source id and
  `derivationIndex` set to its index. No account name is passed, so each one
  gets the next default name, exactly as onboarding's discovered accounts do.
  None are flagged `imported`.
- Activate the index 0 account (`activatePublicKey`). `storeAccount` leaves the
  last-stored account active, which would otherwise be the highest funded index.
- `linkWalletSources`, not awaited, as `addRecoveryPhraseSource` does.

If a write throws partway through, report to Sentry and return "Error adding
recovery phrase", the same string `addRecoveryPhraseSource` uses. Rolling back
partial writes isn't in scope; the checks above are what make a refusal clean.

The handler never calls `reset()`, `clearSession`, any `clear*` helper, or
`removePreviousAccount`, and never touches `APPLICATION_ID` or the rebrand
announcement status.

The response has the same shape as `addRecoveryPhraseSource` returns
(`publicKey`, `activeAccountId`, `allAccounts`, `hasPrivateKey`,
`secretSources`), so the popup's account state updates the same way.

## Plumbing

- A new handler, `handlers/importRecoveryPhrase.ts`, registered in
  `popupMessageListener.ts` under a new `SERVICE_TYPES` member, with a typed
  request in `@shared/api/types/message-request.ts`. No raw string messages.
- A popup API call in `@shared/api/internal.ts` and a thunk in
  `popup/ducks/accountServices.ts` next to `addRecoveryPhraseSource`, updating
  the same state on fulfilment.
- A route constant for the import screen under the `/add-wallet/` prefix, wired
  in `Router.tsx` with the other add-wallet routes.
- A metric on success, mirroring the `accountCreated` call in `CreateWallet`,
  with `source: "imported_phrase"` and the new account count.
- New user-facing strings go through `t()`, and the translation keys get
  regenerated.

## Testing

- Background unit tests for the handler: importing into a wallet that already
  has a phrase leaves the first phrase's keystores, names, index set and
  provenance intact, and adds the second phrase's index 0 plus funded indices
  under a new source. Also: a held phrase is refused with nothing written; a
  collision on a funded index refuses the whole import with nothing written; a
  `storeAccount` failure partway leaves the source registered and a retry is
  refused as already held; a lookup failure is skipped; index 0 is active
  afterwards; and invalid word counts are refused.
- Popup tests for the view: Import is disabled when empty, an invalid phrase
  stays on the phrase screen with the error, the password step's errors render,
  and success navigates to the account screen.
- An e2e case in `e2e-tests/addWallet.test.ts`: import a second phrase from the
  chooser and assert both groups appear, with the first group's rows unchanged.
  Then re-import the same phrase and assert the refusal.

## Left to the builder

- How the discovery loop is parallelized, as long as order is kept and the time
  is reasonable.
- Where the popup gets BIP-39 validation from (`stellar-hd-wallet` or the
  `bip39` package already in the tree).
- Component structure and styles for the phrase screen, following the existing
  add-wallet views.

## Error copy for review

No new error strings. Each state reuses copy the extension already ships:

| State                                         | Copy                                             | Where it comes from                                       |
| --------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| Wrong word count or bad phrase                | "Invalid mnemonic phrase"                        | onboarding `RecoverAccount`                               |
| Wrong password, session unlocked              | "Incorrect password"                             | `addRecoveryPhraseSource`, `addAccount`                   |
| Wrong password, session locked                | "Unable to login"                                | `addRecoveryPhraseSource`                                 |
| Phrase already in the wallet                  | "This recovery phrase is already in your wallet" | `PHRASE_ALREADY_HELD_ERROR`                               |
| A discovered account is already in the wallet | "This account is already in your wallet."        | `ImportAccount` mapping of `ACCOUNT_ALREADY_EXISTS_ERROR` |
| A write failed partway                        | "Error adding recovery phrase"                   | `addRecoveryPhraseSource`                                 |
| No software keystore                          | "This wallet has no password to check against"   | `NO_SOFTWARE_KEYSTORE_ERROR`                              |

None of these states were drawn in the mocks (#51 asked for them), so this table
is what to check against design.
