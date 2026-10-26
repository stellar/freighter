import type { BrowserContext, Page } from "@playwright/test";

import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { stubAccountBalancesV2 } from "./helpers/stubs";
import { switchNetwork } from "./helpers/network";

// The Collectibles tab offers one Add action at a time: the button inside its
// empty state, or the inline Add collectible button that ends a grid with
// content. Unlike Add token it does not depend on the account being funded.
// The Tokens side is covered in addAsset.test.ts.

const stubUnfundedBalances = async (page: Page) => {
  await page.route("**/account-balances/**", async (route) => {
    await route.fulfill({
      json: {
        balances: {},
        isFunded: false,
        subentryCount: 0,
        error: { horizon: null, soroban: null },
      },
    });
  });
  // stubAllExternalApis registered a funded v2 fixture, and remote config can
  // switch balances to v2, so override v2 too. A null fixture serves
  // is_funded: false.
  await stubAccountBalancesV2(page, () => null);
};

// /collectibles is fetched by the background worker, so it needs context.route;
// registering it after stubAllExternalApis wins.
const stubNoCollectibles = async (context: BrowserContext) => {
  await context.route("**/collectibles**", async (route) => {
    await route.fulfill({ json: { data: { collections: [] } } });
  });
};

test("Collectibles empty state carries the Add action on an unfunded account", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await stubUnfundedBalances(page);
      await stubNoCollectibles(context);
    },
  });
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  // Tokens' empty state carries the funding action itself, and no Add token.
  await expect(page.getByText("Activate your wallet")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("add-token-btn")).toHaveCount(0);

  await page.getByTestId("account-tab-collectibles").click();
  await expect(page.getByText("Collect your first NFT")).toBeVisible({
    timeout: 20000,
  });

  // The empty state's own button, and no inline one: there is no grid to end.
  const inlineCta = page.getByTestId("add-collectible-empty-btn");
  await expect(inlineCta).toBeVisible();
  await expect(inlineCta).toHaveText("Add Collectible");
  await expect(page.getByTestId("add-collectible-btn")).toHaveCount(0);

  await inlineCta.click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toHaveText(
    "Add Collectible",
  );
});

test("Collectibles empty state carries the Add action on a funded account too", async ({
  page,
  extensionId,
  context,
}) => {
  // Funded by default, so the token list ends with Add token.
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await stubNoCollectibles(context);
    },
  });
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("add-token-btn")).toBeVisible({
    timeout: 20000,
  });

  await page.getByTestId("account-tab-collectibles").click();
  await expect(page.getByText("Collect your first NFT")).toBeVisible({
    timeout: 20000,
  });

  await expect(page.getByTestId("add-collectible-empty-btn")).toBeVisible();
  await expect(page.getByTestId("add-collectible-btn")).toHaveCount(0);
});

// An unfunded account can still hold collectibles. That tab then has no empty
// state, so its grid ends with the inline Add collectible button -- the Tokens
// tab meanwhile still carries its own funding action.
test("Collectibles ends its grid with Add collectible when it has collectibles to show", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await stubUnfundedBalances(page);
    },
  });
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText("Activate your wallet")).toBeVisible({
    timeout: 20000,
  });

  await page.getByTestId("account-tab-collectibles").click();
  await expect(page.getByTestId("add-collectible-btn")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("add-collectible-empty-btn")).toHaveCount(0);
});

// The collectibles request resolves after balances, and until it does an empty
// list is indistinguishable from an account that owns none. So the tab spins
// rather than claiming the latter and then popping the real content in. This
// holds the response open so that window is wide enough to assert in.
test("Collectibles shows a spinner until the request resolves", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await stubUnfundedBalances(page);
      await context.route("**/collectibles**", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 4000));
        await route.fulfill({
          json: {
            data: {
              collections: [
                {
                  collection: {
                    address:
                      "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
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
          },
        });
      });
    },
  });

  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  // Mainnet: the later scanned-balances dispatch is what used to reveal the
  // collectibles, and with it the swap this guards against.
  await switchNetwork(page, "Mainnet");
  await expect(page.getByTestId("account-view")).toBeVisible();
  await page.getByTestId("account-tab-collectibles").click();

  // A spinner while the request is outstanding -- not the empty state, which
  // would claim the account owns none, and not an action either, since which kind
  // it wants is not known yet.
  await expect(page.getByTestId("account-collectibles-loader")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText("Collect your first NFT")).toHaveCount(0);
  await expect(page.getByTestId("add-collectible-empty-btn")).toHaveCount(0);
  await expect(page.getByTestId("add-collectible-btn")).toHaveCount(0);

  // Once it resolves this tab has collectibles to show, so the grid's inline
  // button is the action -- and it only appears at all because their arrival
  // is dispatched.
  await expect(page.getByTestId("add-collectible-btn")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("account-collectibles-loader")).toHaveCount(0);
  await expect(page.getByTestId("add-collectible-empty-btn")).toHaveCount(0);
});
