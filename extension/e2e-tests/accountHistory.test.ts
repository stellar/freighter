import { test, expectPageToHaveScreenshot } from "./test-fixtures";
import { login } from "./helpers/login";

test("View Account History", async ({ page, extensionId }) => {
  test.slow();
  await login({ page, extensionId });

  await page.getByTestId("BottomNav-link-account-history").click();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "account-history.png",
  });
});
