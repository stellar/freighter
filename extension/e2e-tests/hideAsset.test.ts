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

// The canonical id the USDC balance stub uses; BalanceRow tags its fiat cell
// with it, which is how we tell "priced" from "row is back but has no price".
const USDC_CANONICAL =
  "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

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

test("Keeps a token's price after hiding it, reopening the popup, and unhiding", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };
  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  // Token prices are fetched on Mainnet only.
  await switchNetwork(page, "Mainnet");

  const usdcRow = page
    .getByTestId("account-assets-item")
    .filter({ hasText: "USDC" });
  const usdcFiat = page.getByTestId(`asset-amount-${USDC_CANONICAL}`);

  await expect(usdcRow).toBeVisible({ timeout: 30000 });
  await expect(usdcFiat).toBeVisible({ timeout: 30000 });

  await openAssetDetails(page, "USDC");
  await page.getByAltText("asset options").click();
  await page.getByTestId("asset-detail-hide-button").click({ force: true });
  await expect(usdcRow).toHaveCount(0, { timeout: 20000 });

  // The restart is the whole point. Redux holds the price map and does not
  // persist, so this is what forces it to be rebuilt while USDC is hidden --
  // and the map is cached per account and network with no record of which
  // assets it covers, so a gapped one reads as complete. Unhiding in the same
  // session cannot reproduce this: the map still holds the price from before
  // the hide.
  //
  // `reload()`, not a `goto` back to `index.html#/`: the popup is already
  // there, and a navigation that differs only in the hash is same-document.
  // The store survives it and the test passes against the bug.
  await page.reload();
  await expectHomeReady(page);

  await openHiddenSheet(page);
  await page.getByTestId("HiddenAssets__unhide-USDC").click();
  await expect(page.getByTestId("HiddenAssets__empty")).toBeVisible({
    timeout: 20000,
  });
  await backToHome(page);

  // The row coming back is not enough -- that only needs the visibility
  // mirror. The fiat cell is what the price map decides, and BalanceRow omits
  // it entirely when there is no price.
  await expect(usdcRow).toBeVisible({ timeout: 30000 });
  await expect(usdcFiat).toBeVisible({ timeout: 30000 });
});
