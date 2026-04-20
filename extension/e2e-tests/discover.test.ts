import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";

const isIntegrationMode = process.env.IS_INTEGRATION_MODE === "true";

test("Open Discover, dismiss welcome modal, and open a trending protocol in a new tab", async ({
  page,
  extensionId,
  context,
}) => {
  // openTab() ultimately calls chrome.tabs.create in the popup, which Playwright
  // can't reliably intercept via context.route (extension-initiated navigations
  // bypass CDP fetch interception). Patch chrome.tabs.create at the popup level
  // to capture the URL without actually opening a tab — fully hermetic for the
  // stubbed run, and avoids opening random external sites in integration mode.
  await page.addInitScript(() => {
    (globalThis as any).__capturedTabUrl = null;
    const c: any = (globalThis as any).chrome;
    if (c?.tabs?.create) {
      c.tabs.create = (createProperties: any, callback?: any) => {
        (globalThis as any).__capturedTabUrl = createProperties?.url;
        const fakeTab = { id: 0, windowId: 0 };
        if (typeof callback === "function") {
          callback(fakeTab);
          return undefined;
        }
        return Promise.resolve(fakeTab);
      };
    }
  });

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
  const capturedUrl = async () =>
    page.evaluate(() => (globalThis as any).__capturedTabUrl as string | null);
  if (isIntegrationMode) {
    await expect
      .poll(capturedUrl, { timeout: 10000 })
      .toMatch(/^https:\/\/[^/\s]+/);
  } else {
    await expect
      .poll(capturedUrl, { timeout: 5000 })
      .toBe("https://aqua.example.test");
  }
});
