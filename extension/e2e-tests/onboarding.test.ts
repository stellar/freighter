import { shuffle } from "lodash";
import StellarHDWallet from "stellar-hd-wallet";
import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount, PASSWORD } from "./helpers/login";

const { generateMnemonic } = StellarHDWallet;

test.beforeEach(async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
});

test("Welcome page loads", async ({ page }) => {
  await page.locator(".Welcome__column").waitFor();
  await expect(page.getByText("Freighter Wallet")).toBeVisible();
  await expect(page.getByText("Create new wallet")).toBeVisible();
  await expect(page.getByText("I already have a wallet")).toBeVisible();
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
      mask: [page.locator(".MnemonicDisplay__list-item")],
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
  await page.getByText("I already have a wallet").click();
  await expect(page.getByText("Create a Password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();

  const TEST_WORDS = [
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

  for (let i = 1; i <= TEST_WORDS.length; i++) {
    await page.locator(`#MnemonicPhrase-${i}`).fill(TEST_WORDS[i - 1]);
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

  await page.getByText("I already have a wallet").click();
  await expect(page.getByText("Create a Password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();

  await page.evaluate(() => {
    return navigator.clipboard.writeText(
      [
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
      ].join(" "),
    );
  });

  // paste text from clipboard
  await page.locator("#MnemonicPhrase-1").press("Meta+v");

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
  await page.getByText("I already have a wallet").click();
  await expect(page.getByText("Create a Password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
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

  await page.getByText("I already have a wallet").click();
  await expect(page.getByText("Create a Password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
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
  await page.locator("#MnemonicPhrase-1").press("Meta+v");

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
  await page.getByText("I already have a wallet").click();
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
      mask: [page.locator(".MnemonicDisplay__list-item")],
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

test("Logout and create new account", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("account-view-account-name").click();
  const originalAccounts = page.getByTestId("wallet-row-select");
  const originalAccountsCount = await originalAccounts.count();
  // the test seed phrase should have multiple funded accounts
  expect(originalAccountsCount).not.toBe(1);

  await page.getByTestId("BackButton").click();
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Log Out").click();

  await expectPageToHaveScreenshot({
    page,
    screenshot: "unlock-password-overwrite.png",
  });

  const newPagePromise = page.context().waitForEvent("page");

  await page.getByText("Create a wallet").click();

  const newPage = await newPagePromise;
  await expect(
    newPage.getByText(
      "You are overwriting an existing account. You will permanently lose access to the account currently stored in Freighter.",
    ),
  ).toBeVisible();
  await expectPageToHaveScreenshot({
    page: newPage,
    screenshot: "account-creator-overwrite.png",
  });

  await newPage.locator("#new-password-input").fill(PASSWORD);
  await newPage.locator("#confirm-password-input").fill(PASSWORD);
  await newPage.locator("#termsOfUse-input").check({ force: true });
  await newPage.getByText("Confirm").click();

  await newPage.getByText("Do this later").click();
  await expect(newPage.getByText("You’re all set!")).toBeVisible();

  await newPage.goto(`chrome-extension://${extensionId}/index.html#/`);
  await expect(newPage.getByTestId("account-view")).toBeVisible({
    timeout: 10000,
  });
  await newPage.getByTestId("account-view-account-name").click();
  const newAccounts = newPage.getByTestId("wallet-row-select");
  await expect(newAccounts).toBeVisible();
  const newAccountsCount = await newAccounts.count();
  // the new seed phrase should only have one funded account; this confirms that the other accounts are no longer present
  expect(newAccountsCount).toBe(1);

  await newPage.getByTestId("BackButton").click();
  await newPage.getByTestId("account-options-dropdown").click();
  await newPage.getByText("Settings").click();
  await newPage.getByText("Log Out").click();

  await newPage.locator("#password-input").fill(PASSWORD);
  await newPage.getByRole("button", { name: "Unlock" }).click();

  await expect(newPage.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
});

test("Logout and import new account", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("account-view-account-name").click();
  const originalAccounts = page.getByTestId("wallet-row-select");
  const originalAccountsCount = await originalAccounts.count();

  // the test seed phrase should have multiple funded accounts
  expect(originalAccountsCount).not.toBe(1);

  await page.getByTestId("BackButton").click();
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Log Out").click();

  await expectPageToHaveScreenshot({
    page,
    screenshot: "unlock-password-overwrite.png",
  });

  const newPagePromise = page.context().waitForEvent("page");

  await page.getByText("Import using account seed phrase").click();

  const newPage = await newPagePromise;
  await expect(
    newPage.getByText(
      "You are overwriting an existing account. You will permanently lose access to the account currently stored in Freighter.",
    ),
  ).toBeVisible();
  await expectPageToHaveScreenshot({
    page: newPage,
    screenshot: "account-creator-overwrite.png",
  });

  await newPage.locator("#new-password-input").fill(PASSWORD);
  await newPage.locator("#confirm-password-input").fill(PASSWORD);
  await newPage.locator("#termsOfUse-input").check({ force: true });
  await newPage.getByText("Confirm").click();

  await expect(
    newPage.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();

  const TEST_WORDS = generateMnemonic({ entropyBits: 128 }).split(" ");

  for (let i = 1; i <= TEST_WORDS.length; i++) {
    await newPage.locator(`#MnemonicPhrase-${i}`).fill(TEST_WORDS[i - 1]);
  }

  await newPage.getByRole("button", { name: "Import" }).click();

  await expect(newPage.getByText("You’re all set!")).toBeVisible({
    timeout: 20000,
  });

  await newPage.goto(`chrome-extension://${extensionId}/index.html#/`);

  await newPage.getByTestId("account-view-account-name").click();
  const newAccounts = newPage.getByTestId("wallet-row-select");
  await expect(newAccounts).toBeVisible();
  const newAccountsCount = await newAccounts.count();
  // the new seed phrase should only have one funded account; this confirms that the other accounts are no longer present
  expect(newAccountsCount).toBe(1);

  await newPage.getByTestId("BackButton").click();
  await newPage.getByTestId("account-options-dropdown").click();
  await newPage.getByText("Settings").click();
  await newPage.getByText("Log Out").click();

  await newPage.locator("#password-input").fill(PASSWORD);
  await newPage.getByRole("button", { name: "Unlock" }).click();

  await expect(newPage.getByTestId("account-view")).toBeVisible({
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
      "You previously did not complete onboarding. You will permanently lose access to the account you started to create in Freighter.",
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

  await page.getByTestId("BackButton").click();
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Security").click();
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
      "You previously did not complete onboarding. You will permanently lose access to the account you started to create in Freighter.",
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

  await page.getByTestId("BackButton").click();
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Security").click();
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

// Password preservation tests
const TEST_WORDS_RECOVERY = [
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

test("Wrong mnemonic phrase preserves previous state (pw + ToS) and allows retry", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await page.getByText("I already have a wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  const PASSWORD_TEST = "My-password123";
  const CONFIRM_PASSWORD = "My-password123";

  await page.locator("#new-password-input").fill(PASSWORD_TEST);
  await page.locator("#confirm-password-input").fill(CONFIRM_PASSWORD);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();

  const wrongWords = Array(12).fill("invalid");
  for (let i = 1; i <= wrongWords.length; i++) {
    const input = page.locator(`input[name="MnemonicPhrase-${i}"]`);
    await input.fill(wrongWords[i - 1]);
  }

  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Invalid mnemonic phrase")).toBeVisible({
    timeout: 5000,
  });

  const firstMnemonicAfterError = await page
    .locator('input[name="MnemonicPhrase-1"]')
    .inputValue();
  expect(firstMnemonicAfterError).toBe("");

  for (let i = 1; i <= TEST_WORDS_RECOVERY.length; i++) {
    const input = page.locator(`input[name="MnemonicPhrase-${i}"]`);
    await input.fill(TEST_WORDS_RECOVERY[i - 1]);
  }

  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByText("You’re all set!")).toBeVisible({
    timeout: 10000,
  });
});

test("Wrong mnemonic phrase clears mnemonic inputs but preserves pw + ToS from previous page", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await page.getByText("I already have a wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  const PASSWORD_TEST = "SecurePass456";
  const CONFIRM_PASSWORD = "SecurePass456";

  await page.locator("#new-password-input").fill(PASSWORD_TEST);
  await page.locator("#confirm-password-input").fill(CONFIRM_PASSWORD);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();

  for (let i = 1; i <= TEST_WORDS_RECOVERY.length; i++) {
    const input = page.locator(`input[name="MnemonicPhrase-${i}"]`);
    await input.fill("wrong");
  }

  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Invalid mnemonic phrase")).toBeVisible({
    timeout: 5000,
  });

  const firstMnemonicAfterError = await page
    .locator('input[name="MnemonicPhrase-1"]')
    .inputValue();
  expect(firstMnemonicAfterError).toBe("");

  for (let i = 1; i <= TEST_WORDS_RECOVERY.length; i++) {
    const input = page.locator(`input[name="MnemonicPhrase-${i}"]`);
    await input.fill(TEST_WORDS_RECOVERY[i - 1]);
  }

  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("You’re all set!")).toBeVisible({
    timeout: 10000,
  });
});

test("Switch mnemonic phrase length preserves  previous state (pw + ToS)", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await page.getByText("I already have a wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  const PASSWORD_TEST = "AnotherPass789";

  await page.locator("#new-password-input").fill(PASSWORD_TEST);
  await page.locator("#confirm-password-input").fill(PASSWORD_TEST);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();

  const toggleLabel = page.locator('label[for="RecoverAccount__toggle"]');
  await toggleLabel.click();

  await page
    .locator('input[name="MnemonicPhrase-13"]')
    .waitFor({ state: "visible" });

  await toggleLabel.click();

  await page
    .locator('input[name="MnemonicPhrase-12"]')
    .waitFor({ state: "visible" });

  for (let i = 1; i <= TEST_WORDS_RECOVERY.length; i++) {
    const input = page.locator(`input[name="MnemonicPhrase-${i}"]`);
    await input.fill(TEST_WORDS_RECOVERY[i - 1]);
  }

  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByText("You’re all set!")).toBeVisible({
    timeout: 10000,
  });
});

test("Enter wrong mnemonic multiple times and retry preserves previous state (pw + ToS) and allows successful import", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await page.getByText("I already have a wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  const PASSWORD_TEST = "PasteTestPass123";

  await page.locator("#new-password-input").fill(PASSWORD_TEST);
  await page.locator("#confirm-password-input").fill(PASSWORD_TEST);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();

  for (let i = 1; i <= 12; i++) {
    const input = page.locator(`input[name="MnemonicPhrase-${i}"]`);
    await input.fill("wrong");
  }

  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Invalid mnemonic phrase")).toBeVisible({
    timeout: 5000,
  });

  for (let i = 1; i <= TEST_WORDS_RECOVERY.length; i++) {
    const input = page.locator(`input[name="MnemonicPhrase-${i}"]`);
    await input.fill(TEST_WORDS_RECOVERY[i - 1]);
  }

  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("You’re all set!")).toBeVisible({
    timeout: 10000,
  });
});

test("Multiple failed attempts preserve state across retries (pw + ToS)", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await page.getByText("I already have a wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  const PASSWORD_TEST = "MultiRetryPass999";
  const CONFIRM_PASSWORD = "MultiRetryPass999";

  await page.locator("#new-password-input").fill(PASSWORD_TEST);
  await page.locator("#confirm-password-input").fill(CONFIRM_PASSWORD);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();

  for (let i = 1; i <= TEST_WORDS_RECOVERY.length; i++) {
    const input = page.locator(`input[name="MnemonicPhrase-${i}"]`);
    await input.fill("attempt1");
  }
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Invalid mnemonic phrase")).toBeVisible({
    timeout: 5000,
  });

  for (let i = 1; i <= TEST_WORDS_RECOVERY.length; i++) {
    const input = page.locator(`input[name="MnemonicPhrase-${i}"]`);
    await input.fill("attempt2");
  }
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Invalid mnemonic phrase")).toBeVisible({
    timeout: 5000,
  });

  for (let i = 1; i <= TEST_WORDS_RECOVERY.length; i++) {
    const input = page.locator(`input[name="MnemonicPhrase-${i}"]`);
    await input.fill(TEST_WORDS_RECOVERY[i - 1]);
  }
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("You’re all set!")).toBeVisible({
    timeout: 10000,
  });
});
