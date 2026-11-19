/**
 * Captures `fixtures/pre-v2-storage.json`, the storage of a wallet created by
 * a pre-V2 build. `preV2Upgrade.test.ts` loads it to test the upgrade path.
 * Skipped unless CAPTURE_PRE_V2 is set.
 *
 * The fixture was captured from master at 82a7ccaf3, a pre-V2 commit (it has
 * no multi-source storage). Build that commit, not master: once V2 is on
 * master its build would write already-migrated storage, and its onboarding
 * no longer matches the selectors below.
 *
 * To regenerate, from the repo root (Node 22.12.0):
 *
 *   git worktree add --detach ../freighter-pre-v2 82a7ccaf3
 *   cp extension/.env ../freighter-pre-v2/extension/.env
 *   (cd ../freighter-pre-v2 && yarn install && yarn allow-scripts \
 *     && yarn build:extension)
 *   (cd extension && CAPTURE_PRE_V2=1 \
 *     EXTENSION_BUILD_PATH=$PWD/../../freighter-pre-v2/extension/build \
 *     npx playwright test e2e-tests/capturePreV2Storage.test.ts --retries=0)
 *   git worktree remove ../freighter-pre-v2
 *
 * The steps drive that build's UI, which differs from this branch's
 * onboarding, so the selectors are inlined here and taken from its e2e
 * helpers. After a capture, update the account names in
 * `fixtures/preV2Wallet.ts` if they changed.
 */
import fs from "fs";
import path from "path";

import { test, expect } from "./test-fixtures";
import { PASSWORD } from "./helpers/login";
import { stubAllExternalApis } from "./helpers/stubs";
import { switchNetwork } from "./helpers/network";
import { readLocalStorage } from "./helpers/extensionStorage";
import {
  PRE_V2_IMPORTED_SECRET,
  PRE_V2_PHRASE,
  PRE_V2_RENAMED_ACCOUNT,
} from "./fixtures/preV2Wallet";

const FIXTURE_PATH = path.join(__dirname, "fixtures/pre-v2-storage.json");

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeys((value as Record<string, unknown>)[key])]),
    );
  }
  return value;
};

// File-level, so a normal run skips before the fixtures launch a browser.
test.skip(!process.env.CAPTURE_PRE_V2, "capture only");

test("captures a pre-V2 wallet's storage", async ({
  page,
  context,
  extensionId,
}) => {
  test.setTimeout(120000);

  await page.goto(`chrome-extension://${extensionId}/index.html`);
  await stubAllExternalApis(page, context);

  // Master onboarding: password first, then the phrase one word per field.
  await page.getByText("Import wallet").click();
  await page.locator("#new-password-input").fill(PASSWORD);
  await page.locator("#confirm-password-input").fill(PASSWORD);
  await page.locator("#termsOfUse-input").check({ force: true });
  await page.getByText("Confirm").click();
  for (let i = 1; i <= PRE_V2_PHRASE.length; i++) {
    await page.locator(`#MnemonicPhrase-${i}`).fill(PRE_V2_PHRASE[i - 1]);
  }
  await page.getByRole("button", { name: "Import" }).click();
  await expect(page.getByText("You’re all set!")).toBeVisible({
    timeout: 20000,
  });

  await page.goto(`chrome-extension://${extensionId}/index.html#/`);
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  await switchNetwork(page, "Testnet");
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  // A second account derived from the phrase; it becomes active.
  await page.getByTestId("account-view-account-name").click();
  await page.getByTestId("add-wallet").click();
  await page.getByText("Create a new wallet").click();
  await page.locator("#password-input").fill(PASSWORD);
  await page.getByRole("button", { name: "Create New Address" }).click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  // Rename the active (second) account.
  await page.getByTestId("account-view-account-name").click();
  await page.getByTestId("wallets-header-edit-name").click();
  await page.getByTestId("rename-wallet-input").fill(PRE_V2_RENAMED_ACCOUNT);
  await page.getByText("Set name").click();
  await expect(page.getByTestId("wallets-header")).toContainText(
    PRE_V2_RENAMED_ACCOUNT,
  );
  // Closes the account sheet; a goto to #/ is same-document and keeps it.
  await page.reload();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  // An imported secret key.
  await page.getByTestId("account-view-account-name").click();
  await page.getByTestId("add-wallet").click();
  await page.getByText("Import a Stellar secret key").click();
  await page.locator("#privateKey-input").fill(PRE_V2_IMPORTED_SECRET);
  await page.locator("#password-input").fill(PASSWORD);
  await page.locator("#authorization-input").check({ force: true });
  await page.getByTestId("import-account-button").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  const storage = await readLocalStorage({ context, extensionId });
  fs.writeFileSync(
    FIXTURE_PATH,
    `${JSON.stringify(sortKeys(storage), null, 2)}\n`,
  );
});
