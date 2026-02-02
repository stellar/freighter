import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import {
  stubAccountBalances,
  stubAccountHistory,
  stubScanDapp,
  stubTokenDetails,
  stubTokenPrices,
  stubCollectibles,
} from "./helpers/stubs";

test("Hide and unhide a collectible", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);
  await stubCollectibles(page);

  await page.route("**/collectibles**", async (route) => {
    const json = {
      data: {
        collections: [
          // Stellar Frogs Collection
          {
            collection: {
              address:
                "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
              name: "Stellar Frogs",
              symbol: "SFROG",
              collectibles: [
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "1",
                  token_uri: "https://nftcalendar.io/tokenMetadata/1",
                },
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "2",
                  token_uri: "https://nftcalendar.io/tokenMetadata/2",
                },
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "3",
                  token_uri: "https://nftcalendar.io/tokenMetadata/3",
                },
              ],
            },
          },
          // Soroban Domains Collection
          {
            collection: {
              address: "CCCSorobanDomainsCollection",
              name: "Soroban Domains",
              symbol: "SDOM",
              collectibles: [
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "102510",
                  token_uri: "https://nftcalendar.io/tokenMetadata/102510",
                },
              ],
            },
          },
        ],
      },
    };
    await route.fulfill({ json });
  });

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Main Net").click();

  // Navigate to collectibles tab
  await expect(page.getByTestId("account-view")).toBeVisible();
  await page.getByTestId("account-tab-collectibles").click();

  // Verify collectibles are showing
  await expect(page.getByText("Stellar Frogs")).toBeVisible();
  await expect(page.getByText("Soroban Domains")).toBeVisible();

  // Take a screenshot of the collectibles view
  await expectPageToHaveScreenshot({
    page,
    screenshot: "collectibles-view-before-hide.png",
  });

  // Click on a collectible to open detail view
  const collectibleGrid = page.getByTestId("account-collection-grid").first();
  await collectibleGrid.locator("div").first().click();

  // Wait for detail view to open
  await expect(page.getByTestId("CollectibleDetail")).toBeVisible();

  // Take a screenshot of the collectible detail
  await expectPageToHaveScreenshot({
    page,
    screenshot: "collectible-detail-view.png",
  });

  // Open the three-dot menu
  await page.getByTestId("CollectibleDetail__header__right-button").click();

  // Wait for menu to be visible
  await expect(page.getByText("Hide collectible")).toBeVisible();

  // Take a screenshot of the menu with hide option
  await expectPageToHaveScreenshot({
    page,
    screenshot: "collectible-detail-hide-menu.png",
  });

  // Click "Hide collectible"
  await page.getByText("Hide collectible").click();

  // Wait for detail sheet to close
  await expect(page.getByTestId("CollectibleDetail")).not.toBeVisible();

  // Open the manage dropdown and go to hidden collectibles
  await page.getByTestId("account-tabs-manage-btn-collectibles").click();
  await expect(page.getByText("Hidden collectibles")).toBeVisible();

  // Take a screenshot of the manage dropdown
  await expectPageToHaveScreenshot({
    page,
    screenshot: "collectibles-manage-dropdown.png",
  });

  // Click on hidden collectibles
  await page.getByTestId("hidden-collectibles-btn").click();

  // Wait for hidden collectibles view to open by checking for the grid or empty state
  await expect(
    page
      .getByTestId("hidden-collectible-1")
      .or(page.getByText("No hidden collectibles")),
  ).toBeVisible();

  // Verify the hidden collectible is shown
  await expect(page.getByTestId("hidden-collectible-1")).toBeVisible();

  // Take a screenshot of the hidden collectibles view
  await expectPageToHaveScreenshot({
    page,
    screenshot: "hidden-collectibles-view.png",
  });

  // Click on the hidden collectible to open detail
  await page.getByTestId("hidden-collectible-1").click();

  // Wait for collectible detail to open
  await expect(page.getByTestId("CollectibleDetail")).toBeVisible();

  // Open the three-dot menu
  await page.getByTestId("CollectibleDetail__header__right-button").click();

  // Verify "Show collectible" option is visible (not "Hide collectible")
  await expect(page.getByText("Show collectible")).toBeVisible();

  // Take a screenshot of the menu with show option
  await expectPageToHaveScreenshot({
    page,
    screenshot: "collectible-detail-show-menu.png",
  });

  // Click "Show collectible"
  await page.getByText("Show collectible").click();

  // Wait for detail sheet to close
  await expect(page.getByTestId("CollectibleDetail")).not.toBeVisible();

  // Verify the empty state is now shown in hidden collectibles
  await expect(page.getByText("No hidden collectibles")).toBeVisible();

  // Take a screenshot of empty hidden collectibles
  await expectPageToHaveScreenshot({
    page,
    screenshot: "hidden-collectibles-empty.png",
  });
});

test("Hidden collectibles view shows empty state when no collectibles are hidden", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);
  await stubCollectibles(page);

  await page.route("**/collectibles**", async (route) => {
    const json = {
      data: {
        collections: [
          {
            collection: {
              address:
                "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
              name: "Stellar Frogs",
              symbol: "SFROG",
              collectibles: [
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "1",
                  token_uri: "https://nftcalendar.io/tokenMetadata/1",
                },
              ],
            },
          },
        ],
      },
    };
    await route.fulfill({ json });
  });

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Main Net").click();

  // Navigate to collectibles tab
  await expect(page.getByTestId("account-view")).toBeVisible();
  await page.getByTestId("account-tab-collectibles").click();

  // Open the manage dropdown
  await page.getByTestId("account-tabs-manage-btn-collectibles").click();

  // Click on hidden collectibles
  await page.getByTestId("hidden-collectibles-btn").click();

  // Verify empty state
  await expect(page.getByText("No hidden collectibles")).toBeVisible();
});

test("Hiding a collectible removes it from the main view", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);
  await stubCollectibles(page);

  await page.route("**/collectibles**", async (route) => {
    const json = {
      data: {
        collections: [
          {
            collection: {
              address:
                "CAS3J7GYLGXMF6TDJBBYYSE3HW6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
              name: "Stellar Frogs",
              symbol: "SFROG",
              collectibles: [
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "1",
                  token_uri: "https://nftcalendar.io/tokenMetadata/1",
                },
                {
                  owner:
                    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
                  token_id: "2",
                  token_uri: "https://nftcalendar.io/tokenMetadata/2",
                },
              ],
            },
          },
        ],
      },
    };
    await route.fulfill({ json });
  });

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Main Net").click();

  // Navigate to collectibles tab
  await expect(page.getByTestId("account-view")).toBeVisible();
  await page.getByTestId("account-tab-collectibles").click();

  // Initially, collection count should be 2
  await expect(page.getByTestId("account-collection-count")).toHaveText("2");

  // Click on first collectible to open detail view
  const collectibleGrid = page.getByTestId("account-collection-grid").first();
  await collectibleGrid.locator("div").first().click();

  // Wait for detail view
  await expect(page.getByTestId("CollectibleDetail")).toBeVisible();

  // Open menu and hide the collectible
  await page.getByTestId("CollectibleDetail__header__right-button").click();
  await page.getByText("Hide collectible").click();

  // Wait for sheet to close
  await expect(page.getByTestId("CollectibleDetail")).not.toBeVisible();

  // Collection count should now be 1
  await expect(page.getByTestId("account-collection-count")).toHaveText("1");
});
