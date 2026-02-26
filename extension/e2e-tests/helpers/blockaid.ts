import { Page } from "@playwright/test";
import { expect } from "../test-fixtures";

export const testBlockaidFeedback = async ({ page }: { page: Page }) => {
  await page.getByText("Feedback?").click();
  await expect(
    page.getByText("Leave feedback about Blockaid warnings and messages"),
  ).toBeVisible();
  await expect(page.getByText("Submit")).toBeDisabled();
  await page
    .getByTestId("blockaid-feedback-details")
    .fill("This is a test feedback message");
  await expect(page.getByText("Submit")).toBeEnabled();
};
