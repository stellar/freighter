import type { BrowserContext, Page } from "@playwright/test";
import { test, expect } from "./test-fixtures";
import { loginToTestAccount, PASSWORD } from "./helpers/login";
import { goToSettings } from "./helpers/network";
import { closeEthenaLaunchPromo } from "./helpers/ethenaLaunch";

const lockAndUnlock = async (page: Page) => {
  await goToSettings(page);
  await page.getByText("Log Out").click();
  await expect(page.getByText("Welcome back")).toBeVisible();
  await page.locator("#password-input").fill(PASSWORD);
  await page.getByRole("button", { name: "Unlock" }).click();
};

test("every wallet sees the Ethena launch promo once, on its first unlock to Home", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  // A wallet set up just now, as on a new install. Onboarding ends on Home;
  // the promo waits for an unlock.
  await loginToTestAccount({ page, extensionId, context });
  await expect(page.getByTestId("account-view")).toBeVisible();
  await expect(page.getByTestId("ethena-launch")).toHaveCount(0);

  await lockAndUnlock(page);
  await closeEthenaLaunchPromo(page);
  await expect(page.getByTestId("account-view")).toBeVisible();

  // Once only: the next unlock goes straight Home.
  await lockAndUnlock(page);
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("ethena-launch")).toHaveCount(0);
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
