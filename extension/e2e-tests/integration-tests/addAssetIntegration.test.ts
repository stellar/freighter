import { test, expect, expectPageToHaveScreenshot } from "../test-fixtures";
import { loginToTestAccount } from "../helpers/login";
import { stubAllExternalApis, stubTokenDetails } from "../helpers/stubs";
import { TEST_TOKEN_ADDRESS } from "../helpers/test-token";

test.beforeEach(async ({ page, context }) => {
  if (!process.env.IS_INTEGRATION_MODE) {
    await stubAllExternalApis(page, context);
    await stubTokenDetails(page);
  }
});

test("Adding classic asset on Testnet", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage assets").click();
  await expect(page.getByText("Your assets")).toBeVisible();
  await page.getByText("Add an asset").click({ force: true });
  await page
    .getByTestId("search-asset-input")
    .fill("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
  // Wait for search results to load
  await page.waitForLoadState("networkidle");
  // Get the first ManageAssetCode that contains USDC (there may be multiple assets listed)
  await expect(
    page.locator('span[data-testid="ManageAssetCode"] >> text=USDC').first(),
  ).toBeVisible();

  await page.getByTestId("ManageAssetRowButton").first().click();
  await expect(
    page.getByTestId("SignTransaction__TrustlineRow__Asset"),
  ).toHaveText("USDC");
  await expect(
    page.getByTestId("SignTransaction__TrustlineRow__Type"),
  ).toHaveText("Add Trustline");
  await page.getByRole("button", { name: "Confirm" }).click();
  await expect(page.getByText("Done")).toBeVisible();

  if (process.env.IS_INTEGRATION_MODE) {
    // if we're running in integration mode, verify the asset was actually added
    await page.getByText("Done").click();
    await expect(
      page.getByTestId("ManageAssetRowButton__ellipsis-USDC"),
    ).toBeVisible();

    // now go back and remove this asset
    await page.getByTestId("BackButton").click();
    await expect(page.getByText("Your assets")).toBeVisible();
    await expect(page.getByTestId("ManageAssetCode")).toHaveText("USDC");
    await expect(page.getByTestId("ManageAssetDomain")).toHaveText("centre.io");
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
    await expect(
      page.getByText(
        "You have no assets added. Get started by adding an asset.",
      ),
    ).toBeVisible();
  }
});

// Helper function to avoid importing from extension source (which causes Node.js module resolution issues)
const truncateString = (str: string, charCount = 4) =>
  str ? `${str.slice(0, charCount)}…${str.slice(-charCount)}` : "";

// Snapshot file doesn't exist - run with --update-snapshots to create baseline
test("Adding and removing unverified Soroban token", async ({
  page,
  extensionId,
}) => {
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
  const notOnLists = page.getByTestId("not-asset-on-list");
  const onLists = page.getByTestId("asset-on-list");

  // Wait for either to be visible
  await Promise.race([
    notOnLists.waitFor({ state: "visible" }),
    onLists.waitFor({ state: "visible" }),
  ]);

  if (await notOnLists.isVisible()) {
    // Case 1: token is not on your lists
    await expect(notOnLists).toHaveText("Not on your lists");
    await expect(page.getByTestId("ManageAssetCode")).toHaveText("E2E");
    await expect(page.getByTestId("ManageAssetRowButton")).toHaveText("Add");
  } else if (await onLists.isVisible()) {
    // Case 2: token is already on your lists
    await expect(onLists).toHaveText("On your lists");
    await expect(page.getByTestId("ManageAssetCode")).toHaveText(
      truncateString(TEST_TOKEN_ADDRESS),
    );
    await expect(page.getByTestId("ManageAssetRowButton")).toHaveText("Add");
  } else {
    throw new Error(
      "Expected token to be either on or not on lists, but neither was visible",
    );
  }
  await page.getByTestId("ManageAssetRowButton").click();
  await expect(page.getByTestId("ToggleToken__asset-code")).toHaveText(
    "E2E Token",
  );
  await expect(page.getByTestId("ToggleToken__asset-add-remove")).toHaveText(
    "Add Token",
  );
  await page.getByRole("button", { name: "Confirm" }).click();

  if (process.env.IS_INTEGRATION_MODE) {
    // if we're running in integration mode, verify the asset was actually added
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
      truncateString(TEST_TOKEN_ADDRESS),
    );
    await expect(page.getByTestId("ToggleToken__asset-add-remove")).toHaveText(
      "Remove Token",
    );
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(
      page.getByText(
        "You have no assets added. Get started by adding an asset.",
      ),
    ).toBeVisible();
  }
});

test.afterAll(async ({ page, extensionId }) => {
  if (
    process.env.IS_INTEGRATION_MODE &&
    test.info().status !== test.info().expectedStatus &&
    test.info().title === "Adding classic asset on Testnet"
  ) {
    // remove trustline in cleanup if Adding Soroban verified token test failed
    test.slow();
    await loginToTestAccount({ page, extensionId });

    await page.getByTestId("account-options-dropdown").click();
    await page.getByText("Manage assets").click();

    await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
    await page.getByText("Remove asset").click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.getByText("Done").click();
    await expect(page.getByTestId("account-view")).toBeVisible({
      timeout: 30000,
    });
  }
});
