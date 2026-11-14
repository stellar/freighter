import type { BrowserContext, Page } from "@playwright/test";
import { test, expect } from "./test-fixtures";
import { loginToTestAccount, PASSWORD } from "./helpers/login";
import { goToSettings } from "./helpers/network";

const lockAndUnlock = async (page: Page) => {
  await goToSettings(page);
  await page.getByText("Log Out").click();
  await expect(page.getByText("Welcome back")).toBeVisible();
  await page.locator("#password-input").fill(PASSWORD);
  await page.getByRole("button", { name: "Unlock" }).click();
};

test("a wallet set up on this install skips the Ethena launch promo, which Home's banner still opens", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  // Straight Home: only wallets that predate the launch get it by themselves.
  await lockAndUnlock(page);
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("ethena-launch")).toHaveCount(0);

  await page.getByTestId("ethena-launch-banner-open").click();
  await expect(page.getByTestId("ethena-launch")).toBeVisible();
});

test("a wallet that predates the launch sees the Ethena launch promo once, on its next unlock to Home", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  // What installing the launch build over an existing wallet records.
  await page.evaluate(() =>
    chrome.storage.local.set({ ethenaLaunchPromoStatus: "pending" }),
  );

  await lockAndUnlock(page);
  await expect(page.getByTestId("ethena-launch")).toBeVisible({
    timeout: 30000,
  });
  await page.getByTestId("ethena-launch-close").click();
  await expect(page.getByTestId("account-view")).toBeVisible();

  // Once only: the next unlock goes straight Home.
  await lockAndUnlock(page);
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("ethena-launch")).toHaveCount(0);
});

test("Ethena launch promo sits in Home's frame in a wide window, filling it", async ({
  page,
  extensionId,
  context,
}) => {
  // The fixture's window is wide, like fullscreen mode's tab.
  await loginToTestAccount({ page, extensionId, context });
  const frameOf = (selector: string) =>
    page.locator(selector).evaluate((el) => {
      const { x, width, height } = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      return {
        x,
        width,
        height,
        borders: `${style.borderLeft} | ${style.borderRight}`,
      };
    });
  const home = await frameOf(".AccountHeader__hero");
  expect(home.width).toBeLessThan(page.viewportSize()!.width);

  await page.getByTestId("ethena-launch-banner-open").click();
  await expect(page.getByTestId("ethena-launch")).toBeVisible();
  const promo = await frameOf('[data-testid="ethena-launch-frame"]');

  // Same place, width and borders as Home's, all the way down.
  expect({ ...promo, height: undefined }).toEqual({
    ...home,
    height: undefined,
  });
  expect(promo.height).toBe(page.viewportSize()!.height);
  // The content stretches across it: Swap spans the frame less its borders
  // and 24px gutters, as other fullscreen screens' buttons do.
  const swap = await page.getByTestId("ethena-launch-swap-usde").boundingBox();
  expect(swap!.width).toBe(promo.width - 2 - 2 * 24);
});

test("Ethena launch promo's token actions are all the same size", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });
  await page.getByTestId("ethena-launch-banner-open").click();
  await expect(page.getByTestId("ethena-launch")).toBeVisible();

  const size = (testId: string) =>
    page.getByTestId(testId).evaluate((el) => {
      const icon = el.querySelector("svg")?.getBoundingClientRect();
      return {
        height: el.getBoundingClientRect().height,
        icon: icon ? icon.width : null,
      };
    });
  for (const token of ["usde", "susde"]) {
    const swap = await size(`ethena-launch-swap-${token}`);
    const receive = await size(`ethena-launch-receive-${token}`);
    const transfer = await size(`ethena-launch-transfer-${token}`);
    // SDS's lg Button, which Swap and Receive are.
    expect(swap.height).toBe(40);
    expect(receive.height).toBe(swap.height);
    expect(transfer).toEqual(swap);
  }
});

test("Ethena launch promo's scroll cue scrolls the tokens into view", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });
  await page.getByTestId("ethena-launch-banner-open").click();
  const bar = page.getByTestId("ethena-launch-header");
  const cue = page.getByRole("button", { name: "Scroll to discover tokens" });
  await expect(cue).toBeVisible();

  await cue.click();

  // It stops with the cue 60px below the close button's bar, the tokens
  // under it.
  const gap = async () => {
    const [barBox, cueBox] = await Promise.all([
      bar.boundingBox(),
      cue.boundingBox(),
    ]);
    return Math.round(cueBox!.y - (barBox!.y + barBox!.height));
  };
  await expect.poll(gap).toBe(60);
  await expect(page.getByTestId("ethena-launch-swap-usde")).toBeInViewport();
});

