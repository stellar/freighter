import { shuffle } from "lodash";
import StellarHDWallet from "stellar-hd-wallet";
import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount, PASSWORD } from "./helpers/login";
import {
  openImportWallet,
  enterImportSecret,
  fillPasswordAndConfirm,
  waitForOnboardingReady,
} from "./helpers/onboarding";
import { stubAllExternalApis } from "./helpers/stubs";
import type { Page } from "@playwright/test";
import { goToSettings } from "./helpers/network";

const { generateMnemonic } = StellarHDWallet;

// Shared test mnemonic for 12-word wallet import tests
const TEST_MNEMONIC_12_WORDS = [
  "have",
  "style",
  "milk",
  "flush",
  "you",
  "possible",
  "thrive",
  "dice",
  "delay",
  "police",
  "seminar",
  "face",
];

test.beforeEach(async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
});

test("Welcome page loads", async ({ page }) => {
  await page.locator(".Welcome").waitFor();
  await expect(
    page.getByRole("heading", { name: "Welcome to Varial" }),
  ).toBeVisible();
  await expect(page.getByText("Your favorite Stellar wallet")).toBeVisible();
  await expect(page.getByText("Freighter is now Varial")).toBeVisible();
  await expect(page.getByText("Create new wallet")).toBeVisible();
  await expect(page.getByText("Import wallet")).toBeVisible();
  await expectPageToHaveScreenshot({ page, screenshot: "welcome-page.png" });
});

test("Create new wallet", async ({ page }) => {
  await page.getByText("Create new wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(page.getByTestId("MnemonicPhrase__modal")).toBeVisible();
  await expectPageToHaveScreenshot({ page, screenshot: "recovery-modal.png" });

  await page.getByText("Show recovery phrase").click();

  await expectPageToHaveScreenshot(
    { page, screenshot: "recovery-page.png" },
    {
      mask: [page.locator(".MnemonicDisplay__word")],
    },
  );

  const domWords = page.getByTestId("word");
  const wordCount = await domWords.count();
  const words = [] as string[];
  for (let i = 0; i < wordCount; i++) {
    const word = await domWords.nth(i).innerText();
    words.push(word);
  }

  await page
    .getByTestId("display-mnemonic-phrase-next-btn")
    .click({ force: true });
  await expect(page.getByText("Confirm your recovery phrase")).toBeVisible();

  await expectPageToHaveScreenshot(
    { page, screenshot: "confirm-recovery-page.png" },
    {
      mask: [page.locator(".ConfirmMnemonicPhrase__word-bubble-wrapper")],
    },
  );

  for (let i = 0; i < words.length; i++) {
    await page.getByLabel(words[i]).check({ force: true });
  }
  await page.getByTestId("display-mnemonic-phrase-confirm-btn").click();
  await waitForOnboardingReady({ page });
  await expectPageToHaveScreenshot({
    page,
    screenshot: "wallet-create-complete-page.png",
  });
});

const TEST_MNEMONIC_24_WORDS = [
  "shrug",
  "absent",
  "sausage",
  "later",
  "salute",
  "mesh",
  "increase",
  "flavor",
  "pilot",
  "patch",
  "pole",
  "twenty",
  "chef",
  "coffee",
  "faint",
  "apology",
  "crucial",
  "scene",
  "attend",
  "replace",
  "wolf",
  "error",
  "swift",
  "device",
];

// Fixed testnet secret key, generated once for these tests. Unfunded; the
// tests only need an account to exist.
// GC73WAR74OMJ7VZPY6777H2HY7DHECD4Q3JAOREK255L2D2IPSDOMZJK
const TEST_SECRET_KEY =
  "SBNBH3UWCW4WH5NIUSU624EVRZCQY4RWKDRDFSMJKBTVXHTFYIJP3RBA";

const INVALID_INPUT_ERROR = "Enter a valid recovery phrase or secret key";

test("Import 12 word wallet", async ({ page }) => {
  await openImportWallet({ page });
  await expect(page.getByText("Import Wallet", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Import your wallet using a recovery phrase or secret key"),
  ).toBeVisible();
  await expect(page.getByTestId("import-secret-next")).toBeDisabled();

  await page
    .getByTestId("import-secret-input")
    .fill(TEST_MNEMONIC_12_WORDS.join(" "));

  await expectPageToHaveScreenshot(
    {
      page,
      screenshot: "wallet-import-12-word-phrase-page.png",
    },
    { mask: [page.getByTestId("import-secret-input")] },
  );

  await page.getByTestId("import-secret-next").click();
  await fillPasswordAndConfirm({ page, password: PASSWORD });

  await expect(page.getByText("Your wallet is ready!")).toBeVisible({
    timeout: 20000,
  });
  await waitForOnboardingReady({ page });
  await expectPageToHaveScreenshot({
    page,
    screenshot: "wallet-import-complete-page.png",
  });
});

test("Import 12 word wallet by pasting", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await openImportWallet({ page });

  await page.evaluate((argMnemonic) => {
    return navigator.clipboard.writeText(argMnemonic.join(" "));
  }, TEST_MNEMONIC_12_WORDS);

  // paste text from clipboard
  await page.getByTestId("import-secret-input").focus();
  await page.getByTestId("import-secret-input").press("ControlOrMeta+v");
  await expect(page.getByTestId("import-secret-input")).toHaveValue(
    TEST_MNEMONIC_12_WORDS.join(" "),
  );

  // confirm the clipboard has been cleared
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("");

  await page.getByTestId("import-secret-next").click();
  await fillPasswordAndConfirm({ page, password: PASSWORD });
  await waitForOnboardingReady({ page });
});

test("Import 24 word wallet", async ({ page }) => {
  await openImportWallet({ page });
  await page
    .getByTestId("import-secret-input")
    .fill(TEST_MNEMONIC_24_WORDS.join(" "));

  await expectPageToHaveScreenshot(
    {
      page,
      screenshot: "wallet-import-24-word-phrase-page.png",
      threshold: 0.03,
    },
    { mask: [page.getByTestId("import-secret-input")] },
  );

  await page.getByTestId("import-secret-next").click();
  await fillPasswordAndConfirm({ page, password: PASSWORD });
  await waitForOnboardingReady({ page });
  await expectPageToHaveScreenshot({
    page,
    screenshot: "wallet-import-complete-page.png",
  });
});

test("Import 24 word wallet by pasting", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await openImportWallet({ page });

  await page.evaluate(
    (argMnemonic) => navigator.clipboard.writeText(argMnemonic.join(" ")),
    TEST_MNEMONIC_24_WORDS,
  );

  // paste text from clipboard
  await page.getByTestId("import-secret-input").focus();
  await page.getByTestId("import-secret-input").press("ControlOrMeta+v");
  await expect(page.getByTestId("import-secret-input")).toHaveValue(
    TEST_MNEMONIC_24_WORDS.join(" "),
  );

  // confirm the clipboard has been cleared
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("");

  await page.getByTestId("import-secret-next").click();
  await fillPasswordAndConfirm({ page, password: PASSWORD });
  await waitForOnboardingReady({ page });
});

