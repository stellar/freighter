import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount, PASSWORD } from "./helpers/login";
import { TEST_TOKEN_ADDRESS } from "./helpers/test-token";

const USDC_TOKEN_ADDRESS =
  "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

const STELLAR_EXPERT_ASSET_LIST_JSON = {
  name: "StellarExpert Top 50",
  provider: "StellarExpert",
  description:
    "Dynamically generated list based on technical asset metrics, including payments and trading volumes, interoperability, userbase, etc. Assets included in this list were not verified by StellarExpert team. StellarExpert is not affiliated with issuers, and does not endorse or advertise assets in the list. Assets reported for fraudulent activity removed from the list automatically.",
  version: "1.0",
  network: "testnet",
  feedback: "https://stellar.expert",
  assets: [
    {
      code: "USDC",
      issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      contract: USDC_TOKEN_ADDRESS,
      name: "USDC",
      org: "unknown",
      domain: "centre.io",
      decimals: 7,
    },
  ],
};

test("Adding unverified Soroban token", async ({ page, extensionId }) => {
  console.log(process.env.IS_INTEGRATION_MODE);
  if (!process.env.IS_INTEGRATION_MODE) {
    await page.route("*/**/testnet/asset-list/top50", async (route) => {
      const json = [STELLAR_EXPERT_ASSET_LIST_JSON];
      await route.fulfill({ json });
    });
  }
  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage assets").click({ force: true });
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
  await expect(page.getByTestId("account-view")).toContainText("E2E");
});
test("Adding Soroban verified token", async ({ page, extensionId }) => {
  if (!process.env.IS_INTEGRATION_MODE) {
    await page.route("*/**/testnet/asset-list/top50", async (route) => {
      const json = [STELLAR_EXPERT_ASSET_LIST_JSON];
      await route.fulfill({ json });
    });
  }

  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage Assets").click({ force: true });

  await expect(page.getByText("Your assets")).toBeVisible();
  await page.getByText("Add an asset").click({ force: true });
  await page.getByText("Add manually").click({ force: true });
  await page.getByTestId("search-token-input").fill(USDC_TOKEN_ADDRESS);
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
test.afterAll(async ({ page, extensionId }) => {
  if (
    test.info().status !== test.info().expectedStatus &&
    test.info().title === "Adding Soroban verified token"
  ) {
    // remove trustline in cleanup if Adding Soroban verified token test failed
    test.slow();
    await loginToTestAccount({ page, extensionId });

    await page.getByTestId("account-options-dropdown").click();
    await page.getByText("Manage Assets").click({ force: true });

    await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
    await page.getByText("Remove asset").click();
    await expect(page.getByTestId("account-view")).toBeVisible({
      timeout: 30000,
    });
  }
});
