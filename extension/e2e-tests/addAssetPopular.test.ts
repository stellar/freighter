import { test, expect } from "./test-fixtures";
import { loginToTestAccount, switchToMainnet } from "./helpers/login";
import {
  ASSET_SEARCH_ROUTE,
  TRENDING_ASSETS_ROUTE,
  assetSearchResponse,
  stubAccountBalances,
  stubAccountBalancesV2,
} from "./helpers/stubs";
import { goToAddAsset } from "./helpers/assets";

const AQUA_ASSET =
  "AQUA-GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";

// XLM-only fixture so the account view loads on Mainnet.
const XLM_BALANCES = {
  balances: {
    native: {
      token: {
        type: "native",
        code: "XLM",
      },
      total: "100.0000000",
      available: "100.0000000",
      sellingLiabilities: "0",
      buyingLiabilities: "0",
      minimumBalance: "1",
      blockaidData: {
        result_type: "Benign",
        malicious_score: "0.0",
        attack_types: {},
        chain: "stellar",
        address: "",
        metadata: {
          type: "",
        },
        fees: {},
        features: [],
        trading_limits: {},
        financial_stats: {},
      },
    },
  },
  isFunded: true,
  subentryCount: 0,
  error: {
    horizon: null,
    soroban: null,
  },
};

test("Add asset lists Popular tokens before typing and hides them on search", async ({
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
      await stubAccountBalances(page);
      await stubAccountBalancesV2(page, XLM_BALANCES);
      // Service-worker fetches: context routes only. Search is empty so the
      // header's disappearance on typing is the only thing under test.
      await context.route(TRENDING_ASSETS_ROUTE, (route) =>
        route.fulfill(
          assetSearchResponse([
            {
              asset: AQUA_ASSET,
              volume7d: 1_000_000_000_000,
              domain: "aquarius.world",
            },
          ]),
        ),
      );
      await context.unroute(ASSET_SEARCH_ROUTE);
      await context.route(ASSET_SEARCH_ROUTE, (route) =>
        route.fulfill(assetSearchResponse([])),
      );
    },
  });
  await switchToMainnet(page);
  await goToAddAsset(page);

  await expect(page.getByTestId("search-asset-popular")).toHaveText(
    "Popular tokens",
    { timeout: 20000 },
  );
  await expect(page.getByTestId("ManageAssetRow-AQUA-body")).toBeVisible();

  await page.getByTestId("search-asset-input").fill("ZZZ");
  await expect(page.getByTestId("search-asset-popular")).toHaveCount(0);
});
