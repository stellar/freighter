import StellarHDWallet from "stellar-hd-wallet";
import { Page, BrowserContext } from "@playwright/test";
import { expect } from "../test-fixtures";
import { stubAllExternalApis } from "./stubs";

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

  // Wait for account-balances API call with TESTNET network param before clicking
  const balancesPromise = page.waitForResponse(
    (response) =>
      response.url().includes("/account-balances/") &&
      response.url().includes("network=TESTNET"),
  );

  // Wait for the balances API call to complete
  await balancesPromise;

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

  await expect(page.getByTestId("not-funded")).toBeVisible({
    timeout: 10000,
  });

  await page.getByRole("button", { name: "Fund with Friendbot" }).click();

  await expect(page.getByTestId("account-assets")).toBeVisible({
    timeout: 30000,
  });
};

export const loginToTestAccount = async ({
  page,
  extensionId,
  context,
}: {
  page: Page;
  extensionId: string;
  context?: BrowserContext;
}) => {
  await page.goto(`chrome-extension://${extensionId}/index.html`);
  if (context) {
    // Wait for any background activity to complete
    await stubAllExternalApis(page, context);
  }
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
