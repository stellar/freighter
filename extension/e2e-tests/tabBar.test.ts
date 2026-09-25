import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { goToAddAsset } from "./helpers/assets";
import { expectHomeReady, goToSettings } from "./helpers/network";

const TAB_BAR = "tab-bar";
const HOME_TAB = "nav-link-account";
const HISTORY_TAB = "nav-link-account-history";
const DISCOVER_TAB = "account-header-discover-button";

test("Shows the tab bar on its three roots and nowhere else", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  // The allow-list is exactly Home, History and Discover.
  await expectHomeReady(page);
  await expect(page.getByTestId(TAB_BAR)).toBeVisible();

  await page.getByTestId(HISTORY_TAB).click();
  await expect(page.getByTestId("AccountHistory")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId(TAB_BAR)).toBeVisible();

  await page.getByTestId(DISCOVER_TAB).click();
  // Discover shows a welcome modal on first open, which covers the bar.
  await page.getByTestId("discover-welcome-dismiss").click();
  await expect(page.getByTestId("trending-carousel")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId(TAB_BAR)).toBeVisible();

  // ...and not on a screen that owns a footer. This is the regression the bar
  // is most likely to cause silently: two stacked bars in a 600px popup.
  await page.getByTestId(HOME_TAB).click();
  await goToAddAsset(page);
  await expect(page.getByTestId(TAB_BAR)).toHaveCount(0);

  await page.getByTestId("BackButton").click();
  await goToSettings(page);
  await expect(page.getByTestId(TAB_BAR)).toHaveCount(0);
});

test("Marks only the active tab and leaves no history to walk back through", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  await expectHomeReady(page);

  const activeCount = () => page.locator(".TabBar__tab--active").count();

  // Home is active on "/" only because the link is `end`; without it,
  // react-router prefix-matches "/" against every route and every tab reads
  // as active.
  expect(await activeCount()).toBe(1);
  await expect(page.getByTestId(HOME_TAB)).toHaveClass(/TabBar__tab--active/);

  await page.getByTestId(DISCOVER_TAB).click();
  await page.getByTestId("discover-welcome-dismiss").click();
  await expect(page.getByTestId(DISCOVER_TAB)).toHaveClass(
    /TabBar__tab--active/,
  );
  expect(await activeCount()).toBe(1);

  // Tabs navigate with `replace`, so switching between them must not grow the
  // history stack. With `push`, BackButton -- which calls navigate(-1) with no
  // depth guard -- would walk backwards through tab switches instead of
  // leaving whatever screen the user is on.
  const historyLength = () => page.evaluate(() => window.history.length);
  const before = await historyLength();

  await page.getByTestId(HISTORY_TAB).click();
  await expect(page.getByTestId("AccountHistory")).toBeVisible({
    timeout: 30000,
  });
  await page.getByTestId(HOME_TAB).click();
  await expectHomeReady(page);
  await page.getByTestId(HISTORY_TAB).click();
  await expect(page.getByTestId("AccountHistory")).toBeVisible({
    timeout: 30000,
  });

  expect(await historyLength()).toBe(before);
});
