import { loginToTestAccount } from "./helpers/login";
import { test, expect } from "./test-fixtures";
import { goToSettings } from "./helpers/network";

test("Login shows error state on bad password", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  await goToSettings(page);
  await page.getByText("Log Out").click();
  await expect(page.getByText("Welcome back")).toBeVisible();
  await page.locator("#password-input").fill("wrong");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByText("Incorrect Password")).toBeVisible();
});

test("Password input is auto focused on unlock screen", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  await goToSettings(page);
  await page.getByText("Log Out").click();
  await expect(page.getByText("Welcome back")).toBeVisible();
  await expect(page.locator("#password-input")).toBeFocused();
});