test("onboards with a secret key", async ({ page, extensionId, context }) => {
  test.slow();
  await stubAllExternalApis(page, context);
  await openImportWallet({ page });
  await enterImportSecret({ page, secret: TEST_SECRET_KEY });
  await fillPasswordAndConfirm({ page, password: PASSWORD });

  await expect(page.getByText("Your wallet is ready!")).toBeVisible({
    timeout: 20000,
  });
  await waitForOnboardingReady({ page });

  await page.goto(`chrome-extension://${extensionId}/index.html#/`);
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  await page.getByTestId("account-view-account-name").click();
  await expect(page.getByTestId("wallet-row-select")).toHaveCount(1);
  await page.getByTestId("AccountSheet__close").click();

  await goToSettings(page);
  await page.getByRole("link", { name: "Security" }).click();
  await expect(
    page.getByRole("link", { name: "Advanced settings" }),
  ).toBeVisible();
  await expect(page.getByText("Show recovery phrase")).toHaveCount(0);
});

test("The import text box masks its value until shown", async ({ page }) => {
  await openImportWallet({ page });
  const input = page.getByTestId("import-secret-input");
  const visibility = page.getByTestId("import-secret-visibility");

  await input.fill(TEST_SECRET_KEY);
  await expect(input).toHaveClass(/RecoverAccount__input--masked/);
  await expect(visibility).toHaveAttribute("aria-pressed", "false");

  await visibility.click();
  await expect(input).not.toHaveClass(/RecoverAccount__input--masked/);
  await expect(visibility).toHaveAttribute("aria-pressed", "true");

  await visibility.click();
  await expect(input).toHaveClass(/RecoverAccount__input--masked/);
});

