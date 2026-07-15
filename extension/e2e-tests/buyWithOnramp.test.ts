import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { stubAccountBalancesV2 } from "./helpers/stubs";

// Zero-XLM unfunded fixture shared by both tests, served on both the v1 and
// v2 balances endpoints.
const zeroXlmBalances = {
  balances: {
    native: {
      token: {
        type: "native",
        code: "XLM",
      },
      total: "0",
      available: "0",
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
  isFunded: false,
  subentryCount: 0,
  error: {
    horizon: null,
    soroban: null,
  },
};

test("should show add XLM page and open Coinbase", async ({
  page,
  extensionId,
  context,
}) => {
  const stubOverrides = async () => {
    // Override account-balances to return 0 XLM balance
    await page.route("**/account-balances/**", async (route) => {
      await route.fulfill({ json: zeroXlmBalances });
    });
    await stubAccountBalancesV2(page, zeroXlmBalances);

    // Stub /token endpoint
    await page.route("**/token", async (route) => {
      await route.fulfill({
        json: {
          data: {
            token: "MWYwZjU5ODEtYjkxOC02YzkwLWI3YzItNWVhZDYyZDQ1M2M0",
          },
        },
      });
    });
  };
  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  await page.getByTestId("network-selector-open").click();
  await page.getByText("Main Net").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  const popupPromise = page.context().waitForEvent("page");
  await page.getByText("Add XLM").click();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "add-xlm-page.png",
  });

  await page.getByText("Buy XLM with Coinbase").click();

  const popup = await popupPromise;

  await expect(popup).toHaveURL(/https:\/\/pay\.coinbase\.com\//);
  await expect(popup).toHaveURL(/defaultAsset=XLM/);
});

test("should show Buy with Coinbase and open Coinbase", async ({
  page,
  extensionId,
  context,
}) => {
  const stubOverrides = async () => {
    // Override account-balances to return 0 XLM balance
    await page.route("**/account-balances/**", async (route) => {
      await route.fulfill({ json: zeroXlmBalances });
    });
    await stubAccountBalancesV2(page, zeroXlmBalances);

    // Stub /token endpoint
    await page.route("**/token", async (route) => {
      await route.fulfill({
        json: {
          data: {
            token: "MWYwZjU5ODEtYjkxOC02YzkwLWI3YzItNWVhZDYyZDQ1M2M0",
          },
        },
      });
    });
  };
  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  await page.getByTestId("network-selector-open").click();
  await page.getByText("Main Net").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  const popupPromise = page.context().waitForEvent("page");
  await page.getByTestId("nav-link-add").click();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "buy-with-coinbase.png",
  });

  await page.getByText("Buy with Coinbase").click();

  const popup = await popupPromise;

  await expect(popup).toHaveURL(/https:\/\/pay\.coinbase\.com\//);
  await expect(popup).not.toHaveURL(/defaultAsset=XLM/);
});
