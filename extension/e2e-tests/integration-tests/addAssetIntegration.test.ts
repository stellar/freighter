import { test, expect } from "../test-fixtures";
import { loginToTestAccount } from "../helpers/login";
import { TEST_TOKEN_ADDRESS } from "../helpers/test-token";
import { goToAddAsset, startRemoveAsset } from "../helpers/assets";

// test.beforeEach(async ({ page, context }) => {
//   if (!process.env.IS_INTEGRATION_MODE) {
//     await stubAllExternalApis(page, context);
//     await stubTokenDetails(page);
//   }
// });

const isIntegrationMode = process.env.IS_INTEGRATION_MODE === "true";

test("Adding classic asset on Testnet", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });

  await goToAddAsset(page);
  await page
    .getByTestId("search-asset-input")
    .fill("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
  // Wait for search results to load
  await page.waitForLoadState("networkidle");
  // Get the first ManageAssetCode that contains USDC (there may be multiple assets listed).
  // The code is rendered in a div (AssetListRow__code), not a span, so match by testid only.
  await expect(
    page.locator('[data-testid="ManageAssetCode"] >> text=USDC').first(),
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

  if (isIntegrationMode) {
    // if we're running in integration mode, verify the asset was actually added
    await page.getByText("Done").click();

    // Adding lands back on Home: the asset list it used to return to is gone,
    // and the asset's own row on the balances list is the proof it was added.
    await expect(page.getByTestId("account-view")).toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.getByTestId("account-assets-item").filter({ hasText: "USDC" }),
    ).toBeVisible({ timeout: 20000 });

    // Removal moved from the retired screen's per-row menu to Asset Details.
    await startRemoveAsset(page, "USDC");
    await expect(page.getByTestId("ChangeTrustInternal__Body")).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText("Remove Trustline")).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.getByText("Done").click();

    await expect(page.getByTestId("account-view")).toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.getByTestId("account-assets-item").filter({ hasText: "USDC" }),
    ).toHaveCount(0);
  }
});

// Helper function to avoid importing from extension source (which causes Node.js module resolution issues)
const truncateString = (str: string, charCount = 4) =>
  str ? `${str.slice(0, charCount)}…${str.slice(-charCount)}` : "";

// Snapshot file doesn't exist - run with --update-snapshots to create baseline
test("Adding and removing unverified Soroban token", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });

  await goToAddAsset(page);
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
    await expect(notOnLists).toHaveText("Unverified");
    // Non-SAC contract tokens display their name (displayCode), so the E2E
    // token's code cell reads "E2E Token", not "E2E".
    await expect(page.getByTestId("ManageAssetCode")).toHaveText("E2E Token");
    await expect(page.getByTestId("ManageAssetRowButton")).toHaveText("Add");
  } else if (await onLists.isVisible()) {
    // Case 2: token is already on your lists
    await expect(onLists).toHaveText("Verified");
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

  if (isIntegrationMode) {
    // if we're running in integration mode, verify the asset was actually added
    await expect(
      page.getByTestId("ManageAssetRowButton__ellipsis-E2E"),
    ).toBeVisible();

    // One step back, not two: search is reached from Home now, so leaving the
    // add flow lands on the account view rather than the retired asset list.
    await page.getByTestId("BackButton").click();
    await expect(page.getByTestId("account-view")).toBeVisible();
    await expect(page.getByText("E2E")).toBeVisible();

    // now go back and remove this asset
    await startRemoveAsset(page, "E2E");
    await expect(page.getByTestId("ToggleToken__asset-code")).toHaveText(
      truncateString(TEST_TOKEN_ADDRESS),
    );
    await expect(page.getByTestId("ToggleToken__asset-add-remove")).toHaveText(
      "Remove Token",
    );
    await page.getByRole("button", { name: "Confirm" }).click();

    // That empty-state copy belonged to the retired asset list; the balances
    // list on Home no longer showing the token is the equivalent assertion.
    await expect(page.getByTestId("account-view")).toBeVisible({
      timeout: 30000,
    });
    await expect(
      page.getByTestId("account-assets-item").filter({ hasText: "E2E" }),
    ).toHaveCount(0);
  }
});

test.afterAll(async ({ page, extensionId, context }) => {
  if (
    isIntegrationMode &&
    test.info().status !== test.info().expectedStatus &&
    test.info().title === "Adding classic asset on Testnet"
  ) {
    // remove trustline in cleanup if Adding Soroban verified token test failed
    test.slow();
    await loginToTestAccount({ page, extensionId, context });

    await startRemoveAsset(page, "USDC");
    await page.getByRole("button", { name: "Confirm" }).click();
    await page.getByText("Done").click();
    await expect(page.getByTestId("account-view")).toBeVisible({
      timeout: 30000,
    });
  }
});
