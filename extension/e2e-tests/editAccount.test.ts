import { Keypair } from "stellar-sdk";

import { test, expect } from "./test-fixtures";
import {
  loginToTestAccount,
  PASSWORD,
  TEST_ACCOUNT_WORDS,
} from "./helpers/login";
import {
  lockAndUnlock,
  openEditAccount,
  startReveal,
  submitRevealPassword,
} from "./helpers/editAccount";

const INCORRECT_PASSWORD = /incorrect password/i;

test("reveals the recovery phrase from Edit account after the password", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await openEditAccount(page, "Account 1");
  await startReveal(page, "recovery-phrase");

  await submitRevealPassword(page, "recovery-phrase", "wrong-password");
  await expect(page.getByText(INCORRECT_PASSWORD)).toBeVisible();
  await expect(page.getByTestId("reveal-recovery-phrase-value")).toHaveCount(0);

  await submitRevealPassword(page, "recovery-phrase", PASSWORD);
  await expect(page.getByTestId("reveal-recovery-phrase-value")).toBeVisible();
  await expect(
    page
      .getByTestId("reveal-recovery-phrase-value")
      .locator("li span:last-child"),
  ).toHaveText(TEST_ACCOUNT_WORDS);
});

test("reveals an imported secret key from Edit account after the password", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  const imported = Keypair.random();
  await page.getByTestId("account-view-account-name").click();
  await page.getByTestId("add-wallet").click();
  await page.getByTestId("add-wallet-import-secret-key").click();
  await page.locator("#privateKey-input").fill(imported.secret());
  await page.locator("#password-input").fill(PASSWORD);
  await page.locator("#authorization-input").check({ force: true });
  await page.getByTestId("import-account-button").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  // The imported key is now active.
  const importedName = (
    await page.getByTestId("account-view-account-name").innerText()
  ).trim();

  await openEditAccount(page, importedName);
  await expect(page.getByTestId("edit-account-recovery-phrase")).toHaveCount(0);
  await startReveal(page, "secret-key");

  await submitRevealPassword(page, "secret-key", "wrong-password");
  await expect(page.getByText(INCORRECT_PASSWORD)).toBeVisible();
  await expect(page.getByTestId("reveal-secret-key-value")).toHaveCount(0);

  await submitRevealPassword(page, "secret-key", PASSWORD);
  await expect(page.getByTestId("reveal-secret-key-value")).toHaveText(
    imported.secret(),
  );
});

test("keeps a renamed account's name across lock and unlock", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await openEditAccount(page, "Account 1");
  await page.getByTestId("edit-account-name").click();
  await page.getByTestId("rename-wallet-input").fill("Renamed e2e");
  await page.getByTestId("rename-wallet-submit").click();
  await expect(page.getByTestId("edit-account-name")).toContainText(
    "Renamed e2e",
  );

  await lockAndUnlock(page, PASSWORD);
  // Lock and unlock keep Redux state in the same page; a reload makes the
  // name come back from storage.
  await page.reload();

  await expect(page.getByTestId("account-view-account-name")).toContainText(
    "Renamed e2e",
    { timeout: 30000 },
  );
  await page.getByTestId("account-view-account-name").click();
  await expect(
    page.getByTestId("wallet-row-select").filter({ hasText: "Renamed e2e" }),
  ).toHaveCount(1);
});
