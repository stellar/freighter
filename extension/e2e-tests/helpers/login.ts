import { generateMnemonic } from "stellar-hd-wallet";
import { expect } from "../test-fixtures";

export const PASSWORD = "My-password123";

export const login = async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await page.getByText("Import Wallet").click();

  const TEST_WORDS = generateMnemonic({ entropyBits: 128 }).split(" ");

  for (let i = 1; i <= TEST_WORDS.length; i++) {
    await page.locator(`#MnemonicPhrase-${i}`).fill(TEST_WORDS[i - 1]);
  }

  await page.locator("#password-input").fill(PASSWORD);
  await page.locator("#confirm-password-input").fill(PASSWORD);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Wallet created successfully!")).toBeVisible({
    timeout: 20000,
  });

  await page.goto(`chrome-extension://${extensionId}/index.html#/account`);
  await page.getByTestId("BlockaidAnnouncement__accept").click();
  await expect(page.getByTestId("network-selector-open")).toBeVisible({
    timeout: 10000,
  });
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Test Net").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 10000,
  });
};

export const loginAndFund = async ({ page, extensionId }) => {
  await login({ page, extensionId });
  await expect(page.getByTestId("not-funded")).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: "Fund with Friendbot" }).click();

  await expect(page.getByTestId("account-assets")).toBeVisible({
    timeout: 30000,
  });
};

export const loginToTestAccount = async ({ page, extensionId }) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await page.getByText("Import Wallet").click();

  // GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY

  const TEST_ACCOUNT_WORDS = [
    "card",
    "whip",
    "erosion",
    "fatal",
    "reunion",
    "foil",
    "doctor",
    "embark",
    "plug",
    "note",
    "thank",
    "company",
  ];

  for (let i = 1; i <= TEST_ACCOUNT_WORDS.length; i++) {
    await page.locator(`#MnemonicPhrase-${i}`).fill(TEST_ACCOUNT_WORDS[i - 1]);
  }

  await page.locator("#password-input").fill(PASSWORD);
  await page.locator("#confirm-password-input").fill(PASSWORD);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("Wallet created successfully!")).toBeVisible({
    timeout: 20000,
  });

  await page.goto(`chrome-extension://${extensionId}/index.html#/account`);
  await page.getByTestId("BlockaidAnnouncement__accept").click();
  await expect(page.getByTestId("network-selector-open")).toBeVisible({
    timeout: 50000,
  });
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Test Net").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
};
