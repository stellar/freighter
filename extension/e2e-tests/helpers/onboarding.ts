import { Page } from "@playwright/test";
import { expect } from "../test-fixtures";

/**
 * Starts the import wallet flow by clicking "I already have a wallet",
 * filling in password and confirm password, checking terms of use, and clicking Confirm.
 * Waits for the "Import wallet from recovery phrase" screen to be visible.
 */
export const startImportWalletFlow = async ({
  page,
  password,
  confirmPassword,
}: {
  page: Page;
  password: string;
  confirmPassword?: string;
}) => {
  await page.getByText("I already have a wallet").click();
  await expect(page.getByText("Create a password")).toBeVisible();

  await page.locator("#new-password-input").fill(password);
  await page.locator("#confirm-password-input").fill(confirmPassword || password);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();
};

/**
 * Fills in mnemonic phrase inputs with the provided words.
 * Words are filled sequentially into inputs named MnemonicPhrase-1, MnemonicPhrase-2, etc.
 */
export const fillMnemonicInputs = async ({
  page,
  words,
}: {
  page: Page;
  words: string[];
}) => {
  for (let i = 1; i <= words.length; i++) {
    const input = page.locator(`input[name="MnemonicPhrase-${i}"]`);
    await input.fill(words[i - 1]);
  }
};

/**
 * Clicks the Import button and waits for the "You're all set!" message to appear,
 * indicating successful wallet import.
 */
export const clickImportAndWaitForSuccess = async ({
  page,
  timeout = 10000,
}: {
  page: Page;
  timeout?: number;
}) => {
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("You're all set!")).toBeVisible({ timeout });
};
