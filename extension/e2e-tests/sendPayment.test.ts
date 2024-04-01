import { test, expect } from "./test-fixtures";
import { login, PASSWORD } from "./helpers/login";

test("Send XLM payment", async ({ page, extensionId }) => {
  test.slow();
  await login({ page, extensionId });
  await page.getByTitle("Send Payment").click({ force: true });

  await expect(page.getByText("Send To")).toBeVisible();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send XLM")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send Settings")).toBeVisible();
  await expect(page.getByTestId("SendSettingsTransactionFee")).toHaveText(
    /[0-9]/,
  );
  await page.getByText("Review Send").click({ force: true });

  await expect(page.getByText("Verification")).toBeVisible();
  await page.getByPlaceholder("Enter password").fill(PASSWORD);
  await page.getByText("Submit").click({ force: true });

  await expect(page.getByText("Confirm Send")).toBeVisible();
  await page.getByTestId("transaction-details-btn-send").click({ force: true });

  await expect(page.getByText("Successfully sent")).toBeVisible({
    timeout: 20000,
  });

  await page.getByText("Details").click({ force: true });
  await expect(page.getByText("Sent XLM")).toBeVisible();
  await expect(page.getByTestId("asset-amount")).toContainText("1 XLM");
});
