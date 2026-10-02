import { test, expect } from "./test-fixtures";

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

test("welcome screen renders in light theme", async ({ page, extensionId }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(`chrome-extension://${extensionId}/index.html#/`);

  await page.locator(".Welcome__column").waitFor();

  // A rendered Welcome element resolves to the light text color — a
  // component-level check, not just the body token the first test covers.
  const headingColor = await page
    .locator(".Welcome__heading")
    .evaluate((el) => getComputedStyle(el).color);
  expect(headingColor).toBe("rgb(23, 23, 23)"); // gray-12 light
});
