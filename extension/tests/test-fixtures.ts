import { test as base, chromium, BrowserContext } from "@playwright/test";
import path from "path";

export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}

export const test = base.extend<{
  context: BrowserContext;
  extensionId: string;
}>({
  context: async ({}, use) => {
    const pathToExtension = path.join(__dirname, "../build");
    console.log(pathToExtension);
    const context = await chromium.launchPersistentContext("", {
      headless: false,
      args: [
        `--disable-extensions-except=${pathToExtension}`,
        `--load-extension=${pathToExtension}`,
      ],
    });
    await use(context);
    await context.close();
  },
  extensionId: async ({ context }, use) => {
    // for manifest v2:
    let [background] = context.backgroundPages();
    if (!background) background = await context.waitForEvent("backgroundpage");

    // for manifest v3:
    // let [background] = context.serviceWorkers();
    // if (!background)
    //   background = await context.waitForEvent('serviceworker');

    const extensionId = background.url().split("/")[2];
    await use(extensionId);
  },
});
export const expect = test.expect;
