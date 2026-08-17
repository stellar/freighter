import type { Page } from "@playwright/test";

import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { USDC_TOKEN_ADDRESS } from "./helpers/test-token";
import {
  stubAccountBalances,
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

const stubUnfundedBalances = async (page: Page) => {
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
};

// The default fixture stubs three populated collections, so an unfunded account
// here still has collectibles: the pill is in play on both tabs, and the Tokens
// empty state hands its funding action over rather than rendering it too.
test("Tokens tab hands its funding action to the pill when collectibles exist", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await stubUnfundedBalances(page);
    },
  });
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  await expect(page.getByText("Looking a little empty...")).toBeVisible({
    timeout: 20000,
  });

  // The empty state still explains itself, but carries no button of its own.
  await expect(page.getByTestId("not-funded").locator("button")).toHaveCount(0);

  // Adding a token needs a trustline, so the pill offers funding instead. This
  // fixture is on Testnet, where the funding action is Friendbot.
  await expect(page.getByTestId("add-token-btn")).toHaveCount(0);
  const fundPill = page.getByTestId("fund-account-btn");
  await expect(fundPill).toBeVisible({ timeout: 20000 });
  await expect(fundPill).toHaveText("Fund with Friendbot");
});

// The other half of the rule: with nothing in either tab, each empty state
// carries its own Add action and no pill is rendered on either of them.
test("Both empty states carry their own CTA when the account has nothing", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await stubUnfundedBalances(page);
      // /collectibles is fetched by the background worker, so it needs
      // context.route; registering it after stubAllExternalApis wins.
      await context.route("**/collectibles**", async (route) => {
        await route.fulfill({ json: { data: { collections: [] } } });
      });
    },
  });
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  // Tokens: the funding action lives inside the empty state.
  await expect(page.getByText("Looking a little empty...")).toBeVisible({
    timeout: 20000,
  });
  await expect(
    page.getByTestId("not-funded").getByText("Fund with Friendbot"),
  ).toBeVisible();
  await expect(page.getByTestId("add-token-btn")).toHaveCount(0);
  await expect(page.getByTestId("fund-account-btn")).toHaveCount(0);

  // Collectibles: likewise, and still no pill.
  await page.getByTestId("account-tab-collectibles").click();
  await expect(page.getByText("No collectibles yet")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("add-collectible-inline-btn")).toBeVisible();
  await expect(page.getByTestId("add-collectible-btn")).toHaveCount(0);
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
