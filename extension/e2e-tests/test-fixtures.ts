import { test as base, chromium, BrowserContext, Page } from "@playwright/test";
import path from "path";

import { STELLAR_EXPERT_ASSET_LIST_JSON } from "./helpers/stubs.ts";

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
  page: Page;
}>({
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, "../build");
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--headless=new`,
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });

    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // for manifest v2:
    // let [background] = context.backgroundPages();
    // if (!background) background = await context.waitForEvent("backgroundpage");

    // for manifest v3:
    let [background] = context.serviceWorkers();
    if (!background) background = await context.waitForEvent("serviceworker");

    const extensionId = background.url().split("/")[2];
    await use(extensionId);
  },
  page: async ({ page }, use) => {
    if (!process.env.IS_INTEGRATION_MODE) {
      await page.route("*/**/testnet/asset-list/top50", async (route) => {
        const json = STELLAR_EXPERT_ASSET_LIST_JSON;
        await route.fulfill({ json });
      });
    }
    use(page);
  },
});

export const expectPageToHaveScreenshot = async (
  {
    page,
    screenshot,
    threshold,
  }: { page: any; screenshot: string; threshold?: number },
  options?: any,
) => {
  await expect(page).toHaveScreenshot(screenshot, {
    maxDiffPixelRatio: threshold || 0.02,
    ...options,
  });
};

export const expect = test.expect;
