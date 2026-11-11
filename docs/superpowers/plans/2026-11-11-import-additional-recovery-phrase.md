# Import an Additional Recovery Phrase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user add a recovery phrase to an existing wallet from the Add
wallet chooser without touching anything already in it.

**Architecture:** A new background handler, `importRecoveryPhrase`, does every
check before any write, then registers the source and stores index 0 plus the
funded indices found on mainnet. Two helpers come out of
`addRecoveryPhraseSource` and onboarding recovery so the new handler doesn't
copy them: a password check and a discovery loop. The popup gets a two-step view
(phrase, then `EnterPassword`) reached from a new chooser entry.

**Tech Stack:** TypeScript, React, Redux Toolkit, Formik, `stellar-hd-wallet`,
`bip39`, Jest, Playwright.

**Spec:**
`docs/superpowers/specs/2026-11-11-import-additional-recovery-phrase-design.md`

## Global Constraints

- Never commit, push, stash or merge. The user drives git history. Where a task
  ends, stop and report; there is no commit step.
- Discovery depth is 50: index 0 is always added, indices 1 to 49 are checked on
  `MAINNET_NETWORK_DETAILS.networkUrl`. Onboarding's
  `numOfPublicKeysToCheck = 5` does not change.
- An account counts as funded when the Horizon `/accounts/<publicKey>` JSON has
  `account_id`. A lookup that throws counts as not found and is reported with
  `captureException`.
- Accept only 12- or 24-word phrases that pass the BIP-39 English wordlist and
  checksum. Normalize first: trim, lowercase, collapse whitespace runs to one
  space.
- Every refusal returns before the first write. Writes run in this order:
  `addSecretSource`, then `storeAccount` per index ascending, then
  `activatePublicKey` for index 0, then `void linkWalletSources(...)`.
- The handler never calls `reset()`, `clearSession`, any `clear*` helper or
  `removePreviousAccount`, and never writes `APPLICATION_ID` or
  `REBRAND_ANNOUNCEMENT_STATUS_ID`.
- Error strings, unchanged: "Invalid mnemonic phrase", "Incorrect password",
  "Unable to login", `PHRASE_ALREADY_HELD_ERROR`, `ACCOUNT_ALREADY_EXISTS_ERROR`
  (popup shows "This account is already in your wallet."), "Error adding
  recovery phrase", `NO_SOFTWARE_KEYSTORE_ERROR`.
- Chooser copy: title "Import Recovery Phrase", description "Import wallets
  using a recovery phrase." Screen copy: title "Import Recovery Phrase",
  subtitle "Restore your wallet with the 12 or 24-word recovery phrase",
  placeholder "Recovery phrase", button "Import". No Paste button (extension
  pages cannot read the clipboard without `clipboardRead`).
- All user-facing strings go through `t()`. Run
  `yarn build:extension:translations` after adding them.
- Messages use `SERVICE_TYPES` enum members, never raw strings.
- Run Jest from the repo root as `yarn jest <path>`. Typecheck with
  `npx tsc --noEmit -p extension/tsconfig.json`; the build doesn't typecheck.

## Review Focus

1. A pasted phrase with newlines, double spaces or capitals should be accepted
   and should produce the same source id as the clean phrase. Pinned in Task 1
   (`normalizeMnemonic`) and Task 3 (handler accepts a messy phrase).
2. A phrase whose index 0 was earlier imported as a secret key should be refused
   as an existing account, with no source registered. Pinned in Task 3.
3. Importing while a hardware account is active should check the password
   against the software keystore, not fail. Pinned in Task 2 (helper test with a
   hardware wallet active).
4. A wrong password on a locked session should return "Unable to login" with
   nothing written. Pinned in Task 3.
5. Going back from the password step should keep the phrase in the textarea, and
   leaving the flow should clear it. Pinned in Task 4.

---

### Task 1: Phrase normalization and validation helpers

**Files:**

- Create: `@shared/api/helpers/mnemonic.ts`
- Test: `@shared/api/helpers/__tests__/mnemonic.test.ts`

**Interfaces:**

- Produces: `normalizeMnemonic(phrase: string): string` and
  `isValidImportMnemonic(phrase: string): boolean`. The second normalizes,
  requires 12 or 24 words, and calls
  `validateMnemonic(normalized, wordlists.english)` from `bip39`, as
  `deriveAuthKeypair.ts` does.

