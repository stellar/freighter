import { Page } from "@playwright/test";
import { loginToTestAccount } from "./helpers/login";
import { goToSettings } from "./helpers/network";
import { test, expect } from "./test-fixtures";

// Regression tests for a side panel that opens with no wallet. "Reset wallet"
// keeps the "Open sidebar by default" preference, so the next toolbar click
// opens the panel with nothing to unlock. A wallet-less popup hands onboarding
// to a Welcome tab and closes itself. The panel used to run that hand-off in a
// loop, because SidebarSigningListener replaces window.close() with "navigate
// home" and home is the route that runs the hand-off. It must now open ONE
// Welcome tab and close for real.
//
// Playwright can't open a real Chrome side panel, but the side panel only
// loads `index.html?mode=sidebar`, so the same page in a tab at the panel's
// width runs the same code: isSidebarMode() reads the URL, and
// SidebarSigningListener replaces window.close() with "navigate home".
//
// The first test runs at two widths, because the old code failed differently
// at each. At the popup's width it took the panel for the popup and looped,
// which guards the real close. At any other width it opened no tab at all and
// showed Welcome in the panel, which guards the sidebar check in
// shouldOpenTab.
//
// The second test starts the panel on a dApp route, where the background's
// SIDEBAR_NAVIGATE would send it for a signing request, and the view it
// lands on re-routes to Welcome the same way. Only the home screen used to
// close the panel for real; the other views called window.close(), which
// inside the panel means "navigate home". So GrantAccess raced its own
// <Navigate to=welcome> against the home route: either the panel stayed on
// Welcome with the dApp's request pending, or the home route opened a second
// Welcome tab before closing.
//
// The last test is the other way to end up with no wallet: pressing "Reset
// wallet" in the panel itself, from its lock screen. The panel opens the
// Welcome tab and closes for real, rather than staying on a lock screen with
// nothing left to unlock.
//
// The loop's tabs don't show up as Playwright pages, so these tests count the
// chrome.tabs.create calls the page makes instead. They count the real
// window.close calls the same way: the page's own close is wrapped before the
// app starts, and SidebarSigningListener keeps that wrapper as the native
// close that closeWindow() calls. After the hand-off the native close may or
// may not close this test tab (Chrome only lets scripts close windows that
// scripts opened), so nothing below touches `page` once the hand-off has
// happened.
const POPUP_WIDTH = 360;
const WIDER_PANEL_WIDTH = 400;
const SIDEBAR_HEIGHT = 600;
const TAB_CREATE_MARKER = "[tabs.create]";
const NATIVE_CLOSE_MARKER = "[window.close]";
// The loop made a call every few milliseconds, so this is far longer than it
// needs to show up.
const LOOP_WATCH_MS = 2000;

// What the page did while handing onboarding off.
interface HandOff {
  createdTabUrls: string[];
  nativeCloseCount: number;
}

// Loads the side panel's page in a tab of the panel's width and records its
// hand-off. What it shows depends on the profile: a fresh one has no wallet,
// the state "Reset wallet" leaves behind. `hashRoute` is where the panel's
// router starts, like a SIDEBAR_NAVIGATE from the background would send it.
const loadSidebarPage = async (
  page: Page,
  extensionId: string,
  { width, hashRoute = "" }: { width: number; hashRoute?: string },
): Promise<HandOff> => {
  // The extension's install handler may open a Welcome tab of its own; that
  // isn't a chrome.tabs.create call from this page, so it isn't counted.
  const handOff: HandOff = { createdTabUrls: [], nativeCloseCount: 0 };
  page.on("console", (message) => {
    const text = message.text();
    if (text.startsWith(TAB_CREATE_MARKER)) {
      handOff.createdTabUrls.push(text.slice(TAB_CREATE_MARKER.length).trim());
    } else if (text === NATIVE_CLOSE_MARKER) {
      handOff.nativeCloseCount += 1;
    }
  });

  await page.addInitScript(
    ({
      tabCreateMarker,
      nativeCloseMarker,
    }: {
      tabCreateMarker: string;
      nativeCloseMarker: string;
    }) => {
      // Log every chrome.tabs.create call the page makes. Only the first one
      // goes through, so a regression can't flood the browser with real tabs.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const chromeApi = (window as any).chrome;
      if (chromeApi?.tabs?.create) {
        const nativeCreate = chromeApi.tabs.create.bind(chromeApi.tabs);
        let callCount = 0;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        chromeApi.tabs.create = (...args: any[]) => {
          console.log(`${tabCreateMarker} ${args[0]?.url}`);
          callCount += 1;
          return callCount === 1 ? nativeCreate(...args) : Promise.resolve();
        };
      }

      // Log every call to the browser's own window.close. This runs before
      // the app does, so SidebarSigningListener captures this wrapper as the
      // "original" close that closeWindow() calls, while window.close() itself
      // is replaced with "navigate home".
      const nativeClose = window.close.bind(window);
      window.close = () => {
        console.log(nativeCloseMarker);
        nativeClose();
      };
    },
    {
      tabCreateMarker: TAB_CREATE_MARKER,
      nativeCloseMarker: NATIVE_CLOSE_MARKER,
    },
  );

  await page.setViewportSize({ width, height: SIDEBAR_HEIGHT });
  await page.goto(
    `chrome-extension://${extensionId}/index.html?mode=sidebar${hashRoute}`,
  );
  return handOff;
};