test("Import wallet with wrong password", async ({ page }) => {
  await openImportWallet({ page });
  await enterImportSecret({
    page,
    secret: TEST_MNEMONIC_12_WORDS.join(" "),
  });
  await expect(page.getByText("Create a password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("Not-my-password123");
  await page.locator("#termsOfUse-input").focus();

  await expect(page.getByText("Passwords must match")).toBeVisible();
  await expectPageToHaveScreenshot(
    { page, screenshot: "recovery-bad-password.png" },
    {
      mask: [
        page.locator("#new-password-input"),
        page.locator("#confirm-password-input"),
      ],
    },
  );
});

test("Incorrect mnemonic phrase", async ({ page }) => {
  await page.getByText("Create new wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(page.getByTestId("MnemonicPhrase__modal")).toBeVisible();
  await expectPageToHaveScreenshot({ page, screenshot: "recovery-modal.png" });

  await page.getByText("Show recovery phrase").click();
  await expectPageToHaveScreenshot(
    { page, screenshot: "recovery-page.png" },
    {
      mask: [page.locator(".MnemonicDisplay__word")],
    },
  );

  const domWords = page.getByTestId("word");
  const wordCount = await domWords.count();
  const words = [] as string[];
  for (let i = 0; i < wordCount; i++) {
    const word = await domWords.nth(i).innerText();
    words.push(word);
  }

  await page.getByTestId("display-mnemonic-phrase-next-btn").click();
  await expect(page.getByText("Confirm your recovery phrase")).toBeVisible();

  const shuffledWords = shuffle(words);

  for (let i = 0; i < shuffledWords.length; i++) {
    await page.getByLabel(shuffledWords[i]).check({ force: true });
  }

  await page.getByTestId("display-mnemonic-phrase-confirm-btn").click();
  await expect(page.getByText("Order is incorrect, try again")).toBeVisible();
  await expectPageToHaveScreenshot(
    { page, screenshot: "incorrect-recovery-phrase-page.png" },
    {
      mask: [page.locator(".ConfirmMnemonicPhrase__word-bubble-wrapper")],
    },
  );
});

// Logs out, resets the wallet from the lock screen and returns the Welcome
// tab that opens, once the wallet is confirmed gone. The original page stays
// on the lock screen.
const resetWalletFromLockScreen = async (page: Page, extensionId: string) => {
  await goToSettings(page);
  await page.getByText("Log Out").click();

  await expect(page.getByText("Welcome back")).toBeVisible();
  await expectPageToHaveScreenshot({ page, screenshot: "lock-screen.png" });

  await page.getByTestId("forgot-password-button").click();
  await expect(page.getByTestId("forgot-password-sheet")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "forgot-password-sheet.png",
  });

  const welcomePagePromise = page.context().waitForEvent("page");
  await page.getByTestId("forgot-password-sheet-reset").click();
  const welcomePage = await welcomePagePromise;

  await expect(welcomePage.getByText("Create new wallet")).toBeVisible();
  await expect(page.getByTestId("forgot-password-sheet")).toBeHidden();

  // The Welcome tab opens as soon as the reset call returns, and creating or
  // importing a wallet overwrites any wallet that is still stored. Without
  // this check a reset that erased nothing would pass every assertion below.
  // The root route shows Welcome only when no wallet is stored, and the lock
  // screen otherwise.
  await welcomePage.goto(`chrome-extension://${extensionId}/index.html`);
  await expect(welcomePage.getByText("Import wallet")).toBeVisible();
  await expect(welcomePage.getByText("Welcome back")).toHaveCount(0);
  return welcomePage;
};

const expectOldWalletAccountsCount = async (page: Page) => {
  await page.getByTestId("account-view-account-name").click();
  // the test seed phrase should have multiple funded accounts
  expect(await page.getByTestId("wallet-row-select").count()).not.toBe(1);
  await page.getByTestId("AccountSheet__close").click();
};

const expectOnlyNewWalletAccount = async (page: Page, extensionId: string) => {
  await page.goto(`chrome-extension://${extensionId}/index.html#/`);
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 10000,
  });
  await page.getByTestId("account-view-account-name").click();
  const accounts = page.getByTestId("wallet-row-select");
  await expect(accounts).toBeVisible();
  // the new wallet has a single account; the old wallet's accounts are gone
  expect(await accounts.count()).toBe(1);
};

// The page where the reset started is still on the lock screen; the new
// wallet's password unlocks it.
const unlockOriginalPage = async (page: Page) => {
  await expect(page.getByText("Welcome back")).toBeVisible();
  await page.locator("#password-input").fill(PASSWORD);
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
};

const fillNewPassword = async (page: Page) => {
  await expect(page.locator("#new-password-input")).toBeVisible();
  await expect(page.getByText(/overwriting an existing account/)).toHaveCount(
    0,
  );
  await page.locator("#new-password-input").fill(PASSWORD);
  await page.locator("#confirm-password-input").fill(PASSWORD);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();
};