- [ ] **Step 1: Write the failing tests**

```ts
describe("normalizeMnemonic", () => {
  it("trims, lowercases and collapses whitespace", () => {
    expect(normalizeMnemonic("  Abandon\n abandon\tABOUT  ")).toBe(
      "abandon abandon about",
    );
  });
});

describe("isValidImportMnemonic", () => {
  const twelve =
    "abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about";
  const twentyFour = `${"abandon ".repeat(23)}art`;
  it("accepts a valid 12-word phrase", () =>
    expect(isValidImportMnemonic(twelve)).toBe(true));
  it("accepts a valid 24-word phrase", () =>
    expect(isValidImportMnemonic(twentyFour)).toBe(true));
  it("accepts a messy valid phrase", () =>
    expect(isValidImportMnemonic(`\n${twelve.toUpperCase()}  `)).toBe(true));
  it("refuses 15 words even if the checksum passes", () => {
    const fifteen = "abandon ".repeat(14) + "address";
    expect(isValidImportMnemonic(fifteen)).toBe(false);
  });
  it("refuses a bad checksum", () =>
    expect(isValidImportMnemonic(twelve.replace(/about$/, "abandon"))).toBe(
      false,
    ));
  it("refuses a word not in the list", () =>
    expect(isValidImportMnemonic(twelve.replace(/^abandon/, "tomato1"))).toBe(
      false,
    ));
  it("refuses an empty string", () =>
    expect(isValidImportMnemonic("")).toBe(false));
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `yarn jest @shared/api/helpers/__tests__/mnemonic.test.ts` Expected: FAIL,
module not found.

- [ ] **Step 3: Implement both functions in `@shared/api/helpers/mnemonic.ts`**

- [ ] **Step 4: Run them and see them pass**

Run: `yarn jest @shared/api/helpers/__tests__/mnemonic.test.ts` Expected: PASS,
8 tests.

---

### Task 2: Extract the password check and the discovery loop

Both helpers come out of existing code. The existing `addRecoveryPhraseSource`
and `recoverAccount` suites are the regression guard for the extraction.

**Files:**

- Create:
  `extension/src/background/messageListener/helpers/verify-add-password.ts`
- Create:
  `extension/src/background/messageListener/helpers/discover-funded-indices.ts`
- Modify:
  `extension/src/background/messageListener/handlers/addRecoveryPhraseSource.ts`
  (replace the keyID, `loginToAllAccounts` and `unlockKeystore` block with the
  helper)
- Modify: `extension/src/background/messageListener/handlers/recoverAccount.ts`
  (replace the preload loop with the helper; keep its own `storeAccount` calls)
- Test:
  `extension/src/background/messageListener/__tests__/verifyAddPassword.test.ts`
- Test:
  `extension/src/background/messageListener/__tests__/discoverFundedIndices.test.ts`

**Interfaces:**

- Produces:
  `verifyAddPassword({ password, localStore, sessionStore, keyManager, sessionTimer }): Promise<string | null>`.
  It returns `null` when the password unlocks the software keystore, or one of
  `NO_SOFTWARE_KEYSTORE_ERROR`, "Unable to login" or "Incorrect password", with
  the same logic and Sentry message shape as the block it replaces. Move
  `NO_SOFTWARE_KEYSTORE_ERROR` into this file and re-export it from
  `addRecoveryPhraseSource.ts` so existing imports still work.
- Produces: `discoverFundedIndices({ wallet, from, to }): Promise<number[]>`,
  where `wallet` is the `fromMnemonic` result. It checks indices `from` to `to`
  inclusive on mainnet and returns the funded ones in ascending order.
  Concurrency is the implementer's call. `recoverAccount` calls it with
  `from: 1, to: numOfPublicKeysToCheck`.

- [ ] **Step 1: Write the failing helper tests**

`verifyAddPassword`: copy the store setup from
`addRecoveryPhraseSource.test.ts`. Tests:

- `returns null for the right password` on an unlocked session
- `returns "Incorrect password" for a wrong password on an unlocked session`
- `returns "Unable to login" for a wrong password on a locked session`, with no
  active hash key
- `returns NO_SOFTWARE_KEYSTORE_ERROR when there is no KEY_ID`
- `checks the software keystore while a hardware account is active` (Review
  Focus 3). Set the hardware account active so `getIsHardwareWalletActive` is
  true, then expect `null` for the right password.

`discoverFundedIndices`: mock `global.fetch` per URL, keyed by
`wallet.getPublicKey(i)`. Tests:

- `returns funded indices in ascending order`. Fund 7, 2 and 49 out of 1..49;
  resolve them out of order with staggered timers; expect `[2, 7, 49]`.
- `treats a 404 body as not funded`, for `{ status: 404 }` with no `account_id`.
- `skips an index whose lookup throws and reports it`. Reject index 3, fund
  index 4, expect `[4]` and `captureException` called once.
- `queries mainnet Horizon`. Every fetched URL starts with
  `${MAINNET_NETWORK_DETAILS.networkUrl}/accounts/`.

- [ ] **Step 2: Run them and see them fail**

Run:
`yarn jest extension/src/background/messageListener/__tests__/verifyAddPassword.test.ts extension/src/background/messageListener/__tests__/discoverFundedIndices.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Implement both helpers and switch the two handlers over to
      them**

