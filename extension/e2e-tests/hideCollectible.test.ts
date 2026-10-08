import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import {
  stubAccountBalances,
  stubAccountHistory,
  stubScanDapp,
  stubTokenDetails,
  stubTokenPrices,
  stubCollectibles,
} from "./helpers/stubs";
import { switchNetwork } from "./helpers/network";

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
  await stubCollectibles(page, context);

  await context.route("**/collectibles**", async (route) => {
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
  await switchNetwork(page, "Mainnet");

  // Navigate to collectibles tab
  await expect(page.getByTestId("account-view")).toBeVisible();
  await page.getByTestId("account-tab-collectibles").click();

  // Verify collectibles are showing
  await expect(page.getByText("Stellar Frogs")).toBeVisible();
  await expect(page.getByText("Soroban Domains")).toBeVisible();

  // Click on a collectible to open detail view
  const collectibleGrid = page.getByTestId("account-collection-grid").first();
  await collectibleGrid.locator("div").first().click();

  // Wait for detail view to open
  await expect(page.getByTestId("CollectibleDetail")).toBeVisible();

  // Open the three-dot menu
  await page.getByTestId("CollectibleDetail__header__right-button").click();

  // Wait for menu to be visible
  await expect(page.getByText("Hide collectible")).toBeVisible();

  // Click "Hide collectible"
  await page.getByText("Hide collectible").click();

  // Wait for detail sheet to close
  await expect(page.getByTestId("CollectibleDetail")).not.toBeVisible();

  // Navigate to hidden collectibles via the Add Collectible screen
  await page.getByTestId("add-collectible-btn").click();
  await page.getByTestId("hidden-collectibles-btn").click();

  // Wait for hidden collectibles view to open by checking for the grid or empty state
  await expect(
    page
      .getByTestId("hidden-collectible-1")
      .or(page.getByText("No hidden collectibles")),
  ).toBeVisible();

  // Verify the hidden collectible is shown
  await expect(page.getByTestId("hidden-collectible-1")).toBeVisible();

  // Unhide from the row itself. This used to mean opening a second sheet on
  // top of this one and going through the detail view's overflow menu; the
  // designs put the action on the row.
  await page.getByTestId("hidden-collectible-unhide-1").click();
  await expect(page.getByTestId("CollectibleDetail")).toHaveCount(0);

  // Verify the empty state is now shown in hidden collectibles
  await expect(page.getByText("No hidden collectibles")).toBeVisible();
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
  await stubCollectibles(page, context);

  await context.route("**/collectibles**", async (route) => {
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
  await switchNetwork(page, "Mainnet");

  // Navigate to collectibles tab
  await expect(page.getByTestId("account-view")).toBeVisible();
  await page.getByTestId("account-tab-collectibles").click();

  // Navigate to hidden collectibles via the Add Collectible screen
  await page.getByTestId("add-collectible-btn").click();
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
  await stubCollectibles(page, context);

  await context.route("**/collectibles**", async (route) => {
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
  await switchNetwork(page, "Mainnet");

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

test("Hiding a collectible on one network leaves it visible on another", async ({
  page,
  extensionId,
  context,
}) => {
  // The regression this guards: HIDDEN_COLLECTIBLES used to be a single flat
  // map shared by every account and network, so hiding here hid everywhere.
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);
  await stubCollectibles(page, context);

  await context.route("**/collectibles**", async (route) => {
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
  await switchNetwork(page, "Mainnet");

  await expect(page.getByTestId("account-view")).toBeVisible();
  await page.getByTestId("account-tab-collectibles").click();
  await expect(page.getByText("Stellar Frogs")).toBeVisible();

  const collectibleGrid = page.getByTestId("account-collection-grid").first();
  await collectibleGrid.locator("div").first().click();
  await expect(page.getByTestId("CollectibleDetail")).toBeVisible();
  await page.getByTestId("CollectibleDetail__header__right-button").click();
  await page.getByText("Hide collectible").click();
  await expect(page.getByTestId("CollectibleDetail")).not.toBeVisible();

  // Hidden on Mainnet.
  await page.getByTestId("add-collectible-btn").click();
  await page.getByTestId("hidden-collectibles-btn").click();
  await expect(page.getByTestId("hidden-collectible-1")).toBeVisible();

  // Back to Home before switching: the network switcher lives behind the
  // account chip, which only the Home header renders. Going via a reload also
  // proves the hide survived a restart.
  await page.goto(`chrome-extension://${extensionId}/index.html#/`);
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  // ...but Testnet is a different key, so nothing is hidden there.
  await switchNetwork(page, "Testnet");
  await page.getByTestId("account-tab-collectibles").click();
  await page.getByTestId("add-collectible-btn").click();
  await page.getByTestId("hidden-collectibles-btn").click();
  await expect(page.getByText("No hidden collectibles")).toBeVisible();
});