test("Reset wallet and create a new wallet", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  await expectOldWalletAccountsCount(page);

  const welcomePage = await resetWalletFromLockScreen(page, extensionId);

  await welcomePage.getByText("Create new wallet").click();
  await fillNewPassword(welcomePage);
  await welcomePage.getByText("Do this later").click();
  await waitForOnboardingReady({ page: welcomePage });

  await expectOnlyNewWalletAccount(welcomePage, extensionId);
  await unlockOriginalPage(page);
});

test("Reset wallet and import a wallet", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  await expectOldWalletAccountsCount(page);

  const welcomePage = await resetWalletFromLockScreen(page, extensionId);

  await openImportWallet({ page: welcomePage });
  const TEST_WORDS = generateMnemonic({ entropyBits: 128 }).split(" ");
  await enterImportSecret({ page: welcomePage, secret: TEST_WORDS.join(" ") });
  await fillNewPassword(welcomePage);
  await waitForOnboardingReady({ page: welcomePage });

  await expectOnlyNewWalletAccount(welcomePage, extensionId);
  await unlockOriginalPage(page);
});

test("Closing the Forgot password sheet keeps the wallet", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  await goToSettings(page);
  await page.getByText("Log Out").click();
  const unlockButton = page.getByTestId("enter-password-submit");
  await expect(unlockButton).toBeVisible();
  const unlockBox = await unlockButton.boundingBox();

  await page.getByTestId("forgot-password-button").click();
  await expect(page.getByTestId("forgot-password-sheet")).toBeVisible();
  // "Reset wallet" is the same height as the lock screen's Unlock button.
  const resetBox = await page
    .getByTestId("forgot-password-sheet-reset")
    .boundingBox();
  expect(resetBox?.height).toBe(unlockBox?.height);
  await page.getByTestId("forgot-password-sheet-close").click();
  await expect(page.getByTestId("forgot-password-sheet")).toBeHidden();

  await page.locator("#password-input").fill(PASSWORD);
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
});

/* This test is designed to confirm that abandoning mnemonic phrase confirmation overwrites the existing account. */
test("Overwrites account when user abandons mnemonic phrase confirmation", async ({
  page,
  extensionId,
}) => {
  await page.getByText("Create new wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(page.getByTestId("MnemonicPhrase__modal")).toBeVisible();

  await page.getByText("Show recovery phrase").click();
  await page.goBack();

  await page.getByText("Create new wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  await expect(
    page.getByText(
      "You previously did not complete onboarding. You will permanently lose access to the account you started to create in Varial.",
    ),
  ).toBeVisible();

  await page.locator("#new-password-input").fill(PASSWORD);
  await page.locator("#confirm-password-input").fill(PASSWORD);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await page.getByText("Show recovery phrase").click();
  const words = await page.getByTestId("word").all();
  const onboardingWordsArr = await Promise.all(
    words.map(async (word) => await word.innerText()),
  );
  await page.getByTestId("display-mnemonic-phrase-next-btn").click();
  await page.getByTestId("display-mnemonic-phrase-skip-btn").click();

  await waitForOnboardingReady({ page });

  await page.goto(`chrome-extension://${extensionId}/index.html#/`);
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 10000,
  });

  await expect(page.getByTestId("account-view-account-name")).toHaveText(
    "Account 1",
  );
  await page.getByTestId("account-view-account-name").click();

  await expect(page.getByTestId("wallet-row-select")).toHaveCount(1);

  await page.getByTestId("AccountSheet__close").click();
  await goToSettings(page);
  await page.getByRole("link", { name: "Security" }).click();
  await page.getByText("Show recovery phrase").click();

  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Show recovery phrase" }).click();

  await expect(page.getByTestId("AppHeaderPageTitle")).toHaveText(
    "Your recovery phrase",
  );

  const recoveryWords = await page.getByTestId("word").all();
  const recoverWordsArr = await Promise.all(
    recoveryWords.map(async (word) => await word.innerText()),
  );

  expect(recoverWordsArr).toEqual(onboardingWordsArr);
});

