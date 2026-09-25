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
 * Open an asset's detail sheet from the balances list on Home.
 */
export const openAssetDetails = async (page: Page, code: string) => {
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await page
    .getByTestId("account-assets-item")
    .filter({ hasText: code })
    .first()
    .click();
  await expect(page.getByTestId("AssetDetail")).toBeVisible({ timeout: 20000 });
};

/**
 * Start removing an asset from its detail sheet.
 *
 * Replaces the per-row menu on the retired Manage assets screen. Leaves the
 * caller on the confirm step so it can drive the rest of the flow.
 */
export const startRemoveAsset = async (page: Page, code: string) => {
  await openAssetDetails(page, code);
  await page.getByAltText("asset options").click();
  await page.getByTestId("asset-detail-remove-button").click({ force: true });
};
