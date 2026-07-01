import { test, expect } from "./test-fixtures";
import { loginToTestAccount, switchToMainnet } from "./helpers/login";
import {
  stubTokenDetails,
  stubScanAssetSafe,
  stubAssetSearch,
} from "./helpers/stubs";

// The Add-a-token confirmation reuses the dApp SignTransaction Details view.
// Its changeTrust operation must use the token-centric labels ("Token Code" /
// "Token Issuer"), not the deprecated "Asset Code" / "Asset Issuer" wording.
test.describe("Add-a-token transaction details", () => {
  test("changeTrust details use Token Code / Token Issuer labels", async ({
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
        await stubTokenDetails(page);
        await stubScanAssetSafe(page);
        await stubAssetSearch(page);
        // Mainnet-shaped balances so the classic-asset add flow proceeds.
        await page.route("**/account-balances/*", async (route) => {
          await route.fulfill({
            json: {
              balances: {
                native: {
                  token: { type: "native", code: "XLM" },
                  total: "100",
                  available: "100",
                },
              },
              isFunded: true,
              subentryCount: 0,
              error: { horizon: null, soroban: null },
            },
          });
        });
      },
    });

    await switchToMainnet(page);

    await page.getByTestId("account-options-dropdown").click();
    await page.getByText("Manage assets").click();
    await expect(page.getByText("Your assets")).toBeVisible();
    await page.getByText("Add an asset").click({ force: true });

    // A classic asset issuer routes through ChangeTrustInternal.
    const classicAssetIssuer =
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
    await page.getByTestId("search-asset-input").fill(classicAssetIssuer);

    await expect(page.getByTestId("ManageAssetRowButton")).toBeVisible({
      timeout: 10000,
    });
    await page.getByTestId("ManageAssetRowButton").click();

    await expect(page.getByTestId("ChangeTrustInternal__Body")).toBeVisible({
      timeout: 30000,
    });

    // Open the transaction-details pane and check the changeTrust op labels.
    await page.getByText("Transaction details").click({ force: true });

    await expect(page.getByText("Token Code")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("Token Issuer")).toBeVisible();
    await expect(page.getByText("Asset Code", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Asset Issuer", { exact: true })).toHaveCount(
      0,
    );
  });
});