const expectSingleHandOff = async (handOff: HandOff) => {
  await expect
    .poll(() => handOff.createdTabUrls.length, {
      message: "the panel should hand onboarding to a Welcome tab",
    })
    .toBeGreaterThan(0);
  // The close can follow the tab by a moment (a reset awaits the tab first),
  // so wait for it instead of assuming it lands inside the watch below.
  await expect
    .poll(() => handOff.nativeCloseCount, {
      message: "the panel should close for real after handing off",
    })
    .toBeGreaterThan(0);
  // Give a looping hand-off time to open more tabs. Not page.waitForTimeout:
  // the panel may close itself after handing off to the tab.
  await new Promise((resolve) => setTimeout(resolve, LOOP_WATCH_MS));
  expect(
    handOff.createdTabUrls,
    "the panel should hand off to one tab, not keep opening more",
  ).toHaveLength(1);
  expect(handOff.createdTabUrls[0]).toBe("index.html#/welcome");
  expect(
    handOff.nativeCloseCount,
    "the panel should close for real, once; window.close() only navigates home inside it",
  ).toBe(1);
};

// The route the background posts to the panel for a dApp's requestAccess():
// `/grant-access?` plus encodeObject({ tab, url, uuid }), as built in
// freighterApiMessageListener.ts. encodeObject (helpers/urls) is base64 of the
// JSON's UTF-8 bytes.
const DAPP_URL = "https://dapp.example/";
const DAPP_REQUEST = {
  tab: { id: 7, url: DAPP_URL },
  url: DAPP_URL,
  uuid: "5d6c1f9e-3b1a-4a0e-9d1c-0f7a2b6c8e41",
};
const GRANT_ACCESS_HASH_ROUTE = `#/grant-access?${Buffer.from(
  JSON.stringify(DAPP_REQUEST),
).toString("base64")}`;

for (const width of [POPUP_WIDTH, WIDER_PANEL_WIDTH]) {
  test(`a sidebar with no wallet opens a single Welcome tab at ${width}px`, async ({
    page,
    extensionId,
  }) => {
    const handOff = await loadSidebarPage(page, extensionId, { width });

    await expectSingleHandOff(handOff);
  });
}

test("a dApp request reaching a sidebar with no wallet opens a single Welcome tab and closes the panel", async ({
  page,
  extensionId,
}) => {
  // Not the popup's width, so only the sidebar check in shouldOpenTab can
  // send this to a Welcome tab.
  const handOff = await loadSidebarPage(page, extensionId, {
    width: WIDER_PANEL_WIDTH,
    hashRoute: GRANT_ACCESS_HASH_ROUTE,
  });

  await expectSingleHandOff(handOff);
});

test("Reset wallet in a locked sidebar opens a single Welcome tab and closes the panel", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  // The tab that makes and locks the wallet is then loaded as the panel.
  await loginToTestAccount({ page, extensionId, context });
  await goToSettings(page);
  await page.getByText("Log Out").click();
  await expect(page.getByText("Welcome back")).toBeVisible();

  const handOff = await loadSidebarPage(page, extensionId, {
    width: WIDER_PANEL_WIDTH,
  });
  await page.getByTestId("forgot-password-button").click();
  await expect(page.getByTestId("forgot-password-sheet")).toBeVisible();
  // The last use of `page`: the reset closes the panel.
  await page.getByTestId("forgot-password-sheet-reset").click();

  await expectSingleHandOff(handOff);
});
