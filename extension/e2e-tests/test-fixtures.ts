import { test as base, BrowserContext, Page, Worker } from "@playwright/test";
import { STELLAR_EXPERT_ASSET_LIST_JSON } from "./helpers/stubs";
import { launchExtensionContext } from "./helpers/launch";

export const test = base.extend<{
  context: BrowserContext;
  serviceWorker: Worker;
  extensionId: string;
  page: Page;
  language: string;
  viewportSize: { width: number; height: number } | null;
}>({
  viewportSize: null,
  language: "en",
  context: async ({ viewportSize }, use) => {
    const context = await launchExtensionContext("", viewportSize);
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
  page: async ({ page, language }, use) => {
    const langConfig: Record<string, { lang: string; langs: string[] }> = {
      en: { lang: "en-US", langs: ["en-US", "en"] },
      pt: { lang: "pt-BR", langs: ["pt-BR", "pt"] },
    };
    const config = langConfig[language] || langConfig.en;

    await page.addInitScript(
      ({ lang, langValue, langsValue }) => {
        (window as any).IS_PLAYWRIGHT = "true";
        try {
          // Set i18next language preference
          if (window.localStorage) {
            window.localStorage.setItem("i18nextLng", lang);
          }
          // Override navigator.language for language detection
          Object.defineProperty(navigator, "language", {
            get: () => langValue,
            configurable: true,
          });
          Object.defineProperty(navigator, "languages", {
            get: () => langsValue,
            configurable: true,
          });
        } catch (e) {
          // Ignore security errors for extension pages
        }
      },
      {
        lang: language,
        langValue: config.lang,
        langsValue: config.langs,
      },
    );

    if (process.env.IS_INTEGRATION_MODE !== "true") {
      await page.route("*/**/testnet/asset-list/top50", async (route) => {
        const json = STELLAR_EXPERT_ASSET_LIST_JSON;
        await route.fulfill({ json });
      });
    }
    use(page);
  },
});

test.afterEach(async ({ page, context }) => {
  // Clean up all route handlers to avoid teardown timeout issues
  try {
    await page.unroute("**/*");
    await context.unroute("**/*");
    const pages = context.pages();
    await Promise.all(
      pages.map(async (p) => {
        if (!p.isClosed()) {
          await p.close();
        }
      }),
    );
  } catch (e) {
    // Silently ignore errors during cleanup
  }
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