/* This test is designed to confirm that abandoning account creation after entering a password does not create a new account. */
test("Overwrites account when user abandons after password creation", async ({
  page,
  extensionId,
}) => {
  await page.getByText("Create new wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();
  await expect(page.getByText("Do this later")).toBeVisible();

  await page.goBack();

  await page.getByText("Create new wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  await expect(
    page.getByText(
      "You previously did not complete onboarding. You will permanently lose access to the account you started to create in Varial.",
    ),
  ).toBeVisible();

  await page.locator("#new-password-input").fill(PASSWORD);
  await page.locator("#confirm-password-input").fill(PASSWORD);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await page.getByText("Show recovery phrase").click();
  const words = await page.getByTestId("word").all();
  const onboardingWordsArr = await Promise.all(
    words.map(async (word) => await word.innerText()),
  );
  await page.getByTestId("display-mnemonic-phrase-next-btn").click();
  await page.getByTestId("display-mnemonic-phrase-skip-btn").click();
  await waitForOnboardingReady({ page });

  await page.goto(`chrome-extension://${extensionId}/index.html#/`);
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 10000,
  });

  await expect(page.getByTestId("account-view-account-name")).toHaveText(
    "Account 1",
  );
  await page.getByTestId("account-view-account-name").click();

  expect(page.getByTestId("wallet-row-select")).toHaveCount(1);

  await page.getByTestId("AccountSheet__close").click();
  await goToSettings(page);
  await page.getByRole("link", { name: "Security" }).click();
  await page.getByText("Show recovery phrase").click();

  await page.locator("#password").fill(PASSWORD);
  await page.getByRole("button", { name: "Show recovery phrase" }).click();

  await expect(page.getByTestId("AppHeaderPageTitle")).toHaveText(
    "Your recovery phrase",
  );

  const recoveryWords = await page.getByTestId("word").all();
  const recoverWordsArr = await Promise.all(
    recoveryWords.map(async (word) => await word.innerText()),
  );

  expect(recoverWordsArr).toEqual(onboardingWordsArr);
});

test("Password input is auto focused on Show recovery phrase screen", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  await goToSettings(page);
  await page.getByRole("link", { name: "Security" }).click();
  await page.getByText("Show recovery phrase").click();
  await expect(page.locator("#password")).toBeFocused();
});

// Input validation and retry
test("Invalid recovery phrase shows an error and allows retry", async ({
  page,
}) => {
  test.slow();
  await openImportWallet({ page });

  await enterImportSecret({
    page,
    secret: Array(12).fill("invalid").join(" "),
  });
  await expect(page.getByText(INVALID_INPUT_ERROR)).toBeVisible();
  // Next does not open the password step for invalid input.
  await expect(page.locator("#new-password-input")).toHaveCount(0);

  // Editing the value clears the error.
  await page
    .getByTestId("import-secret-input")
    .fill(TEST_MNEMONIC_12_WORDS.join(" "));
  await expect(page.getByText(INVALID_INPUT_ERROR)).toHaveCount(0);

  await page.getByTestId("import-secret-next").click();
  await fillPasswordAndConfirm({ page, password: "SecurePass456" });
  await waitForOnboardingReady({ page });
});

test("Invalid secret key shows an error", async ({ page }) => {
  await openImportWallet({ page });

  // A secret key with its last character changed fails the checksum.
  const badSecret = `${TEST_SECRET_KEY.slice(0, -1)}${
    TEST_SECRET_KEY.endsWith("A") ? "B" : "A"
  }`;
  await enterImportSecret({ page, secret: badSecret });
  await expect(page.getByText(INVALID_INPUT_ERROR)).toBeVisible();
  await expect(page.locator("#new-password-input")).toHaveCount(0);
});

test("Multiple invalid attempts then a valid phrase imports", async ({
  page,
}) => {
  test.slow();
  await openImportWallet({ page });

  await enterImportSecret({
    page,
    secret: Array(12).fill("attempt1").join(" "),
  });
  await expect(page.getByText(INVALID_INPUT_ERROR)).toBeVisible();

  await enterImportSecret({
    page,
    secret: Array(24).fill("attempt2").join(" "),
  });
  await expect(page.getByText(INVALID_INPUT_ERROR)).toBeVisible();

  await enterImportSecret({
    page,
    secret: TEST_MNEMONIC_12_WORDS.join(" "),
  });
  await fillPasswordAndConfirm({ page, password: "MultiRetryPass999" });
  await waitForOnboardingReady({ page });
});

test("Back from the password step keeps the entered value", async ({
  page,
}) => {
  test.slow();
  await openImportWallet({ page });
  await enterImportSecret({
    page,
    secret: TEST_MNEMONIC_12_WORDS.join(" "),
  });
  await expect(page.locator("#new-password-input")).toBeVisible();

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByTestId("import-secret-input")).toHaveValue(
    TEST_MNEMONIC_12_WORDS.join(" "),
  );

  await page.getByTestId("import-secret-next").click();
  await fillPasswordAndConfirm({ page, password: "AnotherPass789" });
  await waitForOnboardingReady({ page });
});
