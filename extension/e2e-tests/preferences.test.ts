import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { goToSettings } from "./helpers/network";

test("Preferences shows Display and Security sections and saves toggles", async ({
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
  await expect(page.getByText("Open in sidebar by default")).toBeVisible();

  const link = page.getByTestId("privacyPolicyLink");
  await expect(link).toHaveText("Learn more about data sharing");
  await expect(link).toHaveAttribute(
    "href",
    "https://varialwallet.com/privacy",
  );
  await expect(link).toHaveAttribute("target", "_blank");

  // One toggle from each card, since both cards share one autosaved form.
  const toggleIds = ["isOpenSidebarByDefaultValue", "isHideDustEnabledValue"];
  const expected: Record<string, string> = {};
  for (const id of toggleIds) {
    const input = page.locator(`#${id}`);
    const before = await input.inputValue();
    await page.locator(`label[for="${id}"]`).click();
    await expect(input).not.toHaveValue(before);
    expected[id] = await input.inputValue();
  }

  // Checked from a second page: reloading this one could cancel AutoSave's
  // debounced save before it runs.
  const second = await context.newPage();
  await expect(async () => {
    await second.goto(
      `chrome-extension://${extensionId}/index.html#/settings/preferences`,
    );
    for (const id of toggleIds) {
      await expect(second.locator(`#${id}`)).toHaveValue(expected[id], {
        timeout: 2000,
      });
    }
  }).toPass({ timeout: 15000 });
  await second.close();
});
