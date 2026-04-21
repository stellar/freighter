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
  const e2eRow = getAssetRow(page, "E2E");
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
  const e2eRow = getAssetRow(page, "E2E");
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
});
