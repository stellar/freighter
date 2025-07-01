import test from "@playwright/test";
import { expect, expectPageToHaveScreenshot } from "../test-fixtures";

export const sendXlmPayment = async ({ page }) => {
  test.setTimeout(180_000);
  await page.getByTestId("nav-link-send").click({ force: true });

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
  await page.getByText("Review Send").click();

  await expect(page.getByText("Confirm Send")).toBeVisible();
  await expect(page.getByText("XDR")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-confirm.png",
  });
  await page.getByTestId("transaction-details-btn-send").click();

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
};
