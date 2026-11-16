// Everything here comes from @playwright/test, not test-fixtures: these
// tests launch their own browser, and loading test-fixtures would register
// its afterEach, which launches another, unused one.
import { Page, expect, test } from "@playwright/test";
import { PASSWORD } from "./helpers/credentials";
import { stubAllExternalApis } from "./helpers/stubs";
import {
  ExtensionSession,
  launchExtension,
  makeProfileDir,
  readLocalStorage,
  relaunchExtension,
  removeProfileDir,
  replaceLocalStorage,
} from "./helpers/extensionStorage";
import preV2Storage from "./fixtures/pre-v2-storage.json";
import {
  PRE_V2_IMPORTED_ACCOUNT_NAME,
  PRE_V2_PHRASE_ACCOUNT_NAMES,
} from "./fixtures/preV2Wallet";

// These tests launch their own browser on a profile directory they own:
// the upgrade is a relaunch on storage a pre-V2 build wrote.

const group = (page: Page, label: string) =>
  page.getByTestId("account-sheet-group").filter({
    has: page.getByTestId("account-sheet-group-toggle").filter({
      hasText: label,
    }),
  });

/**
 * Opens the popup on a session that has just launched, checks it asks for
 * the password instead of onboarding, and unlocks.
 */
const openAndUnlock = async (session: ExtensionSession): Promise<Page> => {
  const page = await session.context.newPage();
  await stubAllExternalApis(page, session.context);
  await page.goto(`chrome-extension://${session.extensionId}/index.html#/`);
  await expect(page.getByTestId("unlock-account")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("import-secret-input")).toHaveCount(0);
  await page.getByTestId("enter-password-input").fill(PASSWORD);
  await page.getByTestId("enter-password-submit").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
  return page;
};

/**
 * Launches on a fresh profile, writes the pre-V2 fixture into storage, and
 * relaunches so the new build migrates it.
 */
const launchUpgradedFromFixture = async (profileDir: string) => {
  const fresh = await launchExtension(profileDir);
  try {
    await replaceLocalStorage(fresh, preV2Storage);
  } catch (error) {
    // The caller never gets `fresh`, so close it here.
    await fresh.context.close().catch(() => {});
    throw error;
  }
  return relaunchExtension(fresh, profileDir);
};

const expectMigratedSwitcher = async (page: Page) => {
  await page.getByTestId("account-view-account-name").click();
  await expect(page.getByTestId("AccountSheet")).toBeVisible();
  await expect(page.getByTestId("account-sheet-group-toggle")).toHaveText([
    "Recovery phrase 1",
    "Secret key 1",
  ]);
  const phraseRows = group(page, "Recovery phrase 1").getByTestId(
    "wallet-row-select",
  );
  await expect(phraseRows).toHaveCount(PRE_V2_PHRASE_ACCOUNT_NAMES.length);
  for (const name of PRE_V2_PHRASE_ACCOUNT_NAMES) {
    await expect(phraseRows.filter({ hasText: name })).toHaveCount(1);
  }
  const secretRows = group(page, "Secret key 1").getByTestId(
    "wallet-row-select",
  );
  await expect(secretRows).toHaveCount(1);
  await expect(secretRows).toContainText(PRE_V2_IMPORTED_ACCOUNT_NAME);
};

test("migrates a pre-V2 wallet in place without re-onboarding", async () => {
  // Two or three browser launches plus unlocks; under 8 parallel workers
  // this runs past test.slow()'s 45s.
  test.setTimeout(90000);
  const profileDir = makeProfileDir();
  let session: ExtensionSession | undefined;
  try {
    session = await launchUpgradedFromFixture(profileDir);
    const page = await openAndUnlock(session);

    await expectMigratedSwitcher(page);
    expect(
      (await readLocalStorage(session, ["storageVersion"])).storageVersion,
    ).toBe("5.50.0");
  } finally {
    await session?.context.close();
    removeProfileDir(profileDir);
  }
});

test("a second relaunch after migrating does not duplicate accounts", async () => {
  // Two or three browser launches plus unlocks; under 8 parallel workers
  // this runs past test.slow()'s 45s.
  test.setTimeout(90000);
  const profileDir = makeProfileDir();
  let session: ExtensionSession | undefined;
  try {
    session = await launchUpgradedFromFixture(profileDir);
    await openAndUnlock(session);

    session = await relaunchExtension(session, profileDir);
    const page = await openAndUnlock(session);

    await expectMigratedSwitcher(page);
    await expect(page.getByTestId("wallet-row-select")).toHaveCount(
      PRE_V2_PHRASE_ACCOUNT_NAMES.length + 1,
    );
  } finally {
    await session?.context.close();
    removeProfileDir(profileDir);
  }
});
