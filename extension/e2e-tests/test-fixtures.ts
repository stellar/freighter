import { test as base, chromium, BrowserContext } from "@playwright/test";
import path from "path";

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
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
});

export const expectPageToHaveScreenshot = async (
  { page, screenshot }: { page: any; screenshot: string },
  options?: any,
) => {
  await expect(page).toHaveScreenshot(screenshot, {
    maxDiffPixelRatio: 0.02,
    ...options,
  });
};

export const expect = test.expect;