- [ ] **Step 4: Run the new and existing suites**

Run:
`yarn jest extension/src/background/messageListener/__tests__/verifyAddPassword.test.ts extension/src/background/messageListener/__tests__/discoverFundedIndices.test.ts extension/src/background/messageListener/__tests__/addRecoveryPhraseSource.test.ts extension/src/background/messageListener/__tests__/recoverAccount.test.ts`
Expected: PASS, with no existing test edited.

---

### Task 3: The `importRecoveryPhrase` handler

**Files:**

- Create:
  `extension/src/background/messageListener/handlers/importRecoveryPhrase.ts`
- Modify: `@shared/constants/services.ts` (add
  `IMPORT_RECOVERY_PHRASE = "IMPORT_RECOVERY_PHRASE"` beside
  `ADD_RECOVERY_PHRASE_SOURCE`)
- Modify: `@shared/api/types/message-request.ts` (add
  `ImportRecoveryPhraseMessage`, add it to the request union near line 590)
- Modify: `extension/src/background/messageListener/popupMessageListener.ts`
  (add `const phraseImportDiscoveryDepth = 50;` beside `numOfPublicKeysToCheck`,
  plus a `case SERVICE_TYPES.IMPORT_RECOVERY_PHRASE` beside the
  `ADD_RECOVERY_PHRASE_SOURCE` case)
- Test:
  `extension/src/background/messageListener/__tests__/importRecoveryPhrase.test.ts`

**Interfaces:**

- Consumes: `normalizeMnemonic` and `isValidImportMnemonic` (Task 1);
  `verifyAddPassword` and `discoverFundedIndices` (Task 2);
  `PHRASE_ALREADY_HELD_ERROR` from `addRecoveryPhraseSource.ts`;
  `ACCOUNT_ALREADY_EXISTS_ERROR` from `@shared/constants/errors`.
- Produces:
  `interface ImportRecoveryPhraseMessage extends BaseMessage { type: SERVICE_TYPES.IMPORT_RECOVERY_PHRASE; password: string; mnemonicPhrase: string }`.
- Produces:
  `importRecoveryPhrase({ request, localStore, sessionStore, keyManager, sessionTimer, discoveryDepth }): Promise<{ error: string } | { publicKey; activeAccountId; allAccounts; hasPrivateKey; secretSources }>`.
  The success shape is the same as `addRecoveryPhraseSource`'s.
- Produces:
  `export const IMPORT_PHRASE_FAILED_ERROR = "Error adding recovery phrase";`.

Order inside the handler: normalize; validate ("Invalid mnemonic phrase");
`verifyAddPassword`; held-source check;
`discoverFundedIndices({ wallet, from: 1, to: discoveryDepth - 1 })`; check that
none of `[0, ...funded]` is already in `allAccountsSelector`; then the writes
from Global Constraints. If a write throws, call `captureException` and return
`IMPORT_PHRASE_FAILED_ERROR`.

- [ ] **Step 1: Write the failing tests**

Set up a wallet with one phrase source (Seed Phrase 1) and two accounts, using
the same fixture approach as `addRecoveryPhraseSource.test.ts`. Mock
`link-sources`. Mock `fetch` so chosen addresses of the second phrase are
funded. Capture a snapshot of the first source's `stellarkeys:*` entries,
`KEY_ID_LIST` prefix, account names, derivation indices and provenance before
each import. Tests:

