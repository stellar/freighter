import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginAndFund, loginToTestAccount } from "./helpers/login";
import { TEST_TOKEN_ADDRESS, USDC_TOKEN_ADDRESS } from "./helpers/test-token";
import {
  stubAccountBalances,
  stubAccountHistory,
  stubTokenDetails,
  stubTokenPrices,
} from "./helpers/stubs";

test("Adding and removing unverified Soroban token", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubTokenDetails(page);
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage assets").click();
  await expect(page.getByText("Your assets")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "manage-assets-page.png",
  });
  await page.getByText("Add an asset").click({ force: true });
  await page.getByTestId("search-asset-input").fill(TEST_TOKEN_ADDRESS);

  await Promise.race([
    page.getByTestId("not-asset-on-list").waitFor({ state: "visible" }),
    page.getByTestId("asset-on-list").waitFor({ state: "visible" }),
  ]);

  await expect(page.getByTestId("ManageAssetRowButton")).toHaveText("Add");
  await page.getByTestId("ManageAssetRowButton").click();
  await expect(page.getByTestId("ToggleToken__asset-code")).toHaveText(
    "E2E Token",
  );
  await expect(page.getByTestId("ToggleToken__asset-add-remove")).toHaveText(
    "Add Token",
  );
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(
    page.getByTestId("ManageAssetRowButton__ellipsis-E2E"),
  ).toBeVisible();

  // now go back and make sure the asset is displayed in the account view
  await page.getByTestId("BackButton").click();
  await page.getByTestId("BackButton").click();
  await expect(page.getByTestId("account-view")).toBeVisible();
  await expect(page.getByText("E2E")).toBeVisible();

  // now go back and remove this asset
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage assets").click();
  await expect(page.getByText("Your assets")).toBeVisible();
  await expect(page.getByTestId("ManageAssetCode")).toHaveText("E2E");
  await expect(page.getByTestId("ManageAssetDomain")).toHaveText(
    "Stellar Network",
  );
  await page.getByTestId("ManageAssetRowButton__ellipsis-E2E").click();
  await page.getByText("Remove asset").click();
  await expect(page.getByTestId("ToggleToken__asset-code")).toHaveText(
    "CBVX…HWXJ",
  );
  await expect(page.getByTestId("ToggleToken__asset-add-remove")).toHaveText(
    "Remove Token",
  );
  await page.getByRole("button", { name: "Confirm" }).click();

  // Wait for navigation back to the manage assets page
  await expect(page.getByText("Your assets")).toBeVisible({
    timeout: 10000,
  });

  // Wait for the empty state message to appear
  await expect(
    page.getByText("You have no assets added. Get started by adding an asset."),
  ).toBeVisible({
    timeout: 10000,
  });
});

// Skipping this test because on Testnet, stellar.expert's asset list is formatter incorrectly
test.skip("Adding Soroban verified token", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage Assets").click({ force: true });

  await expect(page.getByText("Your assets")).toBeVisible();
  await page.getByText("Add an asset").click({ force: true });
  await page.getByTestId("search-asset-input").fill(USDC_TOKEN_ADDRESS);
  await expect(page.getByTestId("asset-on-list")).toHaveText("On your lists");
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
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(context);

  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Security").click();
  await page.getByText("Advanced Settings").click();
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
test("Adding classic asset on Testnet", async ({ page, extensionId }) => {
  test.slow();
  await loginAndFund({ page, extensionId });

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage assets").click();
  await expect(page.getByText("Your assets")).toBeVisible();
  await page.getByText("Add an asset").click({ force: true });
  await page
    .getByTestId("search-asset-input")
    .fill("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
  await expect(page.getByText("USDC")).toBeVisible();

  await page.getByTestId("ManageAssetRowButton").click();
  await expect(
    page.getByTestId("SignTransaction__TrustlineRow__Asset"),
  ).toHaveText("USDC");
  await expect(
    page.getByTestId("SignTransaction__TrustlineRow__Type"),
  ).toHaveText("Add Trustline");
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByText("Done").click();
  await expect(
    page.getByTestId("ManageAssetRowButton__ellipsis-USDC"),
  ).toBeVisible();

  // now go back and remove this asset
  await page.getByTestId("BackButton").click();
  await expect(page.getByText("Your assets")).toBeVisible();
  await expect(page.getByTestId("ManageAssetCode")).toHaveText("USDC");

  // Domain might not be available on Testnet, so check for either domain or "Stellar Network"
  const domainText = await page.getByTestId("ManageAssetDomain").textContent();
  expect(
    domainText === "centre.io" || domainText === "Stellar Network",
  ).toBeTruthy();

  await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
  await page.getByText("Remove asset").click();
  await expect(
    page.getByTestId("SignTransaction__TrustlineRow__Asset"),
  ).toHaveText("USDC");
  await expect(
    page.getByTestId("SignTransaction__TrustlineRow__Type"),
  ).toHaveText("Remove Trustline");
  await page.getByRole("button", { name: "Confirm" }).click();
  await page.getByText("Done").click();

  // Wait for navigation back to the manage assets page
  await expect(page.getByText("Your assets")).toBeVisible({
    timeout: 10000,
  });

  // Wait for the empty state message to appear
  await expect(
    page.getByText("You have no assets added. Get started by adding an asset."),
  ).toBeVisible({
    timeout: 10000,
  });
});
test.afterAll(async ({ page, extensionId }) => {
  if (
    process.env.IS_INTEGRATION_MODE &&
    test.info().status !== test.info().expectedStatus &&
    test.info().title === "Adding Soroban verified token"
  ) {
    // remove trustline in cleanup if Adding Soroban verified token test failed
    test.slow();
    await loginToTestAccount({ page, extensionId });

    await page.getByTestId("account-options-dropdown").click();
    await page.getByText("Manage assets").click({ force: true });

    await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
    await page.getByText("Remove asset").click();
    await expect(page.getByTestId("account-view")).toBeVisible({
      timeout: 30000,
    });
  }
});
