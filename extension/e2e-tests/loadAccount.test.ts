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
test("Switches account without password prompt", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });
  await expect(page.getByTestId("account-assets")).toContainText("XLM");
  await page.getByTestId("AccountHeader__icon-btn").click();
  await page.getByText("Account 2").click();

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage Assets").click({ force: true });

  await expect(page.getByText("Your assets")).toBeVisible();
});

test("Can't change settings on a stale window", async ({
  page,
  extensionId,
}) => {
  test.slow();

  const pageOne = await page.context().newPage();
  await loginToTestAccount({ page: pageOne, extensionId });

  // open a second tab and change the account
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  await pageTwo.goto(`chrome-extension://${extensionId}/index.html`);
  await expect(pageTwo.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await pageTwo.getByTestId("AccountHeader__icon-btn").click();
  await pageTwo.getByText("Account 2").click();
  await expect(pageTwo.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  // go back to the first tab (still on the old account) and try to change a setting
  await pageOne.getByTestId("BottomNav-link-settings").click();
  await pageOne.getByText("Preferences").click();
  await expect(pageOne.locator("#isValidatingMemoValue")).toHaveValue("true");
  await pageOne.getByText("Validate addresses that require a memo").click();
  await expect(pageOne.getByTestId("account-mismatch")).toBeVisible();

  // go back to the second tab and confirm the setting didn't change
  await pageTwo.getByTestId("BottomNav-link-settings").click();
  await pageTwo.getByText("Preferences").click();
  await expect(pageTwo.locator("#isValidatingMemoValue")).toHaveValue("true");
});
