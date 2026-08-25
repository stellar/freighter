import { Page } from "@playwright/test";
import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import {
  stubTokenDetails,
  stubIsSac,
  stubScanAssetSafe,
  stubAssetSearchWithContractId,
  stubAccountBalancesE2e,
} from "./helpers/stubs";

/**
 * Helper to locate a ManageAssetRow by its exact asset code.
 */
const getAssetRow = (page: Page, code: string) =>
  page.getByTestId("ManageAssetRow").filter({
    has: page.getByTestId("ManageAssetCode").getByText(code, { exact: true }),
  });

test("Stellar Expert contract ID result shows as already added", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await stubAssetSearchWithContractId(page);
      await stubAccountBalancesE2e(page);
      await stubTokenDetails(page);
      await stubIsSac(page);
      await stubScanAssetSafe(page);
    },
  });

  await page.getByTestId("account-options-dropdown").click();
  const manageAssets = page.getByText("Manage assets");
  await expect(manageAssets).toBeVisible();
  await manageAssets.click();

  await expect(page.getByText("Your assets")).toBeVisible({ timeout: 10000 });
  await page.getByText("Add an asset").click({ force: true });

  await page.getByTestId("search-asset-input").fill("E2E");

  // Wait for search results to appear
  const rows = page.getByTestId("ManageAssetRow");
  await expect(rows.first()).toBeVisible({ timeout: 10000 });

  // The E2E token row should show the ellipsis menu instead of "Add"
  // because the token is already in the user's balances
  await expect(
    page.getByTestId("ManageAssetRowButton__ellipsis-E2E"),
  ).toBeVisible();
});

test("Stellar Expert contract ID result shows Add when not owned", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await stubAssetSearchWithContractId(page);
      await stubTokenDetails(page);
      await stubIsSac(page);
      await stubScanAssetSafe(page);
    },
  });

  await page.getByTestId("account-options-dropdown").click();
  const manageAssets = page.getByText("Manage assets");
  await expect(manageAssets).toBeVisible();
  await manageAssets.click();

  await expect(page.getByText("Your assets")).toBeVisible({ timeout: 10000 });
  await page.getByText("Add an asset").click({ force: true });

  await page.getByTestId("search-asset-input").fill("E2E");

  // Wait for search results
  const rows = page.getByTestId("ManageAssetRow");
  await expect(rows.first()).toBeVisible({ timeout: 10000 });

  // Find the E2E token row by its exact asset code
  // Non-SAC contract tokens render their NAME in ManageAssetCode
  // (displayCode = name when name && contract && !isSac), so match on "E2E Token".
  const e2eRow = getAssetRow(page, "E2E Token");
  await expect(e2eRow).toBeVisible();

  // The button should say "Add" since the user does not have this token
  const rowButton = e2eRow.getByTestId("ManageAssetRowButton");
  await expect(rowButton).toHaveText("Add");
});

test("Can add a token returned as contract ID from Stellar Expert search", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await stubAssetSearchWithContractId(page);
      await stubTokenDetails(page);
      await stubIsSac(page);
      await stubScanAssetSafe(page);
    },
  });

  await page.getByTestId("account-options-dropdown").click();
  const manageAssets = page.getByText("Manage assets");
  await expect(manageAssets).toBeVisible();
  await manageAssets.click();

  await expect(page.getByText("Your assets")).toBeVisible({ timeout: 10000 });
  await page.getByText("Add an asset").click({ force: true });

  await page.getByTestId("search-asset-input").fill("E2E");

  // Wait for search results
  const rows = page.getByTestId("ManageAssetRow");
  await expect(rows.first()).toBeVisible({ timeout: 10000 });

  // Find the E2E token row by its exact asset code and click Add
  // Non-SAC contract tokens render their NAME in ManageAssetCode
  // (displayCode = name when name && contract && !isSac), so match on "E2E Token".
  const e2eRow = getAssetRow(page, "E2E Token");
  await expect(e2eRow).toBeVisible();
  await e2eRow.getByTestId("ManageAssetRowButton").click();

  // Should navigate to the Add Token confirmation page
  await expect(page.getByTestId("ToggleToken__asset-code")).toHaveText(
    "E2E Token",
  );
  await expect(page.getByTestId("ToggleToken__asset-add-remove")).toHaveText(
    "Add Token",
  );

  // Confirm the add
  await page.getByRole("button", { name: "Confirm" }).click();

  // Back out of the search screen to "Your assets". The token now shows the
  // ellipsis menu rather than an "Add" button, which only happens when it is
  // present in balances — and the balances API does not return it, because the
  // account holds no balance for it. It is there purely from the locally saved
  // contract ID (injectLocalTokenBalances).
  await page.getByTestId("BackButton").click();
  await expect(page.getByText("Your assets")).toBeVisible({ timeout: 10000 });

  // Balance rows label a contract token with its symbol, not its name.
  const addedRow = getAssetRow(page, "E2E");
  await expect(addedRow).toBeVisible();
  await addedRow.getByTestId("ManageAssetRowButton__ellipsis-E2E").click();

  // On screen only because of the local list, so it stays removable. A token
  // the backend returns on its own would offer Copy address alone.
  await expect(page.getByText("Remove asset")).toBeVisible();
  await expect(page.getByText("Copy address")).toBeVisible();

  // ...and it renders on the account's balances list. The dropdown's overlay
  // would swallow the back click, so dismiss it the way the UI does.
  await page.locator(".ManageAssetRowButton__dropdown__background").click();
  await page.getByTestId("BackButton").click();
  await expect(
    page.getByTestId("account-assets-item").filter({ hasText: "E2E" }).first(),
  ).toBeVisible({ timeout: 10000 });
});
