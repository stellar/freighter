import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { goToAddAsset, openAssetDetails } from "./helpers/assets";
import { expectHomeReady, switchNetwork } from "./helpers/network";
import { stubAccountBalancesWithUSDC } from "./helpers/stubs";

const openHiddenSheet = async (page: any) => {
  await goToAddAsset(page);
  await page.getByTestId("hidden-assets-btn").click();
  await expect(page.getByTestId("HiddenAssets")).toBeVisible({
    timeout: 20000,
  });
};

const backToHome = async (page: any) => {
  await page.getByTestId("HiddenAssets__close").click();
  await page.getByTestId("BackButton").click();
  await expectHomeReady(page);
};

test("Hides a token from asset details and unhides it from the sheet", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };
  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  const usdcRow = page
    .getByTestId("account-assets-item")
    .filter({ hasText: "USDC" });
  await expect(usdcRow).toBeVisible({ timeout: 30000 });

  // Hide from the asset's own detail sheet -- the menu that replaced the
  // retired Manage assets screen's per-row toggle.
  await openAssetDetails(page, "USDC");
  await page.getByAltText("asset options").click();
  await page.getByTestId("asset-detail-hide-button").click({ force: true });

  // The row leaves the balances list immediately; the redux mirror is what
  // makes that happen without a refetch.
  await expect(usdcRow).toHaveCount(0, { timeout: 20000 });

  await openHiddenSheet(page);
  await expect(page.getByTestId("HiddenAssets__row-USDC")).toBeVisible();

  await page.getByTestId("HiddenAssets__unhide-USDC").click();
  await expect(page.getByTestId("HiddenAssets__empty")).toBeVisible({
    timeout: 20000,
  });

  await backToHome(page);
  await expect(usdcRow).toBeVisible({ timeout: 30000 });
});

test("Keeps hidden tokens scoped to the network they were hidden on", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };
  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  await expect(
    page.getByTestId("account-assets-item").filter({ hasText: "USDC" }),
  ).toBeVisible({ timeout: 30000 });

  await openAssetDetails(page, "USDC");
  await page.getByAltText("asset options").click();
  await page.getByTestId("asset-detail-hide-button").click({ force: true });

  await openHiddenSheet(page);
  await expect(page.getByTestId("HiddenAssets__row-USDC")).toBeVisible();
  await backToHome(page);

  // The store is keyed by network and account, so another network has nothing
  // hidden. This is the regression the 5.46.0 migration exists to prevent.
  await switchNetwork(page, "Mainnet");
  await openHiddenSheet(page);
  await expect(page.getByTestId("HiddenAssets__empty")).toBeVisible({
    timeout: 20000,
  });

  // ...and it is still hidden back on Testnet. Without this the test would
  // also pass if the sheet had simply failed to load on Mainnet.
  await backToHome(page);
  await switchNetwork(page, "Testnet");
  await openHiddenSheet(page);
  await expect(page.getByTestId("HiddenAssets__row-USDC")).toBeVisible({
    timeout: 20000,
  });
});
