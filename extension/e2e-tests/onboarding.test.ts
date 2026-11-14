import { shuffle } from "lodash";
import StellarHDWallet from "stellar-hd-wallet";
import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount, PASSWORD } from "./helpers/login";
import {
  startImportWalletFlow,
  fillMnemonicInputs,
  clickImportAndWaitForSuccess,
} from "./helpers/onboarding";
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
  await expect(page.getByText("You’re all set!")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "wallet-create-complete-page.png",
  });
});

test("Import 12 word wallet", async ({ page }) => {
  await page.getByText("Import wallet").click();
  await expect(page.getByText("Create a Password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();
  await expect(
    page.getByText("You can also paste the phrase in the first box."),
  ).toBeVisible();

  for (let i = 1; i <= TEST_MNEMONIC_12_WORDS.length; i++) {
    await page
      .locator(`#MnemonicPhrase-${i}`)
      .fill(TEST_MNEMONIC_12_WORDS[i - 1]);
  }

  await expectPageToHaveScreenshot(
    {
      page,
      screenshot: "wallet-import-12-word-phrase-page.png",
    },
    { mask: [page.locator(".RecoverAccount__mnemonic-input")] },
  );

  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByText("You’re all set!")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "wallet-import-complete-page.png",
  });
});

test("Import 12 word wallet by pasting", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.getByText("Import wallet").click();
  await expect(page.getByText("Create a Password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();
  await expect(
    page.getByText("You can also paste the phrase in the first box."),
  ).toBeVisible();

  await page.evaluate((argMnemonic) => {
    return navigator.clipboard.writeText(argMnemonic.join(" "));
  }, TEST_MNEMONIC_12_WORDS);

  // paste text from clipboard
  await page.locator("#MnemonicPhrase-1").press("ControlOrMeta+v");

  await expectPageToHaveScreenshot(
    {
      page,
      screenshot: "wallet-import-12-word-phrase-page.png",
    },
    { mask: [page.locator(".RecoverAccount__mnemonic-input")] },
  );

  // confirm the clipboard has been cleared
  const clipboardData = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(clipboardData).toBe("");

  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByText("You’re all set!")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "wallet-import-complete-page.png",
  });
});

test("Import 24 word wallet", async ({ page }) => {
  await page.getByText("Import wallet").click();
  await expect(page.getByText("Create a Password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();
  await expect(
    page.getByText("You can also paste the phrase in the first box."),
  ).toBeVisible();
  await page.locator(".RecoverAccount__phrase-toggle > label").click();

  const TEST_WORDS = [
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

  for (let i = 1; i <= TEST_WORDS.length; i++) {
    await page.locator(`#MnemonicPhrase-${i}`).fill(TEST_WORDS[i - 1]);
  }

  await expectPageToHaveScreenshot(
    {
      page,
      screenshot: "wallet-import-24-word-phrase-page.png",
      threshold: 0.03,
    },
    {
      mask: [page.locator(".RecoverAccount__mnemonic-wrapper")],
    },
  );

  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByText("You’re all set!")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "wallet-import-complete-page.png",
  });
});

test("Import 24 word wallet by pasting", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  await page.getByText("Import wallet").click();
  await expect(page.getByText("Create a Password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();
  await expect(
    page.getByText("You can also paste the phrase in the first box."),
  ).toBeVisible();

  await page.evaluate(() =>
    navigator.clipboard.writeText(
      [
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
      ].join(" "),
    ),
  );

  // paste text from clipboard
  await page.locator("#MnemonicPhrase-1").press("ControlOrMeta+v");

  await expectPageToHaveScreenshot(
    {
      page,
      screenshot: "wallet-import-12-word-phrase-page.png",
    },
    { mask: [page.locator(".RecoverAccount__mnemonic-input")] },
  );

  // confirm the clipboard has been cleared
  const clipboardData = await page.evaluate(() =>
    navigator.clipboard.readText(),
  );
  expect(clipboardData).toBe("");

  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByText("You’re all set!")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "wallet-import-complete-page.png",
  });
});

