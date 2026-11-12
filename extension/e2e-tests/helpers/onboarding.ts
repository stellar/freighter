import { Page } from "@playwright/test";
import { expect } from "../test-fixtures";

const DEFAULT_IMPORT_TIMEOUT_MS = 20000;

/**
 * Clicks "Import wallet" on the Welcome page and waits for the import text
 * box.
 */
export const openImportWallet = async ({ page }: { page: Page }) => {
  await page.getByText("Import wallet").click();
  await expect(page.getByTestId("import-secret-input")).toBeVisible();
};

/**
 * Fills the import text box with a recovery phrase or secret key and clicks
 * Next. Does not wait for the password step, so callers can assert an
 * input error instead.
 */
export const enterImportSecret = async ({
  page,
  secret,
}: {
  page: Page;
  secret: string;
}) => {
  await page.getByTestId("import-secret-input").fill(secret);
  await page.getByTestId("import-secret-next").click();
};

/**
 * Fills the password step (password, confirmation, terms of use) and clicks
 * Confirm.
 *
 * @param confirmPassword - Optional. Defaults to `password`.
 */
export const fillPasswordAndConfirm = async ({
  page,
  password,
  confirmPassword,
  confirmLabel = "Confirm",
}: {
  page: Page;
  password: string;
  confirmPassword?: string;
  confirmLabel?: string;
}) => {
  await expect(page.locator("#new-password-input")).toBeVisible();
  await page.locator("#new-password-input").fill(password);
  await page
    .locator("#confirm-password-input")
    .fill(confirmPassword ?? password);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText(confirmLabel, { exact: true }).click();
};

/**
 * Waits for the import to land on the "You’re all set!" success route.
 */
export const waitForImportSuccess = async ({
  page,
  timeout = DEFAULT_IMPORT_TIMEOUT_MS,
  successText = "You’re all set!",
}: {
  page: Page;
  timeout?: number;
  successText?: string;
}) => {
  await expect(page.getByText(successText)).toBeVisible({ timeout });
};

/**
 * Runs the whole import from the Welcome page: text box, Next, password
 * step, then waits for the success route.
 */
export const importWallet = async ({
  page,
  secret,
  password,
  timeout,
}: {
  page: Page;
  secret: string;
  password: string;
  timeout?: number;
}) => {
  await openImportWallet({ page });
  await enterImportSecret({ page, secret });
  await fillPasswordAndConfirm({ page, password });
  await waitForImportSuccess({ page, timeout });
};
