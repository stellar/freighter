import { Page } from "@playwright/test";
import { expect } from "../test-fixtures";
import { goToSettings } from "./network";

export type RevealKind = "recovery-phrase" | "secret-key";

const REVEAL_ACTION: Record<RevealKind, string> = {
  "recovery-phrase": "Reveal recovery phrase",
  "secret-key": "Reveal secret key",
};

/**
 * Settings → Accounts & recovery → the edit button on the row named
 * `accountName`. Leaves the popup on Edit account.
 */
export const openEditAccount = async (page: Page, accountName: string) => {
  await goToSettings(page);
  await page.getByTestId("settings-accounts-recovery").click();
  await page
    .getByTestId("accounts-recovery-row")
    .filter({ hasText: accountName })
    .getByTestId("accounts-recovery-edit")
    .click();
  await expect(page.getByTestId("edit-account")).toBeVisible();
};

/**
 * From Edit account: opens the reveal screen, ticks the acknowledgement and
 * continues. Leaves the password step open.
 */
export const startReveal = async (page: Page, kind: RevealKind) => {
  await page.getByTestId(`edit-account-${kind}`).click();
  await page.getByTestId(`reveal-${kind}-acknowledge`).check({ force: true });
  await page
    .getByRole("button", { name: REVEAL_ACTION[kind], exact: true })
    .click();
  await expect(page.locator("#password")).toBeVisible();
};

/**
 * Fills the reveal password step and submits it.
 */
export const submitRevealPassword = async (
  page: Page,
  kind: RevealKind,
  password: string,
) => {
  await page.locator("#password").fill(password);
  await page
    .getByRole("button", { name: REVEAL_ACTION[kind], exact: true })
    .click();
};

/**
 * Locks the wallet from Settings and unlocks it with `password`. Starts from
 * any popup screen, since Settings is only reachable from the account view.
 * Leaves the popup on the account view.
 */
export const lockAndUnlock = async (page: Page, password: string) => {
  // URL.origin is "null" for chrome-extension: URLs, so build it from host.
  const { protocol, host } = new URL(page.url());
  await page.goto(`${protocol}//${host}/index.html#/`);
  await goToSettings(page);
  await page.getByTestId("settings-lock-freighter").click();
  await expect(page.getByTestId("unlock-account")).toBeVisible();
  await page.getByTestId("enter-password-input").fill(password);
  await page.getByTestId("enter-password-submit").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
};
