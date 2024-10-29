import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount, PASSWORD } from "./helpers/login";
import { TEST_TOKEN_ADDRESS } from "./helpers/test-token";

test("Adding unverified Soroban token", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage Assets").click({ force: true });
  await expect(page.getByText("Your assets")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "manage-assets-page.png",
  });
  await page.getByText("Add an asset").click({ force: true });
  await page.getByText("Add manually").click({ force: true });
  await page.getByTestId("search-token-input").fill(TEST_TOKEN_ADDRESS);
  await expect(page.getByTestId("asset-notification")).toHaveText(
    "Not on your listsFreighter uses asset lists to check assets you interact with. You can define your own assets lists in Settings.",
  );
  await expect(page.getByTestId("ManageAssetCode")).toHaveText("E2E");
  await expect(page.getByTestId("ManageAssetRowButton")).toHaveText("Add");
  await page.getByTestId("ManageAssetRowButton").click({ force: true });

  await expect(page.getByTestId("token-warning-notification")).toHaveText(
    "This asset is not part of an asset list. Please, double-check the asset you’re interacting with and proceed with care. Freighter uses asset lists to check assets you interact with. You can define your own assets lists in Settings.",
  );
  await expectPageToHaveScreenshot({
    page,
    screenshot: "manage-assets-unverified-token.png",
  });
  await page.getByTestId("add-asset").dispatchEvent("click");
  await expect(page.getByTestId("account-view")).toContainText("E2E");
});
test("Adding Soroban verified token", async ({ page, extensionId }) => {
  const assetsList = await fetch(
    "https://api.stellar.expert/explorer/testnet/asset-list/top50",
  );
  const assetsListData = await assetsList.json();
  const verifiedToken =
    assetsListData?.assets[0]?.contract ||
    "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage Assets").click({ force: true });

  await expect(page.getByText("Your assets")).toBeVisible();
  await page.getByText("Add an asset").click({ force: true });
  await page.getByText("Add manually").click({ force: true });
  await page.getByTestId("search-token-input").fill(verifiedToken);
  await expect(page.getByTestId("asset-notification")).toHaveText(
    "On your listsFreighter uses asset lists to check assets you interact with. You can define your own assets lists in Settings.",
  );
  await expect(page.getByTestId("ManageAssetCode")).toHaveText("USDC");
  await expect(page.getByTestId("ManageAssetRowButton")).toHaveText("Add");
  await page.getByTestId("ManageAssetRowButton").click({ force: true });

  await expect(page.getByTestId("token-warning-notification")).toHaveText(
    `This asset is part of the asset lists "StellarExpert Top 50."Freighter uses asset lists to check assets you interact with. You can define your own assets lists in Settings.
    `,
  );
  await expectPageToHaveScreenshot({
    page,
    screenshot: "manage-assets-verified-token.png",
  });
  await page.getByTestId("add-asset").dispatchEvent("click");
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
