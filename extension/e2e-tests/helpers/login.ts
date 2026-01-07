import StellarHDWallet from "stellar-hd-wallet";
import { Page } from "@playwright/test";
import { expect } from "../test-fixtures";

const { generateMnemonic } = StellarHDWallet;

export const PASSWORD = "My-password123";

export const login = async ({
  page,
  extensionId,
}: {
  page: Page;
  extensionId: string;
}) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await page.getByText("I already have a wallet").click();

  await expect(page.getByText("Create a Password")).toBeVisible();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

  await expect(
    page.getByText("Import wallet from recovery phrase"),
  ).toBeVisible();

  const TEST_WORDS = generateMnemonic({ entropyBits: 128 }).split(" ");

  for (let i = 1; i <= TEST_WORDS.length; i++) {
    await page.locator(`#MnemonicPhrase-${i}`).fill(TEST_WORDS[i - 1]);
  }

  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByText("You’re all set!")).toBeVisible({
    timeout: 20000,
  });

  await page.goto(`chrome-extension://${extensionId}/index.html#/`);
  await expect(page.getByTestId("network-selector-open")).toBeVisible({
    timeout: 10000,
  });
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Test Net").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 10000,
  });
};

export const loginAndFund = async ({
  page,
  extensionId,
}: {
  page: Page;
  extensionId: string;
}) => {
  await login({ page, extensionId });

  // Wait for account view to load and check state
  await page.waitForTimeout(2000);

  const notFundedVisible = await page
    .getByTestId("not-funded")
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (!notFundedVisible) {
    // Account might already be funded or in an error state
    const accountAssetsVisible = await page
      .getByTestId("account-assets")
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (accountAssetsVisible) {
      // Account appears funded, continue
      return;
    }

    // Wait a bit more and retry
    await page.waitForTimeout(3000);
    const stillNotFunded = await page
      .getByTestId("not-funded")
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    if (!stillNotFunded) {
      throw new Error(
        "Account is not showing expected unfunded state after login",
      );
    }
  }

  await page.getByRole("button", { name: "Fund with Friendbot" }).click();

  await expect(page.getByTestId("account-assets")).toBeVisible({
    timeout: 45000, // Increased timeout for Friendbot
  });

  // Verify funding actually worked by checking if balance loads
  // This helps catch cases where Friendbot appears to succeed but doesn't fund
  await page.waitForTimeout(3000); // Let balances load

  // Try to find any balance element - this indicates the account exists and has funds
  const balanceElements = await page
    .locator('[data-testid*="balance"], [data-testid*="amount"]')
    .count();

  if (balanceElements === 0) {
    // No balance elements found - funding likely failed
    throw new Error(
      "Friendbot funding completed but no account balance is visible",
    );
  }

  // Additional verification: try to refresh balances to ensure they're real
  const refreshButton = page
    .locator('[aria-label*="refresh"], [data-testid*="refresh"]')
    .first();
  if (await refreshButton.isVisible().catch(() => false)) {
    await refreshButton.click();
    await page.waitForTimeout(2000); // Wait for refresh
  }
};

export const loginToTestAccount = async ({
  page,
  extensionId,
}: {
  page: Page;
  extensionId: string;
}) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await page.getByText("I already have a wallet").click();

  await page.locator("#new-password-input").fill("My-password123");
  await page.locator("#confirm-password-input").fill("My-password123");
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();

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

  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("You’re all set!")).toBeVisible({
    timeout: 20000,
  });

  await page.goto(`chrome-extension://${extensionId}/index.html#/`);
  await expect(page.getByTestId("network-selector-open")).toBeVisible({
    timeout: 50000,
  });
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Test Net").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
};
