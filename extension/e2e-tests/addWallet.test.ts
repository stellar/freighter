import { generateMnemonic } from "bip39";
import { Keypair } from "stellar-sdk";

import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import {
  addAccountToPhrase,
  generateRecoveryPhraseSource,
  importRecoveryPhraseSource,
} from "./helpers/addWallet";

// loginToTestAccount sets this password on the wallet it imports.
const WALLET_PASSWORD = "My-password123";

const group = (page: import("@playwright/test").Page, label: string) =>
  page.getByTestId("account-sheet-group").filter({
    has: page.getByTestId("account-sheet-group-toggle").filter({
      hasText: label,
    }),
  });

const openSheet = async (page: import("@playwright/test").Page) => {
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await page.getByTestId("account-view-account-name").click();
  await expect(page.getByTestId("AccountSheet")).toBeVisible();
};

test("Adds accounts under the phrase the user picks, including a generated one", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  // The chooser offers create, secret key import and hardware.
  await openSheet(page);
  await page.getByTestId("add-wallet").click();
  await expect(page.getByTestId("add-wallet-create")).toBeVisible();
  await expect(page.getByTestId("add-wallet-import-secret-key")).toBeVisible();
  await expect(page.getByTestId("add-wallet-connect-hardware")).toBeVisible();
  await page.goBack();

  // Add under the only phrase, with a chosen name.
  await openSheet(page);
  await addAccountToPhrase({
    page,
    password: WALLET_PASSWORD,
    accountName: "Trading",
  });
  await openSheet(page);
  await expect(
    page.locator('[data-testid="wallet-row-select"][aria-current="true"]'),
  ).toContainText("Trading");

  // Generate a second phrase. Its first account becomes active and gets its
  // own group.
  await generateRecoveryPhraseSource({
    page,
    password: WALLET_PASSWORD,
    accountName: "Fresh",
  });
  await openSheet(page);
  await expect(page.getByTestId("account-sheet-group-toggle")).toHaveText([
    "Recovery phrase 1",
    "Recovery phrase 2",
  ]);
  const secondPhraseRows = group(page, "Recovery phrase 2").getByTestId(
    "wallet-row-select",
  );
  await expect(secondPhraseRows).toHaveCount(1);
  await expect(secondPhraseRows).toContainText("Fresh");
  await expect(secondPhraseRows).toHaveAttribute("aria-current", "true");

  // Adding under the second phrase lands in its group, not the first.
  const firstPhraseCount = await group(page, "Recovery phrase 1")
    .getByTestId("wallet-row-select")
    .count();
  await addAccountToPhrase({
    page,
    password: WALLET_PASSWORD,
    groupIndex: 1,
    accountName: "Second on two",
  });
  await openSheet(page);
  await expect(secondPhraseRows).toHaveCount(2);
  await expect(secondPhraseRows.nth(1)).toContainText("Second on two");
  await expect(
    group(page, "Recovery phrase 1").getByTestId("wallet-row-select"),
  ).toHaveCount(firstPhraseCount);
});

test("Generates a recovery phrase while an imported key is active", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await openSheet(page);
  await page.getByTestId("add-wallet").click();
  await page.getByTestId("add-wallet-import-secret-key").click();
  await page.locator("#privateKey-input").fill(Keypair.random().secret());
  await page.locator("#password-input").fill(WALLET_PASSWORD);
  await page.locator("#authorization-input").check({ force: true });
  await page.getByTestId("import-account-button").click();

  await openSheet(page);
  const words = await generateRecoveryPhraseSource({
    page,
    password: WALLET_PASSWORD,
  });
  expect(words).toHaveLength(12);

  await openSheet(page);
  await expect(page.getByTestId("account-sheet-group-toggle")).toHaveText([
    "Recovery phrase 1",
    "Recovery phrase 2",
    "Secret key 1",
  ]);
  await expect(
    group(page, "Recovery phrase 2").getByTestId("wallet-row-select"),
  ).toHaveAttribute("aria-current", "true");
});

test("Imports a second recovery phrase without changing the first", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await openSheet(page);
  // With one phrase the sheet may not label the group, so record every row.
  await expect(page.getByTestId("wallet-row-select").first()).toBeVisible();
  const firstBefore = await page
    .getByTestId("wallet-row-select")
    .allTextContents();
  expect(firstBefore.length).toBeGreaterThan(0);
  const firstRows = group(page, "Recovery phrase 1").getByTestId(
    "wallet-row-select",
  );

  await importRecoveryPhraseSource({
    page,
    password: WALLET_PASSWORD,
    words: generateMnemonic().split(" "),
  });

  // Discovery looks up ~49 addresses on mainnet before the view returns.
  await openSheet(page);
  await expect(page.getByTestId("account-sheet-group-toggle")).toHaveText([
    "Recovery phrase 1",
    "Recovery phrase 2",
  ]);
  await expect(firstRows).toHaveText(firstBefore);
  await expect(
    group(page, "Recovery phrase 2").getByTestId("wallet-row-select"),
  ).toHaveCount(1);
});

test("Refuses a recovery phrase the wallet already holds", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  const words = generateMnemonic().split(" ");
  await openSheet(page);
  await importRecoveryPhraseSource({
    page,
    password: WALLET_PASSWORD,
    words,
  });

  await openSheet(page);
  await expect(page.getByTestId("account-sheet-group-toggle")).toHaveText([
    "Recovery phrase 1",
    "Recovery phrase 2",
  ]);
  await importRecoveryPhraseSource({
    page,
    password: WALLET_PASSWORD,
    words,
  });
  await expect(
    page.getByText("This recovery phrase is already in your wallet"),
  ).toBeVisible({ timeout: 30000 });

  // Back out of the phrase screen and the chooser to the account view.
  await page.goBack();
  await page.goBack();
  await openSheet(page);
  await expect(page.getByTestId("account-sheet-group-toggle")).toHaveText([
    "Recovery phrase 1",
    "Recovery phrase 2",
  ]);
});
