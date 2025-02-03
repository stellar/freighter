import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import {
  login,
  loginAndFund,
  loginToTestAccount,
  PASSWORD,
} from "./helpers/login";
import { TEST_TOKEN_ADDRESS } from "./helpers/test-token";
import { toBeVisible } from "@testing-library/jest-dom/matchers";

test("Swap doesn't throw error when account is unfunded", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await login({ page, extensionId });

  await page.getByTestId("BottomNav-link-swap/amount").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText(
    "Swap XLM",
  );
});
test("Send doesn't throw error when account is unfunded", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await login({ page, extensionId });
  await page.getByTitle("Send Payment").click({ force: true });

  await expect(page.getByText("Send To")).toBeVisible();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText(
    "Send XLM",
  );
});

test("Send XLM payment to G address", async ({ page, extensionId }) => {
  test.slow();
  await loginAndFund({ page, extensionId });
  await page.getByTitle("Send Payment").click({ force: true });

  await expect(page.getByText("Send To")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-to.png",
  });
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send XLM")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-amount.png",
  });
  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send Settings")).toBeVisible();
  await expect(page.getByTestId("SendSettingsTransactionFee")).toHaveText(
    /[0-9]/,
  );
  // 100 XLM is the default, so likely a sign the fee was not set properly from Horizon
  await expect(
    page.getByTestId("SendSettingsTransactionFee"),
  ).not.toContainText("100 XLM");
  await expectPageToHaveScreenshot(
    {
      page,
      screenshot: "send-payment-settings.png",
    },
    {
      mask: [page.locator("[data-testid='SendSettingsTransactionFee']")],
    },
  );
  await page.getByText("Review Send").click({ force: true });

  await expect(page.getByText("Confirm Send")).toBeVisible();
  await expect(page.getByText("XDR")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-confirm.png",
  });
  await page.getByTestId("transaction-details-btn-send").click({ force: true });

  await expect(page.getByText("Successfully sent")).toBeVisible({
    timeout: 60000,
  });
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-sent.png",
  });

  await page.getByText("Details").click({ force: true });
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-details.png",
  });
  await expect(page.getByText("Sent XLM")).toBeVisible();
  await expect(page.getByTestId("asset-amount")).toContainText("1");
});

test("Send XLM payment to C address", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  // send XLM to C address
  await page.getByTitle("Send Payment").click({ force: true });
  await expect(page.getByText("Send To")).toBeVisible();
  await page.getByTestId("send-to-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send XLM")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send Settings")).toBeVisible();
  await expect(page.getByTestId("SendSettingsTransactionFee")).toHaveText(
    /[0-9]/,
  );
  await page.getByText("Review Send").click();

  await expect(page.getByText("Confirm Send")).toBeVisible({
    timeout: 200000,
  });
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-confirm.png",
  });
  await page.getByTestId("transaction-details-btn-send").click();

  await expect(page.getByText("Successfully sent")).toBeVisible({
    timeout: 60000,
  });

  await page.getByText("Details").click({ force: true });

  await expect(page.getByText("Sent XLM")).toBeVisible();
  await expect(page.getByTestId("asset-amount")).toContainText("0.001");

  await page.getByTestId("BackButton").click({ force: true });
  await page.getByTestId("BottomNav-link-account").click({ force: true });
});

