import { Page } from "@playwright/test";

/**
 * openTab() in the popup calls chrome.tabs.create, which Playwright can't
 * reliably intercept via context.route (extension-initiated navigations
 * bypass CDP fetch interception). Patch chrome.tabs.create at the popup
 * level to capture the URL without actually opening a tab — keeps the test
 * hermetic and avoids navigating to random external sites.
 *
 * After calling this, the captured URL is available via
 * `page.evaluate(() => (globalThis as any).__capturedTabUrl)`.
 */
export const patchChromeTabsCreate = async (page: Page) => {
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
};

export const getCapturedTabUrl = (page: Page) =>
  page.evaluate(() => (globalThis as any).__capturedTabUrl as string | null);
