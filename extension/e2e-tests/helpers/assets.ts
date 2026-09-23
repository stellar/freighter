import { expect, Page } from "@playwright/test";

/**
 * Open the asset search from Home.
 *
 * Routed through the "Add token" pill rather than the account overflow menu:
 * the Manage assets screen is being retired, and the menu that reaches it
 * disappears with the header restructure. SearchAsset renders the same
 * ManageAssetRows, so every row-level selector is unchanged.
 */
export const goToAddAsset = async (page: Page) => {
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await page.getByTestId("add-token-btn").click();
  // Experimental mode (Futurenet) renders a different search screen, so match
  // either input rather than pinning the helper to the mainnet variant.
  await expect(
    page
      .getByTestId("search-asset-input")
      .or(page.getByTestId("search-token-input")),
  ).toBeVisible({ timeout: 20000 });
};

/**
 * Open the Manage assets list.
 *
 * Only for specs that need the list itself (e.g. the per-row remove menu).
 * Anything that just wants to add an asset should use {@link goToAddAsset}.
 * Kept in one place so retiring the screen is a single-file change.
 */
export const goToManageAssets = async (page: Page) => {
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await page.getByTestId("account-options-dropdown").click();
  // The dropdown animates open over 300ms; clicking before the item is
  // visible lands on nothing, even with force.
  const manageAssets = page.getByText("Manage assets");
  await expect(manageAssets).toBeVisible();
  await manageAssets.click({ force: true });
  await expect(page.getByText("Your assets")).toBeVisible({ timeout: 10000 });
};
