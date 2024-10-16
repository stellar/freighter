import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";

test("Load accounts on standalone network", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Add custom network").click();
  await expect(page.getByText("Add Custom Network")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "network-form-page.png",
  });
  await page.getByTestId("NetworkForm__networkName").fill("test standalone");
  await page
    .getByTestId("NetworkForm__networkUrl")
    .fill("https://horizon-testnet.stellar.org");
  await page
    .getByTestId("NetworkForm__sorobanRpcUrl")
    .fill("https://soroban-testnet.stellar.org/");
  await page
    .getByTestId("NetworkForm__networkPassphrase")
    .fill("Test SDF Network ; September 2015");
  await page.getByTestId("NetworkForm__add").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("account-assets")).toContainText("XLM");
});
