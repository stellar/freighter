import { test, expect } from "./test-fixtures";
import { loginToTestAccount, switchToMainnet } from "./helpers/login";
import {
  stubAccountBalances,
  stubAccountBalancesV2,
  stubTokenPriceHistory,
  stubTokenStats,
} from "./helpers/stubs";

// XLM-only fixture served on both the v1 and v2 balances endpoints so the
// account view loads on Mainnet (the chart is mainnet-only).
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

test("Token detail renders the price chart, stats, and about card", async ({
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
      // Both endpoints are background service-worker fetches: stub on the
      // BrowserContext, never the Page (page.route silently misses them).
      await stubTokenPriceHistory(context);
      await stubTokenStats(context);
    },
  });
  await switchToMainnet(page);

  await page.getByTestId("account-assets-item").first().click();

  // The chart draws the stubbed series, and the header carries the view's
  // one delta for the selected range — absolute and percent, sign in the
  // text.
  await expect(page.getByTestId("TokenPriceChart__polyline")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("AssetDetail__delta")).toHaveText(
    "+$0.0014 (0.86%)",
  );
  expect(await page.getByTestId("TokenPriceChart__delta").count()).toBe(0);
  await expect(page.getByRole("tab", { name: "1D" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  // Token Stats renders the rows the stub returns.
  await expect(page.getByText("Token Stats")).toBeVisible();
  await expect(page.getByText("Holders")).toBeVisible();
  await expect(page.getByText("9,926,520")).toBeVisible();

  // The About card renders from call-site data.
  await expect(page.getByText("About", { exact: true })).toBeVisible();
  await expect(page.getByText("Native", { exact: true })).toBeVisible();
});

test("Token detail paints a negative range red — delta text and chart", async ({
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
      await stubTokenPriceHistory(context, {
        "1D": {
          change: { absolute: "-0.060200", percent: "-12.12" },
          points: Array.from({ length: 97 }, (_, i) => ({
            t: 1786636800 + i * 900,
            p: (0.26 - i * 0.001).toFixed(6),
          })),
        },
      });
      await stubTokenStats(context);
    },
  });
  await switchToMainnet(page);

  await page.getByTestId("account-assets-item").first().click();

  const delta = page.getByTestId("AssetDetail__delta");
  // The sign stays in the text — colour never carries the meaning alone.
  await expect(delta).toHaveText("-$0.0602 (12.12%)", { timeout: 30000 });
  await expect(page.getByTestId("TokenPriceChart__polyline")).toBeVisible();

  // The real stylesheet, not just the class names: both the delta text and
  // the chart's stroke resolve to the SDS red-09 token — the chart artwork is
  // red too, not the green a rising range draws.
  const colors = await page.evaluate(() => {
    const resolve = (token: string) => {
      const probe = document.createElement("span");
      probe.style.color = `var(${token})`;
      document.body.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return value;
    };
    const red = resolve("--sds-clr-red-09");
    // The grey the neutral/legacy delta draws — the control that proves the
    // red comparison below is not two undefined tokens both inheriting.
    const grey = resolve("--sds-clr-gray-11");
    const deltaEl = document.querySelector(
      '[data-testid="AssetDetail__delta"]',
    ) as HTMLElement;
    const polyline = document.querySelector(
      '[data-testid="TokenPriceChart__polyline"]',
    ) as SVGElement;
    return {
      red,
      grey,
      delta: getComputedStyle(deltaEl).color,
      // The artwork is drawn in `currentColor`, so the resolved stroke is the
      // chart root's colour.
      stroke: getComputedStyle(polyline).stroke,
    };
  });

  expect(colors.red).not.toBe(colors.grey);
  expect(colors.delta).toBe(colors.red);
  expect(colors.stroke).toBe(colors.red);
});

test("Token detail shows the empty state and keeps the timeframe selector", async ({
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
      await stubTokenPriceHistory(context, {
        // No data is 200 with points: [] and change: null — never a 404.
        "1D": { points: [], change: null, lowVolume: null },
      });
      await stubTokenStats(context);
    },
  });
  await switchToMainnet(page);

  await page.getByTestId("account-assets-item").first().click();

  await expect(page.getByText("No price data for this period")).toBeVisible({
    timeout: 30000,
  });
  expect(await page.getByTestId("TokenPriceChart__polyline").count()).toBe(0);

  // No coverage, so no delta — the header row stays, holding its line.
  await expect(page.getByTestId("AssetDetail__delta")).toHaveText("");

  // The selector never hides — a thin asset can have data on other ranges.
  await expect(page.getByRole("tablist")).toBeVisible();
  await expect(page.getByRole("tab", { name: "1Y" })).toBeVisible();
});
