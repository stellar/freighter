import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import {
  stubAccountBalances,
  stubAccountHistory,
  stubScanDapp,
  stubTokenDetails,
  stubTokenPrices,
} from "./helpers/stubs";

test("Load accounts on standalone network", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Network").click();
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
  await page.getByTestId("BackButton").click();
  await page.getByTestId("BackButton").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("account-assets")).toContainText("XLM");
});

test("Switches account and fetches correct balances", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await expect(page.getByTestId("account-assets")).toContainText("XLM");
  const account1XlmBalance = await page
    .getByTestId("asset-amount")
    .textContent();

  await page.getByTestId("account-view-account-name").click();
  await page.getByText("Account 2").click();

  const account2XlmBalance = await page
    .getByTestId("asset-amount")
    .textContent();

  await expect(account1XlmBalance).not.toEqual(account2XlmBalance);
});

test("Switches account without password prompt", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await expect(page.getByTestId("account-assets")).toContainText("XLM");
  await page.getByTestId("account-view-account-name").click();
  await page.getByText("Account 2").click();

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage assets").click({ force: true });

  await expect(page.getByText("Your assets")).toBeVisible();
});

test("Can't change settings on a stale window", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(context);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  test.slow();

  const pageOne = await page.context().newPage();
  await loginToTestAccount({ page: pageOne, extensionId });

  // open a second tab and change the account
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();
  await stubTokenDetails(context);
  await stubAccountBalances(pageTwo);
  await stubAccountHistory(pageTwo);
  await stubTokenPrices(pageTwo);
  await stubScanDapp(context);

  await pageTwo.goto(`chrome-extension://${extensionId}/index.html`);
  await expect(pageTwo.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await pageTwo.getByTestId("account-view-account-name").click();
  await pageTwo.getByText("Account 2").click();
  await expect(pageTwo.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  await expect(pageTwo.getByTestId("account-options-dropdown")).toBeVisible({
    timeout: 30000,
  });
  // go back to the first tab (still on the old account) and try to change a setting
  await pageOne.getByTestId("account-options-dropdown").click();
  await pageOne.getByText("Settings").click();
  await pageOne.getByText("Preferences").click();
  await expect(pageOne.locator("#isValidatingMemoValue")).toHaveValue("true");
  await pageOne.getByTestId("isValidatingMemoValue").click();
  await expect(pageOne.getByTestId("account-mismatch")).toBeVisible();

  // go back to the second tab and confirm the setting didn't change
  await pageTwo.getByTestId("account-options-dropdown").click();
  await pageTwo.getByText("Settings").click();
  await pageTwo.getByText("Preferences").click();
  await expect(pageTwo.locator("#isValidatingMemoValue")).toHaveValue("true");
});