- `adds the second phrase as Seed Phrase 2 with index 0 and its funded indices`.
  Fund 3 and 10; expect three new accounts, at derivation indices `[0, 3, 10]`,
  all with the new `sourceId`, none `imported`.
- `leaves the first phrase's keystores, names, indices and provenance unchanged`.
  Compare against the snapshot.
- `adds only index 0 when nothing is funded`.
- `makes the new phrase's index 0 active`, even though index 10 was stored last.
- `accepts a phrase with capitals, newlines and extra spaces and registers the clean phrase's source id`
  (Review Focus 1).
- `refuses an invalid phrase with "Invalid mnemonic phrase"`, for both a 15-word
  and a bad-checksum phrase, with nothing written.
- `refuses a phrase the wallet already holds with PHRASE_ALREADY_HELD_ERROR and makes no Horizon request`.
- `refuses the whole import when a funded index is already in the wallet`.
  Import the second phrase's index 3 as a secret key first, fund 3 and 10,
  expect `ACCOUNT_ALREADY_EXISTS_ERROR`, no new source, and no new keystores.
- `refuses when index 0 was earlier imported as a secret key` (Review Focus 2).
- `refuses a wrong password on a locked session with "Unable to login" and writes nothing`
  (Review Focus 4).
- `leaves the source registered when a storeAccount fails partway, and a retry is refused as already held`.
  Make the second `storeAccount` throw; expect `IMPORT_PHRASE_FAILED_ERROR`, the
  source present, then a second call returning `PHRASE_ALREADY_HELD_ERROR`.
- `does not touch application state or the rebrand announcement status`.

"Writes nothing" means `KEY_ID_LIST`, the secret sources, the account names and
`KEY_ID` all equal their pre-call values.

- [ ] **Step 2: Run them and see them fail**

