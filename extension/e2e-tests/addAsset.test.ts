import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount, PASSWORD } from "./helpers/login";

test("Adding unverified Soroban token", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByText("Manage Assets").click({ force: true });
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByText("Log In").click({ force: true });
  await expectPageToHaveScreenshot({
    page,
    screenshot: "manage-assets-page.png",
  });
  await expect(page.getByText("Choose Asset")).toBeVisible();
  await page.getByText("Add Soroban token").click({ force: true });
  await page
    .getByTestId("search-token-input")
    .fill("CAEOFUGMYLPQ7EGALPNB65N47EWSXLWMW6OWMRUQSQHBNSEIKQD2NCKV");
  await expect(page.getByTestId("asset-notification")).toHaveText(
    "Not on your listsFreighter uses asset lists to check assets you interact with. You can define your own assets lists in Settings.",
  );
  await expect(page.getByTestId("ManageAssetCode")).toHaveText("E2E Token");
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
  await expect(page.getByTestId("account-view")).toContainText("100 E2E");
});
test("Adding Soroban verified token", async ({ page, extensionId }) => {
  // USDC: The verification status of this contract is subject to change.
  // taken from: https://api.stellar.expert/explorer/testnet/asset-list/top50
  const verifiedToken =
    "CAQCFVLOBK5GIULPNZRGATJJMIZL5BSP7X5YJVMGCPTUEPFM4AVSRCJU";

  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByText("Manage Assets").click({ force: true });
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByText("Log In").click({ force: true });

  await expect(page.getByText("Choose Asset")).toBeVisible();
  await page.getByText("Add Soroban token").click({ force: true });
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
  await expect(page.getByTestId("account-view")).toBeVisible();
});
