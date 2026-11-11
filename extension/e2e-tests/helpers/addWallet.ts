import { Page } from "@playwright/test";

/**
 * From an open account sheet: Add wallet, Create new wallet, Add account
 * under the phrase group at `groupIndex`, keep the default name, and confirm
 * with the password. Leaves the popup on the account view.
 */
export const addAccountToPhrase = async ({
  page,
  password,
  groupIndex = 0,
  accountName,
}: {
  page: Page;
  password: string;
  groupIndex?: number;
  accountName?: string;
}) => {
  await page.getByTestId("add-wallet").click();
  await page.getByTestId("add-wallet-create").click();
  await page.getByTestId("create-wallet-add-account").nth(groupIndex).click();
  if (accountName !== undefined) {
    await page.getByTestId("set-account-name-input").fill(accountName);
  }
  await page.getByTestId("set-account-name-submit").click();
  await page.locator("#password-input").fill(password);
  await page.getByRole("button", { name: "Create", exact: true }).click();
};

/**
 * From an open account sheet: Add wallet, Create new wallet, Generate new
 * recovery phrase, reveal it, and confirm with the password. Returns the
 * phrase's words as shown.
 */
export const generateRecoveryPhraseSource = async ({
  page,
  password,
  accountName,
}: {
  page: Page;
  password: string;
  accountName?: string;
}) => {
  await page.getByTestId("add-wallet").click();
  await page.getByTestId("add-wallet-create").click();
  await page.getByTestId("create-wallet-generate").click();
  if (accountName !== undefined) {
    await page.getByTestId("set-account-name-input").fill(accountName);
  }
  await page.getByTestId("set-account-name-submit").click();
  await page.getByTestId("create-wallet-phrase-reveal").click();
  const words = await page
    .getByTestId("create-wallet-phrase")
    .locator("li span:last-child")
    .allTextContents();
  await page.getByTestId("create-wallet-phrase-create").click();
  await page.locator("#password-input").fill(password);
  await page.getByRole("button", { name: "Create", exact: true }).click();
  return words;
};

/**
 * From an open account sheet: Add wallet, Import Recovery Phrase, enter the
 * words, and confirm with the password. Discovery runs after the password, so
 * callers should allow a generous wait for the account view.
 */
export const importRecoveryPhraseSource = async ({
  page,
  password,
  words,
}: {
  page: Page;
  password: string;
  words: string[];
}) => {
  await page.getByTestId("add-wallet").click();
  await page.getByTestId("add-wallet-import-phrase").click();
  await page.getByTestId("import-phrase-input").fill(words.join(" "));
  await page.getByTestId("import-phrase-submit").click();
  await page.locator("#password-input").fill(password);
  await page.getByRole("button", { name: "Import", exact: true }).click();
};
