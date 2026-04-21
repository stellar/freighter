import test, { Page } from "@playwright/test";
import { expect, expectPageToHaveScreenshot } from "../test-fixtures";

export const sendXlmPayment = async ({ page }: { page: Page }) => {
  test.setTimeout(180_000);
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByText("Send")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-to.png",
  });
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send")).toBeVisible();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-amount.png",
  });
  await page.getByTestId(`SendRow-native`).click({ force: true });
  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByText("Review Send").click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible();
  await page.getByTestId(`SubmitAction`).click({ force: true });

  await expect(page.getByText("Sent!")).toBeVisible({
    timeout: 60000,
  });
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-sent.png",
  });
};
