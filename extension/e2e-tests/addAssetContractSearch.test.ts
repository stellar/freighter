import { Page } from "@playwright/test";
import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { TEST_TOKEN_ADDRESS } from "./helpers/test-token";
import {
  stubTokenDetails,
  stubIsSac,
  stubScanAssetSafe,
} from "./helpers/stubs";

/**
 * Stub the Stellar Expert asset search to return a mix of classic assets
 * and contract IDs, matching the updated API payload format.
 */
const stubAssetSearchWithContractId = async (page: Page) => {
  await page.route("**/asset?search**", async (route) => {
    const json = {
      _embedded: {
        records: [
          {
            asset:
              "USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
          },
          {
            asset: TEST_TOKEN_ADDRESS,
          },
        ],
      },
    };
    await route.fulfill({ json });
  });
};

/**
 * Stub account balances to include the E2E test token so it appears
 * as already added.
 */
const stubAccountBalancesWithTestToken = async (page: Page) => {
  const e2eAssetCode = `E2E:${TEST_TOKEN_ADDRESS}`;
  await page.route("**/account-balances/**", async (route) => {
    const json = {
      balances: {
        native: {
          token: {
            type: "native",
            code: "XLM",
          },
          total: "10000.0000000",
          available: "10000.0000000",
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
        [e2eAssetCode]: {
          token: {
            code: "E2E",
            issuer: {
              key: TEST_TOKEN_ADDRESS,
            },
          },
          contractId: TEST_TOKEN_ADDRESS,
          symbol: "E2E",
          decimals: 3,
          total: "100000099976",
          available: "100000099976",
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
};

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
      await stubAccountBalancesWithTestToken(page);
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
