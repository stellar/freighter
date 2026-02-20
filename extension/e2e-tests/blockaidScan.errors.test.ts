import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import {
  stubAccountBalances,
  stubScanAssetServerError,
  stubScanTxServerError,
  stubScanTxUnableToScan,
  abortApiEndpoint,
  createAssetObject,
} from "./helpers/stubs";

test.describe("BlockAid Scan - Edge Cases", () => {
  test.describe("API Error Handling", () => {
    test("Add asset treats scan API server error (500) as unable to scan", async ({
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
          await stubScanAssetServerError(page);
          // Mock mainnet balances so asset scan proceeds
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

      const classicAssetIssuer =
        "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
      await page.getByTestId("search-asset-input").fill(classicAssetIssuer);

      await expect(page.getByTestId("ManageAssetRowButton")).toBeVisible({
        timeout: 10000,
      });
      await page.getByTestId("ManageAssetRowButton").click();

      // When scan API returns 500, should show "Confirm Anyway" (unable-to-scan state)
      // The asset should NOT silently pass as safe
      await expect(
        page.getByRole("button", { name: "Confirm Anyway" }),
      ).toBeVisible({ timeout: 10000 });
    });

    test("Send payment treats scan API server error (500) as unable to scan", async ({
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
          await stubScanTxServerError(page);
        },
      });

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

      // When scan API returns 500, should show warning (unable-to-scan)
      // NOT silently treat as safe
      await expect(
        page.getByRole("button", { name: "Confirm Anyway" }),
      ).toBeVisible({ timeout: 10000 });
    });

    test("Send payment treats network failure (aborted) as unable to scan", async ({
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
          await abortApiEndpoint(page, "**/scan-tx**");
        },
      });

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

      // When network is down, should show warning (unable-to-scan)
      // NOT silently treat as safe
      await expect(
        page.getByRole("button", { name: "Confirm Anyway" }),
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Asset vs Transaction Copy Distinction", () => {
    test("Asset unable-to-scan shows token-specific copy, not transaction copy", async ({
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
          // Return null data to trigger unable-to-scan
          await page.route("**/scan-asset**", async (route) => {
            await route.fulfill({
              json: { data: null, error: null },
            });
          });
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

      const classicAssetIssuer =
        "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
      await page.getByTestId("search-asset-input").fill(classicAssetIssuer);

      await expect(page.getByTestId("ManageAssetRowButton")).toBeVisible({
        timeout: 10000,
      });
      await page.getByTestId("ManageAssetRowButton").click();

      // Should show warning
      await expect(
        page.getByRole("button", { name: "Confirm Anyway" }),
      ).toBeVisible({ timeout: 10000 });

      // Click the warning banner to expand
      await page.getByText("Proceed with caution").click();
      await page.waitForTimeout(1000);

      // Should show asset-specific "Unable to scan token" text
      await expect(
        page
          .locator(".BlockaidDetailsExpanded__DetailRow")
          .getByText("Unable to scan token"),
      ).toBeVisible();

      // Should NOT show transaction-specific text
      await expect(
        page.getByText("Unable to scan transaction"),
      ).not.toBeVisible();
    });

    test("Transaction unable-to-scan shows transaction-specific copy, not asset copy", async ({
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

      // Should show warning
      await expect(
        page.getByRole("button", { name: "Confirm Anyway" }),
      ).toBeVisible({ timeout: 10000 });

      // Click the warning banner to expand
      await page.getByText("Proceed with caution").click();
      await page.waitForTimeout(1000);

      // Should show transaction-specific "Unable to scan transaction" text
      await expect(
        page
          .locator(".BlockaidDetailsExpanded__DetailRow")
          .getByText("Unable to scan transaction"),
      ).toBeVisible();

      // Should NOT show asset-specific text
      await expect(page.getByText("Unable to scan token")).not.toBeVisible();
    });
  });
});
