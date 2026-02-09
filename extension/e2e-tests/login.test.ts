import { loginToTestAccount } from "./helpers/login";
import { test, expect } from "./test-fixtures";

test("Login shows error state on bad password", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Log Out").click();
  await expect(page.getByText("Welcome back")).toBeVisible();
  await page.locator("#password-input").fill("wrong");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByText("Incorrect Password")).toBeVisible();
});
