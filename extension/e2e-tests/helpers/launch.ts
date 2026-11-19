import path from "path";
import { BrowserContext, chromium } from "@playwright/test";

/**
 * Launches Chromium with the unpacked extension loaded. An empty
 * `userDataDir` gives a throwaway profile that Playwright deletes on close.
 * `EXTENSION_BUILD_PATH` points at a different build (for example a master
 * build when capturing a storage fixture).
 */
export const launchExtensionContext = async (
  userDataDir: string,
  viewportSize?: { width: number; height: number } | null,
): Promise<BrowserContext> => {
  const pathToExtension =
    process.env.EXTENSION_BUILD_PATH ?? path.join(__dirname, "../../build");
  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    args: [
      `--headless=new`,
      `--disable-extensions-except=${pathToExtension}`,
      `--load-extension=${pathToExtension}`,
    ],
    // Playwright emulates light by default; the UI follows the device
    // scheme since #18 and every screenshot baseline was captured dark.
    // theme.test.ts overrides per page with emulateMedia.
    colorScheme: "dark",
    ...(viewportSize ? { viewport: viewportSize } : {}),
  });

  // Mark every page (including popups opened by the extension) as a
  // Playwright test environment. Some helpers — e.g. the Blockaid mainnet
  // gate in `popup/helpers/blockaid.ts` — rely on this flag to opt back
  // into behavior that's otherwise mainnet-only, so it must apply to
  // popup windows too, not just the main `page` fixture.
  await context.addInitScript(() => {
    (window as unknown as { IS_PLAYWRIGHT?: string }).IS_PLAYWRIGHT = "true";
  });

  return context;
};
