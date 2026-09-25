import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { USDC_TOKEN_ADDRESS } from "./helpers/test-token";
import {
  stubAccountBalances,
  stubAccountBalancesV2,
  stubAccountHistory,
  stubTokenDetails,
  stubTokenPrices,
  stubAllExternalApis,
} from "./helpers/stubs";
import { goToAddAsset } from "./helpers/assets";
import { goToSettings } from "./helpers/network";

// Stops short of actually adding the trustline: that needs a funded account on
// a real network, and `addAssetIntegration.test.ts` covers the add-and-remove
// round trip in integration mode. What is worth asserting here, and can be
// asserted against stubs, is that a verified Soroban asset is found and
// presented correctly.
test("Presents a verified Soroban token in asset search", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await goToAddAsset(page);
  await page.getByTestId("search-asset-input").fill(USDC_TOKEN_ADDRESS);
  await expect(page.getByTestId("asset-on-list")).toHaveText("Verified");
  await expect(page.getByTestId("ManageAssetCode")).toHaveText("USDC");
  await expect(page.getByTestId("ManageAssetRowButton")).toHaveText("Add");

  await expectPageToHaveScreenshot({
    page,
    screenshot: "search-verified-token.png",
  });
});

test("Adding token on Futurenet", async ({ page, extensionId, context }) => {
  await stubAllExternalApis(page, context);
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(context);

  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await goToSettings(page);
  await page.getByRole("link", { name: "Security" }).click();
  await page.getByText("Advanced settings").click();
  await page.getByText("I understand, continue").click();
  await page.getByTestId("isExperimentalModeEnabledValue").click();
  await expect(page.locator("#isExperimentalModeEnabledValue")).toBeChecked();
  // wait for the Background script to be updated
  await page.waitForTimeout(1000);
  await page.getByTestId("BackButton").click();
  await page.getByTestId("BackButton").click();
  await page.getByTestId("BackButton").click();

  await goToAddAsset(page);
  await expect(page.getByTestId("search-token-input")).toBeVisible();
});

// The Tokens tab's primary "add" action is the floating pill on the account
// view. The tests above reach search through `goToAddAsset`, which drives the
// same pill -- this one asserts the routing explicitly so a change to either
// is caught by name.
test("Tokens tab add button routes to asset search", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  const addToken = page.getByTestId("add-token-btn");
  await expect(addToken).toBeVisible();
  await expect(addToken).toHaveText("Add token");

  await addToken.click();

  await expect(page.getByTestId("search-asset-input")).toBeVisible({
    timeout: 20000,
  });
});

test("Tokens tab add button is absent for an unfunded account", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await page.route("**/account-balances/**", async (route) => {
        await route.fulfill({
          json: {
            balances: {},
            isFunded: false,
            subentryCount: 0,
            error: { horizon: null, soroban: null },
          },
        });
      });
      // v2 is the default balances source and stubAllExternalApis already
      // registered a funded fixture for it, so the v1 override alone leaves
      // the account looking funded. A null fixture serves is_funded: false.
      await stubAccountBalancesV2(page, () => null);
    },
  });
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  // The unfunded empty state carries its own "Add XLM" action, so the pill
  // would be a duplicate call to action and is deliberately not rendered.
  await expect(page.getByText("Looking a little empty...")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("add-token-btn")).toHaveCount(0);
});
