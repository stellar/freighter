import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import {
  stubAccountBalances,
  stubAccountHistory,
  stubTokenDetails,
  stubTokenPrices,
  stubScanAssetUnableToScan,
  stubScanTxUnableToScan,
} from "./helpers/stubs";

test.describe("Unable to Scan States", () => {
  test("Add asset shows 'Unable to scan token' warning when scan fails", async ({
    page,
    extensionId,
  }) => {
    test.slow();
    await stubTokenDetails(page);
    await stubScanAssetUnableToScan(page);
    // Mock mainnet check - asset scanning only works on mainnet
    await page.route("**/account-balances/*", async (route) => {
      const json = {
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
      };
      await route.fulfill({ json });
    });
    await loginToTestAccount({ page, extensionId });

    await page.getByTestId("account-options-dropdown").click();
    await page.getByText("Manage assets").click();
    await expect(page.getByText("Your assets")).toBeVisible();
    await page.getByText("Add an asset").click({ force: true });

    // Use a classic asset issuer address to trigger ChangeTrustInternal (not ToggleTokenInternal)
    // Searching by issuer will return classic assets which use ChangeTrustInternal
    const classicAssetIssuer =
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
    await page.getByTestId("search-asset-input").fill(classicAssetIssuer);

    // Wait for asset to appear (should show USDC or similar classic asset)
    await expect(page.getByTestId("ManageAssetRowButton")).toBeVisible({
      timeout: 10000,
    });

    // Click to add the asset
    await page.getByTestId("ManageAssetRowButton").click();

    // Wait for the confirmation screen to load
    // This should be ChangeTrustInternal for classic assets
    await expect(page.getByTestId("ChangeTrustInternal__Body")).toBeVisible({
      timeout: 30000,
    });

    // Wait for ChangeTrustInternal to finish loading (if it's that component)
    // The component shows a loader while state is LOADING or IDLE
    const changeTrustComponent = page.getByTestId("ChangeTrustInternal");
    const isChangeTrust = await changeTrustComponent.isVisible();

    if (isChangeTrust) {
      // Wait for loading to complete - the body should appear
      await expect(page.getByTestId("ChangeTrustInternal__Body")).toBeVisible({
        timeout: 30000,
      });

      // Wait for the scan to complete and state to update
      // On testnet, scanAsset returns {} immediately, which should be treated as unable to scan
      await page.waitForTimeout(3000);
    } else {
      // If it's ToggleToken, wait a bit for any async operations
      await page.waitForTimeout(2000);
    }

    // Should show "Unable to scan token" banner (test ID)
    // Note: On testnet, scanAsset returns {} which should be treated as unable to scan
    // The warning should appear in ChangeTrustInternal when isAssetUnableToScan is true
    await expect(page.getByTestId("blockaid-unable-to-scan-label")).toBeVisible(
      { timeout: 30000 },
    );

    // Click on the banner to expand
    await page.getByTestId("blockaid-unable-to-scan-label").click();

    // Should show expanded view with "Unable to scan token" detail inside the BlockAid box
    // The text appears in a detail row inside BlockaidDetailsExpanded
    await expect(
      page
        .locator(".BlockaidDetailsExpanded__DetailRow")
        .getByText("Unable to scan token"),
    ).toBeVisible();
    await expect(
      page.getByText(
        "We were unable to scan this token for security threats. Proceed with caution.",
      ),
    ).toBeVisible();
  });

  test("Send payment shows 'Unable to scan transaction' warning when scan fails", async ({
    page,
    extensionId,
  }) => {
    test.slow();
    await stubAccountBalances(page, "100");
    await stubTokenDetails(page);
    await stubTokenPrices(page);
    await stubScanTxUnableToScan(page);
    await loginToTestAccount({ page, extensionId });

    // Navigate to send payment
    await page.getByTestId("nav-link-send").click();
    await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

    await page.getByTestId("address-tile").click();
    // Use a valid test address
    await page
      .getByTestId("send-to-input")
      .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");

    // Enter amount
    await page.getByText("Continue").click({ force: true });
    await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
    await page.getByTestId("send-amount-amount-input").fill("10");

    // Wait for Review Send button to be enabled (simulation needs to complete)
    await expect(page.getByText("Review Send")).toBeEnabled({
      timeout: 30000,
    });

    // Click review
    await page.getByText("Review Send").click({ force: true });

    // Wait for review screen
    await expect(page.getByText("You are sending")).toBeVisible({
      timeout: 200000,
    });

    // Should show "Unable to scan transaction" banner (test ID)
    await expect(page.getByTestId("blockaid-unable-to-scan-label")).toBeVisible(
      { timeout: 10000 },
    );

    // Click on the banner to expand
    await page.getByTestId("blockaid-unable-to-scan-label").click();

    // Should show expanded view with "Unable to scan transaction" detail inside the BlockAid box
    // The text appears in a detail row inside BlockaidDetailsExpanded
    await expect(
      page
        .locator(".BlockaidDetailsExpanded__DetailRow")
        .getByText("Unable to scan transaction"),
    ).toBeVisible();
    await expect(
      page.getByText(
        "We were unable to scan this transaction for security threats. Proceed with caution.",
      ),
    ).toBeVisible();
  });

  test("Swap shows 'Unable to scan source/destination token' warnings when scans fail", async ({
    page,
    extensionId,
  }) => {
    test.slow();
    const USDC_ISSUER =
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

    // Set up account balances with XLM and USDC tokens
    await page.route("*/**/account-balances/*", async (route) => {
      const json = {
        balances: {
          [`USDC:${USDC_ISSUER}`]: {
            token: {
              type: "credit_alphanum4",
              code: "USDC",
              issuer: {
                key: USDC_ISSUER,
              },
            },
            sellingLiabilities: "0",
            buyingLiabilities: "0",
            total: "100",
            limit: "922337203685.4775807",
            available: "100",
            blockaidData: null, // Unable to scan
          },
          native: {
            token: {
              type: "native",
              code: "XLM",
            },
            total: "999",
            available: "999",
            sellingLiabilities: "0",
            buyingLiabilities: "0",
            minimumBalance: "1",
            blockaidData: {
              result_type: "Benign",
              malicious_score: "0.0",
              attack_types: {},
              chain: "stellar",
              address: "",
              metadata: {
                type: "",
              },
              fees: {},
              features: [],
              trading_limits: {},
              financial_stats: {},
            },
          },
        },
        isFunded: true,
        subentryCount: 0,
        error: {
          horizon: null,
          soroban: null,
        },
      };
      await route.fulfill({ json });
    });

    // Mock swap path finding endpoint (Horizon path payment)
    await page.route("**/paths**", async (route) => {
      const url = new URL(route.request().url());
      const sourceAsset = url.searchParams.get("source_asset_code");
      const destAsset = url.searchParams.get("destination_asset_code");

      // Helper to create asset object: native or credit_alphanum4
      const createAssetObject = (assetCode: string | null, issuer: string) => {
        const isNative = assetCode === "native" || assetCode === null;
        return isNative
          ? {
              asset_type: "native",
              asset_code: undefined,
              asset_issuer: undefined,
            }
          : {
              asset_type: "credit_alphanum4",
              asset_code: assetCode,
              asset_issuer: issuer,
            };
      };

      const source = createAssetObject(sourceAsset, USDC_ISSUER);
      const destination = createAssetObject(destAsset, USDC_ISSUER);

      // Return a valid path for swaps
      const json = {
        _embedded: {
          records: [
            {
              source_asset_type: source.asset_type,
              source_asset_code: source.asset_code,
              source_asset_issuer: source.asset_issuer,
              destination_asset_type: destination.asset_type,
              destination_asset_code: destination.asset_code,
              destination_asset_issuer: destination.asset_issuer,
              destination_amount: "0.95",
              path: [],
            },
          ],
        },
      };
      await route.fulfill({ json });
    });

    await stubAccountHistory(page);
    await stubTokenDetails(page);
    await stubTokenPrices(page);
    await stubScanAssetUnableToScan(page);
    await stubScanTxUnableToScan(page);
    await loginToTestAccount({ page, extensionId });

    // Navigate to swap
    await page.getByTestId("nav-link-swap").click();
    await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");

    // Select source token (XLM)
    await page.getByTestId("swap-src-asset-tile").click();
    await expect(page.getByTestId("AppHeaderPageTitle")).toContainText(
      "Swap from",
    );
    await expect(page.getByText(/XLM/)).toBeVisible();
    await page.getByTestId("XLM-balance").click();

    // Select destination token (USDC)
    await page.getByTestId("swap-dst-asset-tile").click({ force: true });
    await expect(page.getByText("Swap to")).toBeVisible();
    await expect(page.getByText(/USDC/)).toBeVisible();
    await page.getByTestId("USDC-balance").click();

    // Wait to be back at amount step
    await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");
    await expect(page.getByTestId("send-amount-amount-input")).toBeVisible({
      timeout: 10000,
    });

    // Enter amount
    await page.getByTestId("send-amount-amount-input").fill("10");

    // Wait for Continue button to be enabled (simulation needs to complete)
    // The button might be "Continue" or "Review swap"
    const continueButton = page
      .getByRole("button", { name: "Continue" })
      .or(page.getByText("Review swap"));
    await expect(continueButton).toBeEnabled({ timeout: 30000 });

    // Click continue to review
    await continueButton.click({ force: true });

    // Wait for review screen
    await expect(
      page.getByText("You are swapping").or(page.getByText("Review")),
    ).toBeVisible({
      timeout: 200000,
    });

    // Wait for asset scans to complete (they happen asynchronously via useScanAsset hook)
    // On testnet, scanAsset returns {} immediately, which should be treated as unable to scan
    await page.waitForTimeout(5000);

    // Should show "Unable to scan" banner for source or destination token (test ID)
    // For swaps, the warning appears when either source or destination token is unable to scan
    await expect(page.getByTestId("blockaid-unable-to-scan-label")).toBeVisible(
      { timeout: 30000 },
    );

    // Click on the banner to expand
    await page.getByTestId("blockaid-unable-to-scan-label").click();

    // Should show expanded view with token-specific warnings inside the BlockAid box
    // The SwapAssetScanExpanded component shows detail rows for source/destination tokens
    // Since we're swapping XLM (native) -> USDC, only USDC should show "Unable to scan destination token"
    await expect(
      page
        .locator(".BlockaidDetailsExpanded__DetailRow")
        .getByText("Unable to scan destination token"),
    ).toBeVisible({ timeout: 10000 });
  });
});
