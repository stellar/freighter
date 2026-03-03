import { Page } from "@playwright/test";
import { expect } from "../test-fixtures";
import { stubReportTransactionWarning } from "./stubs";

export const testBlockaidFeedback = async ({ page }: { page: Page }) => {
  await stubReportTransactionWarning(page);
  const responsePromise = page.waitForResponse(
    "**/report-transaction-warning**",
  );
  await page.getByText("Feedback?").click();
  await expect(
    page.getByText("Leave feedback about Blockaid warnings and messages"),
  ).toBeVisible();
  await expect(page.getByText("Submit")).toBeDisabled();
  await page
    .getByTestId("blockaid-feedback-details")
    .fill("This is a test feedback message");
  await expect(page.getByText("Submit")).toBeEnabled();
  await page.getByText("Submit").click();
  const response = await responsePromise;
  const responseBody = await response.json();
  await expect(response.status()).toBe(200);
  await expect(responseBody.data).toEqual(123);
};