Run:
`yarn jest extension/src/background/messageListener/__tests__/importRecoveryPhrase.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Add the enum member and the message type, implement the handler,
      and wire the listener case with
      `discoveryDepth: phraseImportDiscoveryDepth`**

- [ ] **Step 4: Run the suite and the typecheck**

Run:
`yarn jest extension/src/background/messageListener/__tests__/importRecoveryPhrase.test.ts && npx tsc --noEmit -p extension/tsconfig.json`
Expected: PASS, and tsc exits 0.

---

### Task 4: Popup API, thunk, view, route and chooser entry

**Files:**

- Modify: `@shared/api/internal.ts` (add `importRecoveryPhrase` beside
  `addRecoveryPhraseSource`)
- Modify: `extension/src/popup/ducks/accountServices.ts` (add an
  `importRecoveryPhrase` thunk; register `.fulfilled` with `onAccountAdded` and
  `.rejected` with `onAccountAddFailed`, as at line 814)
- Modify: `extension/src/popup/constants/routes.ts` (add
  `importRecoveryPhrase = "/add-wallet/import-phrase"`)
- Modify: `extension/src/popup/Router.tsx` (add the route beside
  `ROUTES.createWallet`)
- Modify: `extension/src/popup/views/AddWallet/index.tsx` (insert the second
  action, update the header comment)
- Create: `extension/src/popup/views/ImportRecoveryPhrase/index.tsx` and
  `styles.scss`
- Test: `extension/src/popup/views/__tests__/ImportRecoveryPhrase.test.tsx`

**Interfaces:**

- Consumes: `SERVICE_TYPES.IMPORT_RECOVERY_PHRASE` and the response shape (Task
  3); `isValidImportMnemonic` and `normalizeMnemonic` (Task 1).
- Produces:
  `importRecoveryPhrase({ activePublicKey, password, mnemonicPhrase })` in
  `internal.ts`, which throws on `response.error` as `addRecoveryPhraseSource`
  does. The thunk is named `"auth/importRecoveryPhrase"` and takes
  `{ password, mnemonicPhrase }`.
- Produces: chooser action
  `{ icon: <Icon.Passcode />, title: t("Import Recovery Phrase"), description: t("Import wallets using a recovery phrase."), link: ROUTES.importRecoveryPhrase, testId: "add-wallet-import-phrase" }`,
  placed second.
- Produces test ids: `import-phrase-input` (textarea), `import-phrase-submit`.
  The password step uses `EnterPassword` with
  `confirmButtonTitle={t("Import")}`, following the `CreateWallet` step pattern
  (`step: "phrase" | "password"`).

View behavior:

- Import is disabled while the trimmed textarea is empty. On Import, if
  `!isValidImportMnemonic(value)`, the textarea shows
  `t("Invalid mnemonic phrase")` and the view stays put. Otherwise it moves to
  the password step.
- A keyboard paste into the textarea is followed by
  `navigator.clipboard.writeText("")`, ignoring a failure.
- On the password step the back action calls `clearApiError()` and returns to
  the phrase step with the text kept. Leaving the flow (the header back on the
  phrase step goes to `ROUTES.addWallet`) and success both clear the phrase.
- On fulfilment,
  `emitMetric(METRIC_NAMES.accountCreated, { number_of_accounts, source: "imported_phrase" })`
  runs, then `navigateTo(ROUTES.account, navigate)`.
- The password step maps `ACCOUNT_ALREADY_EXISTS_ERROR` to
  `t("This account is already in your wallet.")`, the same way `ImportAccount`
  does. Other errors show as they come.

- [ ] **Step 1: Write the failing view tests**

Follow `CreateWallet.test.tsx` for store setup and mocking `internal`. Tests:

- `disables Import while the phrase is empty`
- `shows "Invalid mnemonic phrase" for a 15-word phrase and stays on the phrase step`
- `moves a valid phrase to the password step`
- `sends the normalized phrase and the password, then navigates to the account view`.
  Assert `importRecoveryPhrase` was called with `mnemonicPhrase` equal to the
  normalized text.
- `shows "This recovery phrase is already in your wallet" on the password step when refused`
- `shows "This account is already in your wallet." for ACCOUNT_ALREADY_EXISTS_ERROR`
- `keeps the phrase when going back from the password step` (Review Focus 5)
- `clears the clipboard after a keyboard paste`
- Add to the existing AddWallet chooser test, or create
  `views/__tests__/AddWallet.test.tsx` if none exists:
  `lists Import Recovery Phrase second and links to the import route`

- [ ] **Step 2: Run them and see them fail**

Run:
`yarn jest extension/src/popup/views/__tests__/ImportRecoveryPhrase.test.tsx`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the API call, thunk, route, view and chooser entry**

- [ ] **Step 4: Regenerate translations, run the tests and typecheck**

Run:
`yarn build:extension:translations && yarn jest extension/src/popup/views/__tests__ && npx tsc --noEmit -p extension/tsconfig.json`
Expected: the new keys appear in
`extension/src/popup/locales/*/translation.json`, the tests pass and tsc
exits 0.

---

### Task 5: End-to-end coverage

**Files:**

- Modify: `extension/e2e-tests/helpers/addWallet.ts` (add
  `importRecoveryPhraseSource({ page, password, words })`)
- Modify: `extension/e2e-tests/addWallet.test.ts`

**Interfaces:**

- Consumes: the test ids from Task 4.
- Produces:
  `importRecoveryPhraseSource({ page, password, words }: { page: Page; password: string; words: string[] }): Promise<void>`.
  It goes from an open account sheet through `add-wallet`,
  `add-wallet-import-phrase`, filling `import-phrase-input` with
  `words.join(" ")`, `import-phrase-submit`, `#password-input`, and the `Import`
  button.

The background's Horizon lookups go to real mainnet. Generate the second phrase
in the test with `generateMnemonic()` from `bip39`, so its addresses are
unfunded and only index 0 gets added.

- [ ] **Step 1: Write the tests, using the group helpers already in
      `addWallet.test.ts`**
- `Imports a second recovery phrase without changing the first`. Record the
  "Recovery phrase 1" rows, import a fresh phrase, then expect groups "Recovery
  phrase 1" and "Recovery phrase 2", the first group's rows unchanged, and
  "Recovery phrase 2" holding one row.
- `Refuses a recovery phrase the wallet already holds`. Import the same fresh
  phrase a second time and expect the text "This recovery phrase is already in
  your wallet" with the groups unchanged.

- [ ] **Step 2: Build and run them**

Run: `yarn build:extension && yarn test:e2e e2e-tests/addWallet.test.ts` on Node
22.12.0. Expected: both new tests pass, and the existing ones in the file still
pass.

- [ ] **Step 3: Run the full unit suite**

Run: `yarn test:ci --testPathIgnorePatterns '.claude/worktrees'` Expected: only
the known local failures (the `.superpowers` scratch suites and
`testNodeCompat`), and nothing new.
