import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { patchChromeTabsCreate, getCapturedTabUrl } from "./helpers/discover";
import {
  stubDiscoverProtocols,
  stubDiscoverProtocolsError,
} from "./helpers/stubs";

const isIntegrationMode = process.env.IS_INTEGRATION_MODE === "true";

test("Open Discover, dismiss welcome modal, and open a trending protocol in a new tab", async ({
  page,
  extensionId,
  context,
}) => {
  await patchChromeTabsCreate(page);
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });

  // 1. Open Discover from the account header
  await page.getByTestId("account-header-discover-button").click();

  // 2. Welcome modal appears on first open (fresh storage) — dismiss it
  await expect(page.getByTestId("discover-welcome-dismiss")).toBeVisible();
  await page.getByTestId("discover-welcome-dismiss").click();

  // 3. Main Discover view renders with the trending carousel
  await expect(page.getByTestId("trending-carousel")).toBeVisible({
    timeout: isIntegrationMode ? 15000 : 5000,
  });

  // 4. Click the first trending card — opens the details slideup
  const trendingCards = page.getByTestId("trending-card");
  await expect(trendingCards.first()).toBeVisible();
  await trendingCards.first().click();

  // 5. Details slideup becomes visible
  await expect(page.getByTestId("protocol-details-panel")).toBeVisible();

  // 6. Click Open — handler does setTimeout(200) then calls openTab →
  //    chrome.tabs.create (patched), capturing the URL on the popup
  await page.getByTestId("protocol-details-open").click();

  // 7. Assert the captured URL. In stubbed mode we know it's the first trending
  //    protocol in DISCOVER_PROTOCOLS_STUB; in integration mode the real indexer
  //    decides, so we only assert the URL is a well-formed https destination.
  if (isIntegrationMode) {
    await expect
      .poll(() => getCapturedTabUrl(page), { timeout: 10000 })
      .toMatch(/^https:\/\/[^/\s]+/);
  } else {
    await expect
      .poll(() => getCapturedTabUrl(page), { timeout: 5000 })
      .toBe("https://aqua.example.test");
  }
});

test.describe("Discover critical flows (stubbed)", () => {
  test.skip(
    isIntegrationMode,
    "Critical-flows suite covers stubbed behavior; skipped in integration mode",
  );

  test("renders the error state and recovers via retry", async ({
    page,
    extensionId,
    context,
  }) => {
    // Override the default 200 stub BEFORE Discover mounts so the initial
    // fetch fails and DiscoverError renders.
    await loginToTestAccount({ page, extensionId, context });
    await stubDiscoverProtocolsError(page);

    await page.getByTestId("account-header-discover-button").click();

    // Error state is rendered instead of the welcome modal + main view
    await expect(page.getByTestId("discover-error")).toBeVisible();
    await expect(page.getByTestId("trending-carousel")).not.toBeVisible();

    // Restore the default 200 stub before retrying
    await page.unroute("**/protocols");
    await stubDiscoverProtocols(page);

    await page.getByTestId("discover-error-retry").click();

    // Welcome modal appears on the successful first render — dismiss it
    await expect(page.getByTestId("discover-welcome-dismiss")).toBeVisible();
    await page.getByTestId("discover-welcome-dismiss").click();

    await expect(page.getByTestId("trending-carousel")).toBeVisible();
    await expect(page.getByTestId("discover-error")).not.toBeVisible();
  });

  test("adds a protocol to the Recent section after opening it", async ({
    page,
    extensionId,
    context,
  }) => {
    await patchChromeTabsCreate(page);
    await loginToTestAccount({ page, extensionId, context });

    await page.getByTestId("account-header-discover-button").click();
    await page.getByTestId("discover-welcome-dismiss").click();
    await expect(page.getByTestId("trending-carousel")).toBeVisible();

    // Click the Open button inline on the first dApps row (bypasses details)
    const dappsSection = page.getByTestId("discover-section-dapps");
    await dappsSection
      .getByTestId("protocol-row")
      .first()
      .getByTestId("protocol-row-open")
      .click();

    // Recent section should now render with 1 row
    const recentSection = page.getByTestId("discover-section-recent");
    await expect(recentSection).toBeVisible();
    await expect(recentSection.getByTestId("protocol-row")).toHaveCount(1);
  });

  test("clears the Recent list via the ExpandedRecent kebab menu", async ({
    page,
    extensionId,
    context,
  }) => {
    await patchChromeTabsCreate(page);
    await loginToTestAccount({ page, extensionId, context });

    await page.getByTestId("account-header-discover-button").click();
    await page.getByTestId("discover-welcome-dismiss").click();
    await expect(page.getByTestId("trending-carousel")).toBeVisible();

    // Populate two recents via inline Open on the first two dApps rows
    const dappsSection = page.getByTestId("discover-section-dapps");
    const dappsRows = dappsSection.getByTestId("protocol-row");
    await dappsRows.nth(0).getByTestId("protocol-row-open").click();
    const recentSection = page.getByTestId("discover-section-recent");
    await expect(recentSection.getByTestId("protocol-row")).toHaveCount(1);
    await dappsRows.nth(1).getByTestId("protocol-row-open").click();
    await expect(recentSection.getByTestId("protocol-row")).toHaveCount(2);

    // Navigate to ExpandedRecent → open kebab → clear
    await page.getByTestId("discover-section-expand-recent").click();
    await page.getByTestId("expanded-recent-menu").click();
    await page.getByTestId("clear-recents-button").click();

    // Handler clears storage, refreshes recent, and returns to main view
    await expect(page.getByTestId("trending-carousel")).toBeVisible();
    await expect(page.getByTestId("discover-section-recent")).not.toBeVisible();
  });

  test("collapsed dApps section shows 5 rows; expanded shows all 7", async ({
    page,
    extensionId,
    context,
  }) => {
    await loginToTestAccount({ page, extensionId, context });

    await page.getByTestId("account-header-discover-button").click();
    await page.getByTestId("discover-welcome-dismiss").click();
    await expect(page.getByTestId("trending-carousel")).toBeVisible();

    // Collapsed: DiscoverSection caps visible rows at MAX_VISIBLE (5)
    const dappsSection = page.getByTestId("discover-section-dapps");
    await expect(dappsSection.getByTestId("protocol-row")).toHaveCount(5);

    // Expand → all non-blacklisted protocols (3 trending + 4 non-trending = 7)
    await page.getByTestId("discover-section-expand-dapps").click();
    await expect(page.getByTestId("protocol-row")).toHaveCount(7);

    // Clicking a row in the expanded view opens the details slideup
    await page.getByTestId("protocol-row").first().click();
    await expect(page.getByTestId("protocol-details-panel")).toBeVisible();
  });

  test("row-level Open button bypasses the details panel and captures the URL", async ({
    page,
    extensionId,
    context,
  }) => {
    await patchChromeTabsCreate(page);
    await loginToTestAccount({ page, extensionId, context });

    await page.getByTestId("account-header-discover-button").click();
    await page.getByTestId("discover-welcome-dismiss").click();
    await expect(page.getByTestId("trending-carousel")).toBeVisible();

    const dappsSection = page.getByTestId("discover-section-dapps");
    await dappsSection
      .getByTestId("protocol-row")
      .first()
      .getByTestId("protocol-row-open")
      .click();

    // URL was captured and details panel never opened
    await expect
      .poll(() => getCapturedTabUrl(page), { timeout: 5000 })
      .toMatch(/^https:\/\/[^/\s]+/);
    await expect(page.getByTestId("protocol-details-panel")).not.toBeVisible();
  });
});
