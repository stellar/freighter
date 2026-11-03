import { Page } from "@playwright/test";

import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { stubAccountBalancesWithUSDC } from "./helpers/stubs";

const USDC = "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

const switchToAccount = async (page: Page, name: string) => {
  await page.getByTestId("account-view-account-name").click();
  await page.getByText(name).click();
  await expect(page.getByTestId("account-view-account-name")).toContainText(
    name,
  );
};

const expectUsdcShown = async (page: Page, isShown: boolean) => {
  // Wait for balances to render
  await expect(page.getByTestId("account-assets")).toContainText(
    "Stellar Lumens",
  );
  const usdc = page.getByTestId("account-assets").getByText("USDC");
  if (isShown) {
    await expect(usdc.first()).toBeVisible();
  } else {
    await expect(usdc).toHaveCount(0);
  }
};

test("Hiding a token on one account leaves the others alone", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubAccountBalancesWithUSDC(page),
  });
  await expectUsdcShown(page, true);

  await page.getByTestId("account-assets").getByText("USDC").first().click();
  await page.getByAltText("asset options").click();
  await page.getByTestId("AssetDetail__hide").click();
  await expectUsdcShown(page, false);

  await switchToAccount(page, "Account 2");
  await expectUsdcShown(page, true);

  await switchToAccount(page, "Account 1");
  await expectUsdcShown(page, false);
});

test("A token hidden before the per-account update stays hidden on every account", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubAccountBalancesWithUSDC(page),
  });
  await expectUsdcShown(page, true);

  // Seed the legacy wallet-wide list
  await page.evaluate(
    (canonical) =>
      chrome.storage.local.set({ hiddenAssets: { [canonical]: "hidden" } }),
    USDC,
  );
  await page.reload();
  await expectUsdcShown(page, false);

  await switchToAccount(page, "Account 2");
  await expectUsdcShown(page, false);

  const stored = await page.evaluate(() =>
    chrome.storage.local.get(["hiddenAssets", "hiddenAssetList"]),
  );
  // Legacy list removed, token hidden for every account and network
  expect(stored.hiddenAssets).toBeUndefined();
  const byAccount = Object.values(
    stored.hiddenAssetList as Record<string, Record<string, string[]>>,
  );
  expect(byAccount.length).toBeGreaterThan(1);
  byAccount.forEach((byNetwork) =>
    Object.values(byNetwork).forEach((ids) => expect(ids).toContain(USDC)),
  );
});
