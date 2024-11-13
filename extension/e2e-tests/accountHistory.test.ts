import { test, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginAndFund } from "./helpers/login";

test("View Account History", async ({ page, extensionId }) => {
  test.slow();
  await loginAndFund({ page, extensionId });

  await page.getByTestId("BottomNav-link-account-history").click();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "account-history.png",
  });
});
