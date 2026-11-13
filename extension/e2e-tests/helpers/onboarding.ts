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
 * Waits for "Your wallet is ready!", the last screen of both onboarding
 * flows (create and import). The status attribute is checked instead of the copy so translated
 * runs work too.
 */
export const waitForOnboardingReady = async ({
  page,
  timeout = DEFAULT_IMPORT_TIMEOUT_MS,
}: {
  page: Page;
  timeout?: number;
}) => {
  await expect(
    page.locator('[data-testid="onboarding-status"][data-status="ready"]'),
  ).toBeVisible({ timeout });
};

/**
 * Runs the whole import from the Welcome page: text box, Next, password
 * step, then waits for the ready screen.
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
  await waitForOnboardingReady({ page, timeout });
};
