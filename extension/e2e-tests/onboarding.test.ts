import { shuffle } from "lodash";
import { test, expect } from "./test-fixtures";

test.beforeEach(async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
});

test("Welcome page loads", async ({ page }) => {
  await expect(
    page.getByText("Welcome! Is this your first time using Freighter?"),
  ).toBeVisible();
  await expect(page.getByText("I’m going to need a seed phrase")).toBeVisible();
  await expect(page.getByText("I’ve done this before")).toBeVisible();
  // await expect(page).toHaveScreenshot("welcome-page.png");
});

test("Create new wallet", async ({ page }) => {
  // await expect(page).toHaveScreenshot("welcome-page.png");
  await page.getByText("Create Wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(page.getByText("Secret Recovery phrase")).toBeVisible();
  // await expect(page).toHaveScreenshot("recovery-page.png", {
  //   mask: [page.locator(".MnemonicDisplay__list-item")],
  // });

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

  // await expect(page).toHaveScreenshot("confirm-recovery-page.png", {
  //   mask: [page.locator(".ConfirmMnemonicPhrase__word-bubble-wrapper")],
  // });

  for (let i = 0; i < words.length; i++) {
    await page.getByTestId(words[i]).check({ force: true });
  }
  await page.getByTestId("display-mnemonic-phrase-confirm-btn").click();
  await expect(
    page.getByText("Your Freighter install is complete"),
  ).toBeVisible();
  // await expect(page).toHaveScreenshot("wallet-create-complete-page.png");
});

test("Import 12 word wallet", async ({ page }) => {
  // await expect(page).toHaveScreenshot("welcome-page.png");
  await page.getByText("Import Wallet").click();
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

  await page.locator("#password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByText("Wallet created successfully!")).toBeVisible();
  // await expect(page).toHaveScreenshot("wallet-import-complete-page.png");
});

test("Import 24 word wallet", async ({ page }) => {
  // await expect(page).toHaveScreenshot("welcome-page.png");
  await page.getByText("Import Wallet").click();
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

  await page.locator("#password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByText("Wallet created successfully!")).toBeVisible();
  // await expect(page).toHaveScreenshot("wallet-import-complete-page.png");
});

test("Import wallet with wrong password", async ({ page }) => {
  // await expect(page).toHaveScreenshot("welcome-page.png");
  await page.getByText("Import Wallet").click();
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

  await page.locator("#password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("Not-my-password123");
  await page.locator("#termsOfUse-input").focus();

  await expect(page.getByText("Passwords must match")).toBeVisible();
  // await expect(page).toHaveScreenshot("recovery-bad-password.png", {
  //   mask: [
  //     page.locator(".RecoverAccount__mnemonic-input"),
  //     page.locator("#password-input"),
  //     page.locator("#confirm-password-input"),
  //   ],
  // });
});

test("Incorrect mnemonic phrase", async ({ page }) => {
  // await expect(page).toHaveScreenshot("welcome-page.png");
  await page.getByText("Create Wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(page.getByText("Secret Recovery phrase")).toBeVisible();
  // await expect(page).toHaveScreenshot("recovery-page.png", {
  //   mask: [page.locator(".MnemonicDisplay__list-item")],
  // });

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
  await expect(
    page.getByText("The secret phrase you entered is incorrect."),
  ).toBeVisible();
  // await expect(page).toHaveScreenshot("incorrect-recovery-phrase-page.png", {
  //   mask: [page.locator(".ConfirmMnemonicPhrase__word-bubble-wrapper")],
  // });
});
