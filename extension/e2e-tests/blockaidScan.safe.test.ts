import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import {
  stubAccountBalances,
  stubAccountHistory,
  stubTokenDetails,
  stubTokenPrices,
  stubScanAssetSafe,
  stubScanTxSafe,
  createAssetObject,
  stubAssetSearch,
} from "./helpers/stubs";

test.describe("BlockAid Scan - Safe States (No Override)", () => {
  test("Add asset shows no warning when scan confirms asset is safe", async ({
    page,
    extensionId,
  }) => {
    test.slow();
    // Set IS_PLAYWRIGHT flag so scanAsset proceeds even on testnet for e2e testing
    await page.addInitScript(() => {
      // @ts-ignore
      window.IS_PLAYWRIGHT = "true";
    });
    await stubTokenDetails(page);
    await stubScanAssetSafe(page);
    await stubAssetSearch(page);
    // Mock mainnet check - asset scanning only works on mainnet
    // We need to mock account-balances to simulate mainnet so scanAsset proceeds
    await page.route("**/account-balances/*", async (route) => {
      const json = {
        balances: {
          native: {
            token: { type: "native", code: "XLM" },
            total: "100",
            available: "100",
            blockaidData: {
              result_type: "Benign",
              malicious_score: "0.0",
              attack_types: {},
              chain: "stellar",
              address: "",
              metadata: { type: "" },
              fees: {},
              features: [],
              trading_limits: {},
              financial_stats: {},
            },
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

    const changeTrustComponent = page.getByTestId("ChangeTrustInternal");
    const isChangeTrust = await changeTrustComponent.isVisible();

    if (isChangeTrust) {
      await expect(page.getByTestId("ChangeTrustInternal__Body")).toBeVisible({
        timeout: 30000,
      });
      await page.waitForTimeout(3000);
    } else {
      await page.waitForTimeout(2000);
    }

    // Should NOT show any BlockAid warning banners
    await expect(
      page.getByTestId("blockaid-unable-to-scan-label"),
    ).not.toBeVisible();
    await expect(
      page.getByTestId("blockaid-malicious-label"),
    ).not.toBeVisible();
    await expect(page.getByTestId("blockaid-miss-label")).not.toBeVisible();
  });

  test("Send payment shows no warning when scan confirms transaction is safe", async ({
    page,
    extensionId,
  }) => {
    test.slow();
    await stubAccountBalances(page, "100");
    await stubTokenDetails(page);
    await stubTokenPrices(page);
    await stubScanTxSafe(page);
    await loginToTestAccount({ page, extensionId });

    await page.getByTestId("nav-link-send").click();
    await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

    await page.getByTestId("address-tile").click();
    await page
      .getByTestId("send-to-input")
      .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");

    await page.getByText("Continue").click({ force: true });
    await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
    await page.getByTestId("send-amount-amount-input").fill("10");

    await expect(page.getByText("Review Send")).toBeEnabled({
      timeout: 30000,
    });

    await page.getByText("Review Send").click({ force: true });

    await expect(page.getByText("You are sending")).toBeVisible({
      timeout: 200000,
    });

    // Should NOT show any BlockAid warning banners
    await expect(
      page.getByTestId("blockaid-unable-to-scan-label"),
    ).not.toBeVisible();
    await expect(
      page.getByTestId("blockaid-malicious-label"),
    ).not.toBeVisible();
    await expect(page.getByTestId("blockaid-miss-label")).not.toBeVisible();
  });

  test("Swap shows no warning when scan confirms tokens are safe", async ({
    page,
    extensionId,
  }) => {
    test.slow();
    // Set IS_PLAYWRIGHT flag so scanAsset proceeds even on testnet for e2e testing
    await page.addInitScript(() => {
      // @ts-ignore
      window.IS_PLAYWRIGHT = "true";
    });
    const USDC_ISSUER =
      "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

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
            blockaidData: {
              result_type: "Benign",
              malicious_score: "0.0",
              attack_types: {},
              chain: "stellar",
              address: "",
              metadata: { type: "" },
              fees: {},
              features: [],
              trading_limits: {},
              financial_stats: {},
            },
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
              metadata: { type: "" },
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

    await page.route("**/paths**", async (route) => {
      const url = new URL(route.request().url());
      const sourceAsset = url.searchParams.get("source_asset_code");
      const destAsset = url.searchParams.get("destination_asset_code");

      const source = createAssetObject(sourceAsset, USDC_ISSUER);
      const destination = createAssetObject(destAsset, USDC_ISSUER);

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
    await stubScanAssetSafe(page);
    await stubScanTxSafe(page);
    await loginToTestAccount({ page, extensionId });

    await page.getByTestId("nav-link-swap").click();
    await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");

    await page.getByTestId("swap-src-asset-tile").click();
    await expect(page.getByTestId("AppHeaderPageTitle")).toContainText(
      "Swap from",
    );
    await expect(page.getByText(/XLM/)).toBeVisible();
    await page.getByTestId("XLM-balance").click();

    await page.getByTestId("swap-dst-asset-tile").click({ force: true });
    await expect(page.getByText("Swap to")).toBeVisible();
    await expect(page.getByText(/USDC/)).toBeVisible();
    await page.getByTestId("USDC-balance").click();

    await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");
    await expect(page.getByTestId("send-amount-amount-input")).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId("send-amount-amount-input").fill("10");

    const continueButton = page
      .getByRole("button", { name: "Continue" })
      .or(page.getByText("Review swap"));
    await expect(continueButton).toBeEnabled({ timeout: 30000 });

    await continueButton.click({ force: true });

    await expect(
      page.getByText("You are swapping").or(page.getByText("Review")),
    ).toBeVisible({
      timeout: 200000,
    });

    await page.waitForTimeout(5000);

    // Should NOT show any BlockAid warning banners
    await expect(
      page.getByTestId("blockaid-unable-to-scan-label"),
    ).not.toBeVisible();
    await expect(
      page.getByTestId("blockaid-malicious-label"),
    ).not.toBeVisible();
    await expect(page.getByTestId("blockaid-miss-label")).not.toBeVisible();
  });
});
