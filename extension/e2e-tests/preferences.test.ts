import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { goToSettings } from "./helpers/network";

test("Preferences shows Display and Security sections and saves a toggle", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  await goToSettings(page);
  await page.getByRole("link", { name: "Preferences" }).click();

  await expect(page.getByText("Display", { exact: true })).toBeVisible();
  await expect(page.getByText("Security", { exact: true })).toBeVisible();
  await expect(page.locator("#isOpenSidebarByDefaultValue")).toHaveCount(0);

  const link = page.getByTestId("privacyPolicyLink");
  await expect(link).toHaveText("Learn more about data sharing");
  await expect(link).toHaveAttribute(
    "href",
    "https://varialwallet.com/privacy",
  );
  await expect(link).toHaveAttribute("target", "_blank");

  const hideDust = page.locator("#isHideDustEnabledValue");
  const before = await hideDust.inputValue();
  await page.locator('label[for="isHideDustEnabledValue"]').click();
  await expect(hideDust).not.toHaveValue(before);
  const after = await hideDust.inputValue();

  // Checked from a second page: reloading this one could cancel AutoSave's
  // debounced save before it runs.
  const second = await context.newPage();
  await expect(async () => {
    await second.goto(
      `chrome-extension://${extensionId}/index.html#/settings/preferences`,
    );
    await expect(second.locator("#isHideDustEnabledValue")).toHaveValue(after, {
      timeout: 2000,
    });
  }).toPass({ timeout: 15000 });
  await second.close();
});
