import { test, expect } from "./test-fixtures";
import { loginToTestAccount, switchToMainnet } from "./helpers/login";
import {
  openGrantAccessPopup,
  openSignMessagePopup,
} from "./helpers/dAppSessionHelper";
import {
  stubAccountBalances,
  stubAccountHistory,
  stubTokenDetails,
  stubTokenPrices,
  stubScanAssetMalicious,
  stubScanTxMalicious,
  stubScanDappMalicious,
  createAssetObject,
  stubAssetSearch,
  stubMemoRequiredAccounts,
} from "./helpers/stubs";
import { testBlockaidFeedback } from "./helpers/blockaid";

test.describe("BlockAid Scan - Malicious States", () => {
  test("Add asset shows malicious warning when scan detects malicious asset", async ({
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
        await stubScanAssetMalicious(page);
        await stubAssetSearch(page);
        // Mock mainnet balances so asset scan proceeds (scanning only runs on mainnet)
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
      },
    });

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

    // Should be on confirm pane with warning banner visible
    await expect(
      page.getByRole("button", { name: "Confirm Anyway" }),
    ).toBeVisible({ timeout: 10000 });

    // Click on the warning banner to view blockaid details
    await page.getByText("This asset was flagged as malicious").click();

    // Wait for pane animation to finish
    await page.waitForTimeout(1000);

    // Should show expanded view with malicious details
    await expect(page.getByText("Do not proceed")).toBeVisible();

    // Should show warning detail rows from features
    await expect(
      page.getByText(
        "A malicious transaction causes a transfer, draining the user's assets and tokens.",
      ),
    ).toBeVisible();
  });

  test("Send payment shows malicious warning when scan detects malicious transaction", async ({
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
        await stubTokenDetails(page);
        await stubTokenPrices(page);
        await stubScanTxMalicious(page);
      },
    });

    // Blockaid tx scans are gated to mainnet only
    await switchToMainnet(page);

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

    // Should be on review pane with warning banner visible
    await expect(
      page.getByRole("button", { name: "Confirm Anyway" }),
    ).toBeVisible({ timeout: 10000 });

    // Click on the warning banner to view blockaid details
    await page.getByText("This transaction was flagged as malicious").click();

    // Wait for pane animation to finish
    await page.waitForTimeout(1000);

    // Should show expanded view with malicious details
    await expect(page.getByText("Do not proceed")).toBeVisible();

    // Should show warning detail row from validation.description
    await expect(
      page
        .locator(".BlockaidDetailsExpanded__DetailRowError")
        .getByText(/A malicious transaction causes a transfer/),
    ).toBeVisible();

    await testBlockaidFeedback({ page });
  });

  test("Swap shows malicious warning when scan detects malicious tokens", async ({
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
        await page.route("*/**/account-balances/*", async (route) => {
          const json = {
            balances: {
              [`USDC:${USDC_ISSUER}`]: {
                token: {
                  type: "credit_alphanum4",
                  code: "USDC",
                  issuer: { key: USDC_ISSUER },
                },
                sellingLiabilities: "0",
                buyingLiabilities: "0",
                total: "100",
                limit: "922337203685.4775807",
                available: "100",
                blockaidData: {
                  result_type: "Malicious",
                  malicious_score: "0.9",
                  attack_types: { theft: true },
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
                token: { type: "native", code: "XLM" },
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
            error: { horizon: null, soroban: null },
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
        await stubScanTxMalicious(page);
      },
    });

    // Blockaid tx scans are gated to mainnet only
    await switchToMainnet(page);

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

    // Should be on review pane with warning banner visible
    await expect(
      page.getByRole("button", { name: "Confirm Anyway" }),
    ).toBeVisible({ timeout: 10000 });

    // Click on the warning banner to view blockaid details
    await page.getByText("This transaction was flagged as malicious").click();

    // Wait for pane animation to finish
    await page.waitForTimeout(1000);

    // Should show expanded view with malicious details
    await expect(page.getByText("Do not proceed")).toBeVisible();

    // Should show warning detail rows
    await expect(
      page
        .locator(
          ".BlockaidDetailsExpanded__DetailRow, .BlockaidDetailsExpanded__DetailRowError",
        )
        .getByText(/A malicious transaction causes a transfer/),
    ).toBeVisible();
    await testBlockaidFeedback({ page });
  });

  test("Malicious transaction ignores memo requirements", async ({
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
        await stubAccountHistory(page);
        await stubTokenDetails(page);
        await stubTokenPrices(page);
        await stubScanTxMalicious(page);
        await stubMemoRequiredAccounts(
          page,
          "GA6SXIZIKLJHCZI2KEOBEUUOFMM4JUPPM2UTWX6STAWT25JWIEUFIMFF",
        );
      },
    });

    // Blockaid tx scans are gated to mainnet only
    await switchToMainnet(page);

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
    await page.getByText("This transaction was flagged as malicious").click();

    // Wait for pane animation to finish
    await page.waitForTimeout(1000);

    // Should show malicious details
    await expect(page.getByText("Do not proceed")).toBeVisible();
  });
});

test.describe("BlockAid Scan - Malicious Site", () => {
  test("GrantAccess shows malicious warning when site is flagged as malicious", async ({
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
        // Override safe scan-dapp with malicious response (LIFO: this wins)
        await stubScanDappMalicious(context);
      },
    });

    const popupPromise = openGrantAccessPopup({ page });
    const popup = await popupPromise;

    await expect(popup.getByText("Connection Request")).toBeVisible({
      timeout: 10000,
    });

    // Malicious label should be visible
    await expect(popup.getByTestId("blockaid-malicious-label")).toBeVisible();
    await expect(
      popup.getByText("This site was flagged as malicious"),
    ).toBeVisible();

    // "Connect anyway" replaces the normal "Connect" button
    await expect(
      popup.getByTestId("grant-access-connect-anyway-button"),
    ).toBeVisible();
    await expect(
      popup.getByTestId("grant-access-connect-button"),
    ).not.toBeVisible();

    // Expand blockaid details pane
    await popup.getByTestId("blockaid-malicious-label").click();
    await popup.waitForTimeout(1000);

    // Expanded pane shows "Do not proceed" and attack type description
    await expect(popup.getByText("Do not proceed")).toBeVisible();
    await expect(
      popup.getByText(
        "A known piece of malicious code is embedded within the site.",
      ),
    ).toBeVisible();
  });

  test("SignMessage shows malicious warning when site is flagged as malicious", async ({
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
        await stubScanDappMalicious(context);
      },
    });

    const popupPromise = openSignMessagePopup({ page });
    const popup = await popupPromise;

    await expect(popup.getByText("Sign message")).toBeVisible({
      timeout: 10000,
    });

    // Malicious label should be visible
    await expect(popup.getByTestId("blockaid-malicious-label")).toBeVisible();
    await expect(
      popup.getByText("This site was flagged as malicious"),
    ).toBeVisible();

    // "Confirm anyway" replaces the normal "Confirm" button
    await expect(
      popup.getByTestId("sign-message-confirm-anyway-button"),
    ).toBeVisible();
    await expect(
      popup.getByTestId("sign-message-approve-button"),
    ).not.toBeVisible();

    // Expand blockaid details pane
    await popup.getByTestId("blockaid-malicious-label").click();
    await popup.waitForTimeout(1000);

    // Expanded pane shows "Do not proceed" and site-specific subtitle
    await expect(popup.getByText("Do not proceed")).toBeVisible();
    await expect(
      popup.getByText(
        "This site does not appear safe for the following reasons",
      ),
    ).toBeVisible();
  });
});