test("Ethena launch promo comes back from Receive as it was left", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });
  await page.getByTestId("ethena-launch-banner-open").click();
  const promo = page.getByTestId("ethena-launch");
  await expect(promo).toBeVisible();
  await promo.evaluate((el) => el.scrollTo(0, 400));
  const left = await promo.evaluate((el) => el.scrollTop);
  expect(left).toBeGreaterThan(0);

  await page.getByTestId("ethena-launch-receive-usde").click();
  await expect(page.getByTestId("view-public-key-account-name")).toBeVisible();
  await page.getByTestId("BackButton").click();

  // Where it was, with nothing replaying.
  await expect(promo).toBeVisible();
  expect(await promo.evaluate((el) => el.scrollTop)).toBe(left);
  expect(
    await promo.evaluate((el) => el.getAnimations({ subtree: true }).length),
  ).toBe(0);
});

test("Ethena launch promo keeps its close button on a bar as the page scrolls", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });
  await page.getByTestId("ethena-launch-banner-open").click();
  const promo = page.getByTestId("ethena-launch");
  const close = page.getByTestId("ethena-launch-close");
  await expect(promo).toBeVisible();
  const atTop = await close.boundingBox();
  const barOpacity = () =>
    page
      .getByTestId("ethena-launch-header")
      .evaluate((el) => getComputedStyle(el, "::before").opacity);
  expect(await barOpacity()).toBe("0");

  // Down to the tokens: the X stays put, now on the bar, which the tokens
  // fade out under.
  await promo.evaluate((el) => el.scrollTo(0, el.scrollHeight));
  await expect(page.getByTestId("ethena-launch-learn-more")).toBeInViewport();
  expect(await close.boundingBox()).toEqual(atTop);
  await expect.poll(barOpacity).toBe("1");

  // Back at the top, the bar clears so the hero shows as designed.
  await promo.evaluate((el) => el.scrollTo(0, 0));
  await expect.poll(barOpacity).toBe("0");
});

// How much of a screenshot is drawn in Chrome's focus ring blue for a dark
// color scheme (#99c8ff), which the banner pins in both themes. Decoded on a
// blank page, outside the extension's CSP.
const focusRingPixels = async (context: BrowserContext, png: Buffer) => {
  const blank = await context.newPage();
  const result = await blank.evaluate(async (base64) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = new OffscreenCanvas(image.width, image.height);
    const context2d = canvas.getContext("2d")!;
    context2d.drawImage(image, 0, 0);
    const { data } = context2d.getImageData(0, 0, image.width, image.height);
    let pixels = 0;
    for (let i = 0; i < data.length; i += 4) {
      const distance =
        Math.abs(data[i] - 0x99) +
        Math.abs(data[i + 1] - 0xc8) +
        Math.abs(data[i + 2] - 0xff);
      if (distance < 48) {
        pixels += 1;
      }
    }
    return { pixels, perimeter: 2 * (image.width + image.height) };
  }, png.toString("base64"));
  await blank.close();
  return result;
};

for (const colorScheme of ["dark", "light"] as const) {
  test(`Ethena launch banner shows keyboard focus on its main button in ${colorScheme} mode`, async ({
    page,
    extensionId,
    context,
  }) => {
    await page.emulateMedia({ colorScheme });
    await loginToTestAccount({ page, extensionId, context });
    const banner = page.getByTestId("ethena-launch-banner");
    await expect(banner).toBeVisible();
    // Off the banner, so the shot isn't of its hover state.
    await page.mouse.move(0, 0);

    // Back from the dismiss button, as a keyboard user reaches it.
    await page.getByTestId("ethena-launch-banner-dismiss").focus();
    await page.keyboard.press("Shift+Tab");
    await expect(page.getByTestId("ethena-launch-banner-open")).toBeFocused();

    // The button fills the card, which clips anything drawn outside it, and
    // dark mode's outline covers the card's edge. The ring only shows all the
    // way round if it's drawn inside both.
    const { pixels, perimeter } = await focusRingPixels(
      context,
      await banner.screenshot(),
    );
    expect(pixels).toBeGreaterThan(perimeter);
  });
}
