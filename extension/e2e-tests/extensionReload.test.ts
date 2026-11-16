// Everything here comes from @playwright/test, not test-fixtures: these
// tests launch their own browser, and loading test-fixtures would register
// its afterEach, which launches another, unused one.
import { expect, test } from "@playwright/test";
import {
  launchExtension,
  makeProfileDir,
  readLocalStorage,
  relaunchExtension,
  removeProfileDir,
  replaceLocalStorage,
} from "./helpers/extensionStorage";

// These tests launch their own browser on a profile directory they own, so
// they can close it and launch again on the same storage. The shared
// `context` fixture uses a throwaway profile that is deleted on close.
test("relaunching on the same profile re-runs the storage migrations", async () => {
  // Two launches, each waiting out the install pass, plus two closes; under
  // 8 parallel workers this runs past test.slow()'s 45s.
  test.setTimeout(90000);
  const profileDir = makeProfileDir();
  let session = await launchExtension(profileDir);
  try {
    await replaceLocalStorage(session, { storageVersion: "4.0.0" });

    session = await relaunchExtension(session, profileDir);

    await expect
      .poll(
        async () =>
          (await readLocalStorage(session, ["storageVersion"])).storageVersion,
        { timeout: 10000 },
      )
      .toBe("5.50.0");
  } finally {
    await session.context.close();
    removeProfileDir(profileDir);
  }
});
