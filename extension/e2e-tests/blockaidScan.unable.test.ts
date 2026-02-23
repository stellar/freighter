import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import {
  stubAccountBalances,
  stubScanAssetUnableToScan,
  stubScanTxUnableToScan,
  createAssetObject,
  stubMemoRequiredAccounts,
} from "./helpers/stubs";

test.describe("BlockAid Scan - Unable to Scan States", () => {
  test("Add asset shows 'Unable to scan token' warning when scan fails", async ({
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
      },
    });

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

    // Should be on confirm pane with warning banner visible
    await expect(
      page.getByRole("button", { name: "Confirm Anyway" }),
    ).toBeVisible({ timeout: 10000 });

    // Click on the warning banner to view blockaid details
    await page.getByText("Proceed with caution").click();

    // Wait for pane animation to finish
    await page.waitForTimeout(1000);

    // Should show expanded view with unable-to-scan details
    await expect(page.getByText("Proceed with caution")).toBeVisible();

    // Should show unable to scan details
    await expect(
      page
        .locator(".BlockaidDetailsExpanded__DetailRow")
        .getByText("Unable to scan token"),
    ).toBeVisible();
  });

  test("Send payment shows 'Unable to scan transaction' warning when scan fails", async ({
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
        await stubAccountBalances(page, "100");
        await stubScanTxUnableToScan(page);
      },
    });

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

    // Should be on review pane with warning banner visible
    await expect(
      page.getByRole("button", { name: "Confirm Anyway" }),
    ).toBeVisible({ timeout: 10000 });

    // Click on the warning banner to view blockaid details
    await page.getByText("Proceed with caution").click();

    // Wait for pane animation to finish
    await page.waitForTimeout(1000);

    // Should show expanded view with "Unable to scan transaction" detail inside the BlockAid box
    // The text appears in a detail row inside BlockaidDetailsExpanded
    await expect(
      page
        .locator(".BlockaidDetailsExpanded__DetailRow")
        .getByText("Unable to scan transaction"),
    ).toBeVisible();
  });

  test("Swap shows 'Unable to scan transaction' warning when transaction scan fails", async ({
    page,
    extensionId,
    context,
  }) => {
    test.slow();
    const USDC_ISSUER =
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

    await loginToTestAccount({
      page,
      extensionId,
      context,
      stubOverrides: async () => {
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
                blockaidData: null, // Unable to scan (not used anymore since we only scan transactions)
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

        // Transaction scan should be unable to scan
        await stubScanTxUnableToScan(page);
      },
    });

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

    // Click continue
    await continueButton.click({ force: true });

    // Should be on review pane with warning banner visible
    await expect(
      page.getByRole("button", { name: "Confirm Anyway" }),
    ).toBeVisible({ timeout: 10000 });

    // Click on the warning banner to view blockaid details
    await page.getByText("Proceed with caution").click();

    // Wait for pane animation to finish
    await page.waitForTimeout(1000);

    // Should show expanded view with unable to scan details
    await expect(page.getByText("Proceed with caution")).toBeVisible();

    // Wait for the expanded view to appear and render
    await expect(page.locator(".BlockaidDetailsExpanded")).toBeVisible({
      timeout: 5000,
    });

    // Wait a bit more for the content to render
    await page.waitForTimeout(2000);

    // Should show expanded view with "Unable to scan transaction" warning
    await expect(
      page
        .locator(".BlockaidDetailsExpanded__DetailRow")
        .getByText("Unable to scan transaction"),
    ).toBeVisible({ timeout: 10000 });
  });

  test("Unable to scan transaction ignores memo requirements", async ({
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
        await stubAccountBalances(page, "100");
        await stubScanTxUnableToScan(page);
        await stubMemoRequiredAccounts(
          page,
          "GA6SXIZIKLJHCZI2KEOBEUUOFMM4JUPPM2UTWX6STAWT25JWIEUFIMFF",
        );
      },
    });

    // Go to send payment to an M-address (requires memo)
    await page.getByTestId("nav-link-send").click();
    await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

    await page.getByTestId("address-tile").click();
    await page
      .getByTestId("send-to-input")
      .fill("GA6SXIZIKLJHCZI2KEOBEUUOFMM4JUPPM2UTWX6STAWT25JWIEUFIMFF");

    await page.getByText("Continue").click({ force: true });
    await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
    await page.getByTestId("send-amount-amount-input").fill("10");

    await expect(page.getByText("Review Send")).toBeEnabled({
      timeout: 30000,
    });

    await page.getByText("Review Send").click({ force: true });

    // Should be on review pane with warning banner visible
    // Should NOT show "Add Memo" banner since security warnings take precedence
    await expect(page.getByText("Add Memo")).not.toBeVisible();

    // Should be on confirm pane with Confirm Anyway button
    await expect(
      page.getByRole("button", { name: "Confirm Anyway" }),
    ).toBeVisible({ timeout: 10000 });

    // Click on the warning banner to view blockaid details
    await page.getByText("Proceed with caution").click();

    // Wait for pane animation to finish
    await page.waitForTimeout(1000);

    // Should show unable to scan details
    await expect(page.getByText("Proceed with caution")).toBeVisible();
  });
});
