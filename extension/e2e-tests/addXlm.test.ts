import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginAndFund } from "./helpers/login";

test("should show add XLM page and open Coinbase", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await loginAndFund({ page, extensionId });

  await page.getByTestId("network-selector-open").click();
  await page.getByText("Main Net").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  const popupPromise = page.context().waitForEvent("page");
  await page.getByText("Add XLM").click();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "add-xlm-page.png",
  });

  await page.getByText("Buy XLM with Coinbase").click();

  const popup = await popupPromise;

  await expect(popup).toHaveURL(
    /https:\/\/pay\.coinbase\.com\/buy\/select-asset/,
  );
});
