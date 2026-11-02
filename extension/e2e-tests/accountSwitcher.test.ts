import { Keypair } from "stellar-sdk";

import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";

// loginToTestAccount sets this password on the wallet it imports.
const WALLET_PASSWORD = "My-password123";

const group = (page: import("@playwright/test").Page, label: string) =>
  page.getByTestId("account-sheet-group").filter({
    has: page.getByTestId("account-sheet-group-toggle").filter({
      hasText: label,
    }),
  });

test("Groups the switcher by source and switches between a phrase account and an imported key", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  // A phrase-only wallet lists its accounts flat.
  await page.getByTestId("account-view-account-name").click();
  await expect(page.getByTestId("AccountSheet")).toBeVisible();
  await expect(page.getByTestId("account-sheet-group")).toHaveCount(0);

  // Import a secret key, which becomes the active account.
  const imported = Keypair.random();
  await page.getByTestId("add-wallet").click();
  await page.getByText("Import a Stellar secret key").click();
  await page.locator("#privateKey-input").fill(imported.secret());
  await page.locator("#password-input").fill(WALLET_PASSWORD);
  await page.locator("#authorization-input").check({ force: true });
  await page.getByTestId("import-account-button").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  await page.getByTestId("account-view-account-name").click();
  await expect(page.getByTestId("AccountSheet")).toBeVisible();

  await expect(page.getByTestId("account-sheet-group-toggle")).toHaveText([
    "Recovery phrase 1",
    "Secret key 1",
  ]);
  const importedRow = group(page, "Secret key 1").getByTestId(
    "wallet-row-select",
  );
  await expect(importedRow).toHaveCount(1);
  await expect(importedRow).toHaveAttribute("aria-current", "true");

  // Switch to the first phrase account.
  await group(page, "Recovery phrase 1")
    .getByTestId("wallet-row-select")
    .first()
    .click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  await page.getByTestId("account-view-account-name").click();
  await expect(
    group(page, "Recovery phrase 1").getByTestId("wallet-row-select").first(),
  ).toHaveAttribute("aria-current", "true");
  await expect(
    group(page, "Secret key 1").getByTestId("wallet-row-select"),
  ).not.toHaveAttribute("aria-current", "true");

  // Collapse the phrase group; it stays collapsed when the sheet reopens.
  const phraseToggle = group(page, "Recovery phrase 1").getByTestId(
    "account-sheet-group-toggle",
  );
  await phraseToggle.click();
  await expect(phraseToggle).toHaveAttribute("aria-expanded", "false");
  await expect(
    group(page, "Recovery phrase 1").getByTestId("wallet-row-select"),
  ).toHaveCount(0);

  await page.getByTestId("AccountSheet__close").click();
  await page.getByTestId("account-view-account-name").click();
  await expect(
    group(page, "Recovery phrase 1").getByTestId("account-sheet-group-toggle"),
  ).toHaveAttribute("aria-expanded", "false");
  await expect(
    group(page, "Secret key 1").getByTestId("wallet-row-select"),
  ).toHaveCount(1);
});
