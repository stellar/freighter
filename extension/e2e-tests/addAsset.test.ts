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

// The page navigation after clicking 'Manage Assets' doesn't complete reliably.
// 'Your assets' text never appears even with long timeouts and waitForLoadState.
test.fixme("Adding Soroban verified token", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("account-options-dropdown").click();
  const manageAssetsText = page.getByText("Manage Assets");
  await expect(manageAssetsText).toBeVisible();
  await manageAssetsText.click({ force: true });
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Your assets")).toBeVisible({ timeout: 10000 });
  await page.getByText("Add an asset").click({ force: true });
  await page.getByTestId("search-asset-input").fill(USDC_TOKEN_ADDRESS);
  await expect(page.getByTestId("asset-on-list")).toHaveText("Verified");
  await expect(page.getByTestId("ManageAssetCode")).toHaveText("USDC");
  await expect(page.getByTestId("ManageAssetRowButton")).toHaveText("Add");
  await page.getByTestId("ManageAssetRowButton").click({ force: true });

  await expectPageToHaveScreenshot({
    page,
    screenshot: "manage-assets-verified-token.png",
  });
  await page.getByTestId("ManageAssetRowButton").dispatchEvent("click");
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage Assets").click();
  await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
  await page.getByText("Remove asset").click();

  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
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

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Security").click();
  await page.getByText("Advanced settings").click();
  await page.getByText("I understand, continue").click();
  await page.getByTestId("isExperimentalModeEnabledValue").click();
  await expect(page.locator("#isExperimentalModeEnabledValue")).toBeChecked();
  // wait for the Background script to be updated
  await page.waitForTimeout(1000);
  await page.getByTestId("BackButton").click();
  await page.getByTestId("BackButton").click();
  await page.getByTestId("BackButton").click();

  await expect(page.getByTestId("account-options-dropdown")).toBeVisible();
  await page.getByTestId("account-options-dropdown").click();

  const manageAssets = page.getByText("Manage assets");
  await expect(manageAssets).toBeVisible();
  await expect(manageAssets).toBeEnabled();
  await manageAssets.click();

  await expect(page.getByText("Your assets")).toBeVisible();
  await page.getByText("Add an asset").click({ force: true });
  await expect(page.getByTestId("search-token-input")).toBeVisible();
});

// The Tokens tab's primary "add" action is the floating pill on the account
// view. The tests above reach asset search the long way, through the options
// menu, so they would not catch the pill breaking.
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

test.afterAll(async ({ page, extensionId, context }) => {
  if (
    process.env.IS_INTEGRATION_MODE &&
    test.info().status !== test.info().expectedStatus &&
    test.info().title === "Adding Soroban verified token"
  ) {
    // remove trustline in cleanup if Adding Soroban verified token test failed
    test.slow();
    await loginToTestAccount({ page, extensionId, context });

    await page.getByTestId("account-options-dropdown").click();
    await page.getByText("Manage assets").click({ force: true });

    await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
    await page.getByText("Remove asset").click();
    await expect(page.getByTestId("account-view")).toBeVisible({
      timeout: 30000,
    });
  }
});