test("Import wallet with wrong password", async ({ page }) => {
  await page.getByText("Import wallet").click();
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
  await expect(welcomePage.getByText("You’re all set!")).toBeVisible();

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

  await welcomePage.getByText("Import wallet").click();
  await fillNewPassword(welcomePage);
  await expect(
    welcomePage.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();

  const TEST_WORDS = generateMnemonic({ entropyBits: 128 }).split(" ");
  for (let i = 1; i <= TEST_WORDS.length; i++) {
    await welcomePage.locator(`#MnemonicPhrase-${i}`).fill(TEST_WORDS[i - 1]);
  }
  await welcomePage.getByRole("button", { name: "Import" }).click();
  await expect(welcomePage.getByText("You’re all set!")).toBeVisible({
    timeout: 20000,
  });

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

  await expect(page.getByText("You’re all set!")).toBeVisible();

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
  await expect(page.getByText("You’re all set!")).toBeVisible();

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

// Password preservation tests
test("Wrong mnemonic phrase preserves previous state (pw + ToS) and allows retry", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await page.goto(`chrome-extension://${extensionId}/index.html`);

  const PASSWORD_TEST = "My-password123";
  await startImportWalletFlow({ page, password: PASSWORD_TEST });

  const wrongWords = Array(12).fill("invalid");
  await fillMnemonicInputs({ page, words: wrongWords });

  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Invalid mnemonic phrase")).toBeVisible({
    timeout: 5000,
  });

  const firstMnemonicAfterError = await page
    .locator('input[name="MnemonicPhrase-1"]')
    .inputValue();
  expect(firstMnemonicAfterError).toBe("");

  await fillMnemonicInputs({ page, words: TEST_MNEMONIC_12_WORDS });

  await clickImportAndWaitForSuccess({ page });
});

test("Wrong mnemonic phrase clears mnemonic inputs but preserves pw + ToS from previous page", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await page.goto(`chrome-extension://${extensionId}/index.html`);

  const PASSWORD_TEST = "SecurePass456";
  await startImportWalletFlow({ page, password: PASSWORD_TEST });

  const wrongWords = Array(TEST_MNEMONIC_12_WORDS.length).fill("wrong");
  await fillMnemonicInputs({ page, words: wrongWords });

  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Invalid mnemonic phrase")).toBeVisible({
    timeout: 5000,
  });

  const firstMnemonicAfterError = await page
    .locator('input[name="MnemonicPhrase-1"]')
    .inputValue();
  expect(firstMnemonicAfterError).toBe("");

  await fillMnemonicInputs({ page, words: TEST_MNEMONIC_12_WORDS });
  await clickImportAndWaitForSuccess({ page });
});

test("Switch mnemonic phrase length preserves previous state (pw + ToS)", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await page.goto(`chrome-extension://${extensionId}/index.html`);

  const PASSWORD_TEST = "AnotherPass789";
  await startImportWalletFlow({ page, password: PASSWORD_TEST });

  const toggleLabel = page.locator('label[for="RecoverAccount__toggle"]');
  const input12 = page.locator('input[name="MnemonicPhrase-12"]');
  const input13 = page.locator('input[name="MnemonicPhrase-13"]');

  await expect(toggleLabel).toBeVisible();
  await expect(input12).toBeVisible();
  await expect(input13).toBeHidden();

  await toggleLabel.click();
  await expect(input13).toBeVisible();

  await toggleLabel.click();
  await expect(input13).toBeHidden();
  await expect(input12).toBeVisible();

  await fillMnemonicInputs({ page, words: TEST_MNEMONIC_12_WORDS });

  await clickImportAndWaitForSuccess({ page });
});

test("Enter wrong mnemonic multiple times and retry preserves previous state (pw + ToS) and allows successful import", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await page.goto(`chrome-extension://${extensionId}/index.html`);

  const PASSWORD_TEST = "PasteTestPass123";
  await startImportWalletFlow({ page, password: PASSWORD_TEST });

  const wrongWords = Array(12).fill("wrong");
  await fillMnemonicInputs({ page, words: wrongWords });

  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Invalid mnemonic phrase")).toBeVisible({
    timeout: 5000,
  });

  await fillMnemonicInputs({ page, words: TEST_MNEMONIC_12_WORDS });

  await clickImportAndWaitForSuccess({ page });
});

test("Multiple failed attempts preserve state across retries (pw + ToS)", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await page.goto(`chrome-extension://${extensionId}/index.html`);

  const PASSWORD_TEST = "MultiRetryPass999";
  await startImportWalletFlow({ page, password: PASSWORD_TEST });

  const attempt1Words = Array(TEST_MNEMONIC_12_WORDS.length).fill("attempt1");
  await fillMnemonicInputs({ page, words: attempt1Words });
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Invalid mnemonic phrase")).toBeVisible({
    timeout: 5000,
  });

  const attempt2Words = Array(TEST_MNEMONIC_12_WORDS.length).fill("attempt2");
  await fillMnemonicInputs({ page, words: attempt2Words });
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Invalid mnemonic phrase")).toBeVisible({
    timeout: 5000,
  });

  await fillMnemonicInputs({ page, words: TEST_MNEMONIC_12_WORDS });
  await clickImportAndWaitForSuccess({ page });
});
