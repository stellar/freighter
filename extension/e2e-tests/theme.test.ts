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

const computed = (
  locator: Locator,
  property:
    | "color"
    | "backgroundColor"
    | "borderTopWidth"
    | "fill"
    | "fontWeight",
) => locator.evaluate((el, prop) => getComputedStyle(el)[prop], property);

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

// The Ethena launch is one design in both themes. These compare whole renders
// across a live theme change rather than spot-checking a few colors, so any
// property that follows the theme fails the test, named.

// Waits out entrance animations and transitions, so a render is of the
// settled UI rather than a frame of its motion.
const settle = (locator: Locator) =>
  locator.evaluate(async (root) => {
    await Promise.all(
      root.getAnimations({ subtree: true }).map(({ finished }) => finished),
    );
  });

// Every computed property of every element under the locator, in document
// order. Custom properties are left out: they're the theme's inputs, and one
// changes what's drawn only through the properties that use it, which are
// compared themselves.
const renderedStyles = (locator: Locator) =>
  locator.evaluate((root) =>
    [root, ...Array.from(root.querySelectorAll("*"))].map((el) => {
      const style = getComputedStyle(el);
      const properties: Record<string, string> = {};
      for (let i = 0; i < style.length; i += 1) {
        const name = style.item(i);
        if (!name.startsWith("--")) {
          properties[name] = style.getPropertyValue(name);
        }
      }
      return {
        element: `${el.tagName.toLowerCase()}.${el.getAttribute("class") ?? ""}`,
        properties,
      };
    }),
  );

type RenderedStyles = Awaited<ReturnType<typeof renderedStyles>>;

// What changed between two renders of the same elements, one line per
// property, so a failure says exactly what the theme flipped.
const styleChanges = (before: RenderedStyles, after: RenderedStyles) => [
  ...(after.length === before.length
    ? []
    : [`${before.length} elements → ${after.length}`]),
  ...before.flatMap(({ element, properties }, index) =>
    Object.entries(properties)
      .filter(([name, value]) => after[index]?.properties[name] !== value)
      .map(
        ([name, value]) =>
          `${element} ${name}: ${value} → ${after[index]?.properties[name]}`,
      ),
  ),
];

test("Ethena launch banner looks the same in both themes", async ({
  page,
  extensionId,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await loginToTestAccount({ page, extensionId, context });
  const banner = page.getByTestId("ethena-launch-banner");
  await expect(banner).toBeVisible();
  // Off the banner, so neither render is of its hover state.
  await page.mouse.move(0, 0);
  await settle(banner);
  const light = await renderedStyles(banner);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveClass(/sds-theme-dark/);
  await settle(banner);
  expect(styleChanges(light, await renderedStyles(banner))).toEqual([]);

  // And it's Figma's banner (4414:42195): the near-black card with no
  // outline, white title, light-gray subtitle and gray X.
  expect({
    card: await computed(banner, "backgroundColor"),
    outline: await computed(banner, "borderTopWidth"),
    title: await computed(banner.getByText("Meet Ethena on Stellar"), "color"),
    subtitle: await computed(
      banner.getByText("USDe and sUSDe are now available."),
      "color",
    ),
    dismiss: await computed(
      page.getByTestId("ethena-launch-banner-dismiss"),
      "color",
    ),
  }).toEqual({
    card: "rgb(7, 9, 8)",
    outline: "0px",
    title: "rgb(255, 255, 255)",
    subtitle: "rgb(199, 199, 199)",
    dismiss: "rgb(133, 133, 133)",
  });
});

test("Ethena launch promo looks the same in both themes", async ({
  page,
  extensionId,
  context,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  await loginToTestAccount({ page, extensionId, context });
  await page.getByTestId("ethena-launch-banner-open").click();
  const promo = page.getByTestId("ethena-launch");
  await expect(promo).toBeVisible();
  await settle(promo);

  // Its hero art is drawn for a black page, so the page and the text over it
  // must resolve dark-theme tokens even though the app is light.
  const darkGray12 = "rgb(237, 237, 237)";
  expect(await backdrop(promo)).toBe(BASE_00.dark);
  expect(
    await computed(
      page.getByRole("heading", { name: "Meet Ethena on Stellar" }),
      "color",
    ),
  ).toBe(darkGray12);
  expect(await computed(page.getByTestId("ethena-launch-close"), "color")).toBe(
    darkGray12,
  );
  // It fills the window, so none of the themed page shows around it.
  expect(await promo.boundingBox()).toEqual({
    x: 0,
    y: 0,
    ...page.viewportSize(),
  });
  const light = await renderedStyles(promo);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveClass(/sds-theme-dark/);
  await settle(promo);
  expect(styleChanges(light, await renderedStyles(promo))).toEqual([]);
});

// The lock screen and its Forgot password sheet resolve their colors in both
// themes. Expected values are the resolved tokens: gray, red and base from
// SDS's .sds-theme-* blocks, lilac from varialPalette.scss.
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

// The Varial header: a bare X in gray-09 and the title in gray-12, no badge.
const sheetColors = async (page: Page) => ({
  surface: await backdrop(page.getByTestId("forgot-password-sheet")),
  closeColor: await computed(
    page.getByTestId("forgot-password-sheet-close"),
    "color",
  ),
  titleColor: await computed(
    page.getByRole("heading", { name: "Forgot your password?" }),
    "color",
  ),
  resetBackground: await computed(
    page.getByTestId("forgot-password-sheet-reset"),
    "backgroundColor",
  ),
});

// The reset reminder is semibold in the body's color, like mobile: the same
// color as the sheet's first paragraph.
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
    closeColor: "rgb(143, 143, 143)", // gray-09 light
    titleColor: "rgb(23, 23, 23)", // gray-12 light
    resetBackground: "rgb(229, 72, 77)", // red-09, the destructive button
  });
  await expectReminderStyle(page);

  // Live change with the sheet still open — no reload.
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveClass(/sds-theme-dark/);
  expect(await sheetColors(page)).toEqual({
    surface: GRAY_01.dark,
    closeColor: "rgb(112, 112, 112)", // gray-09 dark
    titleColor: "rgb(237, 237, 237)", // gray-12 dark
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
