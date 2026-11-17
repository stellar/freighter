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
  // Form field id → chrome.storage.local key.
  const toggles: Record<string, string> = {
    isOpenSidebarByDefaultValue: "isOpenSidebarByDefault",
    isHideDustEnabledValue: "isHideDustEnabled",
  };
  const expected: Record<string, string> = {};
  for (const id of Object.keys(toggles)) {
    const input = page.locator(`#${id}`);
    const before = await input.inputValue();
    await page.locator(`label[for="${id}"]`).click();
    await expect(input).not.toHaveValue(before);
    expected[id] = await input.inputValue();
  }

  // Wait for AutoSave's debounced save to land before opening or reloading
  // any extension page: either can drop a save that hasn't run yet.
  const storageKeys = Object.values(toggles);
  await expect
    .poll(() =>
      page.evaluate((keys) => chrome.storage.local.get(keys), storageKeys),
    )
    .toEqual(
      Object.fromEntries(
        Object.entries(toggles).map(([id, key]) => [
          key,
          expected[id] === "true",
        ]),
      ),
    );

  const second = await context.newPage();
  await second.goto(
    `chrome-extension://${extensionId}/index.html#/settings/preferences`,
  );
  for (const id of Object.keys(toggles)) {
    await expect(second.locator(`#${id}`)).toHaveValue(expected[id]);
  }
  await second.close();
});
