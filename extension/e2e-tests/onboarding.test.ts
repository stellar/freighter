import { shuffle } from "lodash";
import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";

test.beforeEach(async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
});

test("Welcome page loads", async ({ page }) => {
  await page.locator(".Welcome__column").waitFor();
  await expect(page.getByText("Welcome to Freighter")).toBeVisible();
  await expect(page.getByText("Your favorite Stellar wallet")).toBeVisible();
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
    await page.getByTestId(words[i]).check({ force: true });
  }
  await page.getByTestId("display-mnemonic-phrase-confirm-btn").click();
  await expect(page.getByText("You’re all set!")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "wallet-create-complete-page.png",
  });
});

test("Import 12 word wallet", async ({ page }) => {
  await page.getByText("Import Wallet").click();
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

test("Import 24 word wallet", async ({ page }) => {
  await page.getByText("Import Wallet").click();
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

test("Import wallet with wrong password", async ({ page }) => {
  await page.getByText("Import Wallet").click();
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
    await page.getByTestId(shuffledWords[i]).check({ force: true });
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
