import { test, expect } from "./test-fixtures";

test("Welcome page loads", async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await expect(
    page.getByText("Welcome! Is this your first time using Freighter?"),
  ).toBeVisible();
  await expect(page.getByText("I’m going to need a seed phrase")).toBeVisible();
  await expect(page.getByText("I’ve done this before")).toBeVisible();
});

test("User creates new wallet", async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await page.getByText("Create Wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(page.getByText("Secret Recovery phrase")).toBeVisible();

  const domWords = page.getByTestId("word");
  const wordCount = await domWords.count();
  const words = [] as string[];
  for (let i = 0; i < wordCount; i++) {
    const word = await domWords.nth(i).innerText();
    words.push(word);
  }

  await page.getByTestId("display-mnemonic-phrase-next-btn").click();
  await expect(page.getByText("Confirm your recovery phrase")).toBeVisible();

  for (let i = 0; i < words.length; i++) {
    await page.locator(`#${words[i]}`).check();
  }
  await page.getByTestId("display-mnemonic-phrase-confirm-btn").click();
  await expect(
    page.getByText("A Stellar wallet for every website"),
  ).toBeVisible();
});