test("Send SAC to C address", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  // add USDC asset
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage Assets").click({ force: true });

  await page.getByText("Add an asset").click({ force: true });
  await page
    .getByTestId("search-asset-input")
    .fill("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
  await expect(page.getByText("USDC")).toBeVisible();

  await page.getByTestId("ManageAssetRowButton").click({ force: true });
  await expect(page.getByTestId("NewAssetWarningAddButton")).toBeVisible({
    timeout: 20000,
  });

  await page.getByText("Add asset").dispatchEvent("click");
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 300000,
  });

  // swap to get some USDC
  await page.getByTestId("BottomNav-link-swap/amount").click({ force: true });
  await expect(page.getByText("Swap XLM")).toBeVisible();
  await expect(
    page.getByTestId("AssetSelect").filter({ hasText: "USDC" }),
  ).toBeVisible({
    timeout: 20000,
  });
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await expect(page.getByTestId("SendAmountRateAmount")).toBeVisible({
    timeout: 20000,
  });
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Swap Settings")).toBeVisible();
  await expect(page.getByTestId("SendSettingsTransactionFee")).toHaveText(
    /[0-9]/,
  );
  await page.getByText("Review Swap").click({ force: true });

  await expect(page.getByText("Confirm Swap")).toBeVisible();
  await page.getByTestId("transaction-details-btn-send").click({ force: true });

  await expect(page.getByText("Successfully swapped")).toBeVisible({
    timeout: 40000,
  });
  await page.getByText("Done").click({ force: true });

  // send SAC to C address
  await page.getByTitle("Send Payment").click({ force: true });
  await page.getByTestId("send-to-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await page.getByTestId("send-amount-asset-select").click({ force: true });
  await page.getByTestId("Select-assets-row-USDC").click({ force: true });

  await expect(page.getByText("Send USDC")).toBeVisible();

  await page.getByTestId("SendAmountSetMax").click({ force: true });
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send Settings")).toBeVisible();
  await expect(page.getByText("Review Send")).toBeEnabled();
  await page.getByText("Review Send").click();

  await expect(page.getByText("Confirm Send")).toBeVisible();
  await page.getByTestId("transaction-details-btn-send").click({ force: true });

  await expect(page.getByText("Successfully sent")).toBeVisible({
    timeout: 40000,
  });

  await page.getByText("Details").click({ force: true });

  await expect(page.getByText("Sent USDC")).toBeVisible();

  await page.getByTestId("BackButton").click({ force: true });
  await page.getByTestId("BottomNav-link-account").click({ force: true });

  // remove USDC
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage Assets").click({ force: true });
  await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
  await page.getByText("Remove asset").click({ force: true });

  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
});

test("Send token payment to C address", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  // add E2E token
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage Assets").click({ force: true });
  await expect(page.getByText("Your assets")).toBeVisible();
  await page.getByText("Add an asset").click({ force: true });
  await page.getByText("Add manually").click({ force: true });
  await page.getByTestId("search-token-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByTestId("ManageAssetRowButton").click({ force: true });
  await page.getByTestId("add-asset").dispatchEvent("click");

  // send E2E token to C address
  await page.getByTitle("Send Payment").click({ force: true });
  await page.getByTestId("send-to-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await page.getByTestId("send-amount-asset-select").click({ force: true });
  await page.getByTestId("Select-assets-row-E2E").click({ force: true });

  await expect(page.getByText("Send E2E")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send Settings")).toBeVisible();
  await expect(page.getByText("Review Send")).toBeEnabled();
  await page.getByText("Review Send").click({ force: true });

  await expect(page.getByText("Confirm Send")).toBeVisible();
  await page.getByTestId("transaction-details-btn-send").click({ force: true });

  await expect(page.getByText("Successfully sent")).toBeVisible({
    timeout: 600000,
  });

  await page.getByText("Details").click({ force: true });

  await expect(page.getByText("Sent E2E")).toBeVisible();
  await expect(page.getByTestId("asset-amount")).toContainText("0.001");
});
test.afterAll(async ({ page, extensionId }) => {
  if (
    test.info().status !== test.info().expectedStatus &&
    test.info().title === "Send SAC to C address"
  ) {
    // remove trustline in cleanup if Send SAC to C address test failed
    test.slow();
    await loginToTestAccount({ page, extensionId });

    await page.getByTestId("account-options-dropdown").click();
    await page.getByText("Manage Assets").click({ force: true });

    await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
    await page.getByText("Remove asset").click();
    await expect(page.getByTestId("account-view")).toBeVisible({
      timeout: 30000,
    });
  }
});
