import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginAndFund, loginToTestAccount } from "./helpers/login";

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

  await expect(popup).toHaveURL(/https:\/\/pay\.coinbase\.com\//);
  await expect(popup).toHaveURL(/defaultAsset=XLM/);
});

test("should show Buy with Coinbase and open Coinbase", async ({
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
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Add Funds").click();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "buy-with-coinbase.png",
  });

  await page.getByText("Buy with Coinbase").click();

  const popup = await popupPromise;

  await expect(popup).toHaveURL(/https:\/\/pay\.coinbase\.com\//);
  await expect(popup).not.toHaveURL(/defaultAsset=XLM/);
});

test("should show Buy button on XLM Asset Detail", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("network-selector-open").click();
  await page.getByText("Main Net").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await page.getByTestId("AccountHeader__icon-btn").click();
  await page.getByText("Account 2").click();
  const popupPromise = page.context().waitForEvent("page");
  await page.getByTestId("AccountAssets__asset--loading-XLM").click();
  await page.getByText("BUY").click();

  const popup = await popupPromise;

  await expect(popup).toHaveURL(/https:\/\/pay\.coinbase\.com\//);
  await expect(popup).toHaveURL(/defaultAsset=XLM/);
});
