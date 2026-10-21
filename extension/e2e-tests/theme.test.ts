import type { Locator, Page } from "@playwright/test";
import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { goToSettings } from "./helpers/network";

// Light/dark smoke (freighter-private#18): the UI follows the device color
// scheme, including live changes while the popup is open. Asserts both the
// body class the theming hangs on and a resolved token value, so a broken
// stylesheet cascade fails even if the class flips correctly.

const lilac09 = (page: import("@playwright/test").Page) =>
  page.evaluate(() =>
    getComputedStyle(document.body).getPropertyValue("--sds-clr-lilac-09"),
  );

test("follows the system color scheme, including live changes", async ({
  page,
  extensionId,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`chrome-extension://${extensionId}/index.html`);

  await expect(page.locator("body")).toHaveClass(/sds-theme-light/);
  await expect(page.locator("body")).not.toHaveClass(/sds-theme-dark/);
  expect((await lilac09(page)).trim()).toBe("#0050ff");

  // Live change while the page stays open — no reload.
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveClass(/sds-theme-dark/);
  await expect(page.locator("body")).not.toHaveClass(/sds-theme-light/);
  expect((await lilac09(page)).trim()).toBe("#1677ff");

  // And back.
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveClass(/sds-theme-light/);
});

// The color painted behind an element: its own background, or the nearest
// ancestor's that isn't transparent.
const backdrop = (locator: Locator) =>
  locator.evaluate((el) => {
    for (let node: Element | null = el; node; node = node.parentElement) {
      const { backgroundColor } = getComputedStyle(node);
      if (backgroundColor !== "rgba(0, 0, 0, 0)") {
        return backgroundColor;
      }
    }
    return "";
  });

// Varial pages sit on base-00; sheets floating over them stay on gray-01.
const BASE_00 = { light: "rgb(255, 255, 255)", dark: "rgb(0, 0, 0)" };
const GRAY_01 = { light: "rgb(252, 252, 252)", dark: "rgb(22, 22, 22)" };

test("welcome screen follows the color scheme", async ({
  page,
  extensionId,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`chrome-extension://${extensionId}/index.html#/`);

  const welcome = page.locator(".Welcome");
  await welcome.waitFor();

  // A rendered Welcome element resolves to the light text color — a
  // component-level check, not just the body token the first test covers.
  const headingColor = await page
    .getByRole("heading", { name: "Welcome to Varial" })
    .evaluate((el) => getComputedStyle(el).color);
  expect(headingColor).toBe("rgb(23, 23, 23)"); // gray-12 light

  // The page color every view shares, behind the content and in the window
  // margins around it.
  const body = page.locator("body");
  expect(await backdrop(welcome)).toBe(BASE_00.light);
  expect(await backdrop(body)).toBe(BASE_00.light);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(body).toHaveClass(/sds-theme-dark/);
  expect(await backdrop(welcome)).toBe(BASE_00.dark);
  expect(await backdrop(body)).toBe(BASE_00.dark);
});

test("USDT0 sheet stays dark in light theme", async ({
  page,
  extensionId,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await loginToTestAccount({ page, extensionId, context });
  await page.getByTestId("usdt0-launch-banner-open").click();
  await expect(page.getByTestId("usdt0-launch-sheet")).toBeVisible();

  // Its hero art is fixed-dark, so the text over it must resolve dark-theme
  // tokens even though the page is light.
  const colorOf = (el: Element) => getComputedStyle(el).color;
  const darkGray12 = "rgb(237, 237, 237)";
  expect(
    await page
      .locator(".Usdt0LaunchSheet__feature__title")
      .first()
      .evaluate(colorOf),
  ).toBe(darkGray12);
  expect(
    await page.getByTestId("usdt0-launch-sheet-close").evaluate(colorOf),
  ).toBe(darkGray12);
});

// The lock screen and its Forgot password sheet resolve their colors in both
// themes. Expected values are the resolved tokens: gray, red and base from
// SDS's .sds-theme-* blocks, lilac from varialPalette.scss.
const computed = (
  locator: Locator,
  property: "color" | "backgroundColor" | "fill" | "fontWeight",
) => locator.evaluate((el, prop) => getComputedStyle(el)[prop], property);

const lockScreenColors = async (page: Page) => ({
  heading: await computed(
    page.getByRole("heading", { name: "Welcome back" }),
    "color",
  ),
  logo: await computed(
    page.locator(".UnlockAccount__logo path").first(),
    "fill",
  ),
  page: await backdrop(page.getByTestId("unlock-account")),
});

const sheetColors = async (page: Page) => ({
  surface: await backdrop(page.getByTestId("forgot-password-sheet")),
  badgeBackground: await computed(
    page.locator(".InfoSheet__badge--error"),
    "backgroundColor",
  ),
  badgeColor: await computed(page.locator(".InfoSheet__badge--error"), "color"),
  resetBackground: await computed(
    page.getByTestId("forgot-password-sheet-reset"),
    "backgroundColor",
  ),
});

// The reset reminder is semibold in the body's gray, like mobile: the same
// color as the sheet's first paragraph, not InfoSheet__emphasis's brighter one.
const expectReminderStyle = async (page: Page) => {
  const paragraph = page.locator(".ForgotPasswordSheet__body > div").first();
  const reminder = page.locator(".ForgotPasswordSheet__reminder");
  expect({
    color: await computed(reminder, "color"),
    fontWeight: await computed(reminder, "fontWeight"),
  }).toEqual({
    color: await computed(paragraph, "color"),
    fontWeight: "600",
  });
};

test("lock screen and Forgot password sheet follow the color scheme", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await page.emulateMedia({ colorScheme: "light" });
  await loginToTestAccount({ page, extensionId, context });
  expect(await backdrop(page.getByTestId("account-view"))).toBe(BASE_00.light);
  await goToSettings(page);
  await page.getByText("Log Out").click();
  await expect(page.getByText("Welcome back")).toBeVisible();

  await expect(page.locator("body")).toHaveClass(/sds-theme-light/);
  expect(await lockScreenColors(page)).toEqual({
    heading: "rgb(23, 23, 23)", // gray-12 light
    logo: "rgb(0, 80, 255)", // lilac-09 light
    page: BASE_00.light,
  });

  // Only open and close the sheet; nothing here presses Reset wallet.
  await page.getByTestId("forgot-password-button").click();
  await expect(page.getByTestId("forgot-password-sheet")).toBeVisible();
  expect(await sheetColors(page)).toEqual({
    surface: GRAY_01.light,
    badgeBackground: "rgb(255, 239, 239)", // red-03 light
    badgeColor: "rgb(229, 72, 77)", // red-09 light, the icon step like brand's
    resetBackground: "rgb(229, 72, 77)", // red-09, the destructive button
  });
  await expectReminderStyle(page);

  // Live change with the sheet still open — no reload.
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveClass(/sds-theme-dark/);
  expect(await sheetColors(page)).toEqual({
    surface: GRAY_01.dark,
    badgeBackground: "rgb(60, 24, 26)", // red-03 dark
    badgeColor: "rgb(229, 72, 77)", // red-09 dark
    resetBackground: "rgb(229, 72, 77)", // red-09 is the same in both themes
  });
  await expectReminderStyle(page);

  await page.getByTestId("forgot-password-sheet-close").click();
  await expect(page.getByTestId("forgot-password-sheet")).toBeHidden();
  expect(await lockScreenColors(page)).toEqual({
    heading: "rgb(237, 237, 237)", // gray-12 dark
    logo: "rgb(22, 119, 255)", // lilac-09 dark
    page: BASE_00.dark,
  });
});
