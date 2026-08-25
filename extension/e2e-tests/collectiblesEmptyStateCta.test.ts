import type { BrowserContext, Page } from "@playwright/test";

import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { stubAccountBalancesV2 } from "./helpers/stubs";

// The Tokens tab decides which kind of Add button the Collectibles tab uses, so
// these cover the Collectibles side following its lead -- including the one case
// where it cannot. The Tokens side is unchanged from master and is covered in
// addAsset.test.ts.

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
  // v2 is the default balances source and stubAllExternalApis already
  // registered a funded fixture for it, so the v1 override alone leaves the
  // account looking funded. A null fixture serves is_funded: false.
  await stubAccountBalancesV2(page, () => null);
};

// /collectibles is fetched by the background worker, so it needs context.route;
// registering it after stubAllExternalApis wins.
const stubNoCollectibles = async (context: BrowserContext) => {
  await context.route("**/collectibles**", async (route) => {
    await route.fulfill({ json: { data: { collections: [] } } });
  });
};

test("Collectibles empty state carries the CTA while Tokens is showing its own", async ({
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

  // Tokens is untouched: its empty state carries the funding action itself.
  await expect(page.getByText("Looking a little empty...")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("add-token-btn")).toHaveCount(0);

  await page.getByTestId("account-tab-collectibles").click();
  await expect(page.getByText("No collectibles yet")).toBeVisible({
    timeout: 20000,
  });

  // Same style of button as the Tokens tab, so no pill here either.
  const inlineCta = page.getByTestId("add-collectible-inline-btn");
  await expect(inlineCta).toBeVisible();
  await expect(inlineCta).toHaveText("Add collectible");
  await expect(page.getByTestId("add-collectible-btn")).toHaveCount(0);

  await inlineCta.click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toHaveText(
    "Add Collectible",
  );
});

test("Collectibles shows the pill once Tokens does", async ({
  page,
  extensionId,
  context,
}) => {
  // Funded by default, so the Tokens tab is on the pill.
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
  await expect(page.getByText("No collectibles yet")).toBeVisible({
    timeout: 20000,
  });

  await expect(page.getByTestId("add-collectible-btn")).toBeVisible();
  await expect(page.getByTestId("add-collectible-inline-btn")).toHaveCount(0);
});

// An unfunded account can still hold collectibles. That tab then has no empty
// state to host a CTA, so it keeps the pill rather than losing its only way to
// add one -- the Tokens tab meanwhile still carries its own inline action.
test("Collectibles keeps the pill when it has collectibles to show", async ({
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
  await expect(page.getByText("Looking a little empty...")).toBeVisible({
    timeout: 20000,
  });

  await page.getByTestId("account-tab-collectibles").click();
  await expect(page.getByTestId("add-collectible-btn")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("add-collectible-inline-btn")).toHaveCount(0);
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
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Mainnet").click();
  await expect(page.getByTestId("account-view")).toBeVisible();
  await page.getByTestId("account-tab-collectibles").click();

  // A spinner while the request is outstanding -- not the empty state, which
  // would claim the account owns none, and not an action either, since which kind
  // it wants is not known yet.
  await expect(page.getByTestId("account-collectibles-loader")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByText("No collectibles yet")).toHaveCount(0);
  await expect(page.getByTestId("add-collectible-inline-btn")).toHaveCount(0);
  await expect(page.getByTestId("add-collectible-btn")).toHaveCount(0);

  // Once it resolves this tab has collectibles to show, so the pill is the action
  // -- and it only appears at all because their arrival is dispatched.
  await expect(page.getByTestId("add-collectible-btn")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.getByTestId("account-collectibles-loader")).toHaveCount(0);
  await expect(page.getByTestId("add-collectible-inline-btn")).toHaveCount(0);
});
