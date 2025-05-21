import { loginToTestAccount } from "./helpers/login";
import { test, expect } from "./test-fixtures";

test("Login shows error state on bad password", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("BottomNav-link-settings").click();
  await page.getByText("Log Out").click();
  await expect(page.getByText("Welcome back!")).toBeVisible();
  await page.locator("#password-input").fill("wrong");
  await page.getByText("Login").click();
  await expect(page.getByText("Incorrect Password")).toBeVisible();
});
