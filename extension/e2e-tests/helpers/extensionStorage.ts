import fs from "fs";
import os from "os";
import path from "path";
import { BrowserContext, expect, Worker } from "@playwright/test";
import { launchExtensionContext } from "./launch";

/**
 * The last storage migration this build runs (`versionedMigration` in
 * `background/helpers/dataStorage.ts`). Bump it with the next migration.
 */
export const LATEST_STORAGE_VERSION = "5.50.0";

export interface ExtensionSession {
  context: BrowserContext;
  extensionId: string;
  serviceWorker: Worker;
}

/**
 * Returns the extension's running service worker, waiting for one to start
 * if none is running.
 */
export const getServiceWorker = async (
  context: BrowserContext,
): Promise<Worker> => {
  const [worker] = context.serviceWorkers();
  return worker ?? context.waitForEvent("serviceworker");
};

/**
 * Creates an empty profile directory for `launchExtension`. The caller
 * removes it with `removeProfileDir`.
 */
export const makeProfileDir = (): string =>
  fs.mkdtempSync(path.join(os.tmpdir(), "freighter-e2e-profile-"));

export const removeProfileDir = (profileDir: string) =>
  fs.rmSync(profileDir, { recursive: true, force: true });

/**
 * Launches the extension on a profile directory the test owns, so the test
 * can close the browser and launch it again on the same storage.
 *
 * Returns once the `runtime.onInstalled` listeners have finished: storage is
 * at `LATEST_STORAGE_VERSION` and the rebrand status is recorded (the last
 * listener). Without this wait, a write right after launch races the
 * install pass, and a relaunch could be read before it has migrated.
 */
export const launchExtension = async (
  profileDir: string,
): Promise<ExtensionSession> => {
  const context = await launchExtensionContext(profileDir);
  const serviceWorker = await getServiceWorker(context);
  const extensionId = serviceWorker.url().split("/")[2];
  const session = { context, extensionId, serviceWorker };
  await expect
    .poll(
      async () => {
        const stored = await readLocalStorage(session, [
          "storageVersion",
          "rebrandAnnouncementStatus",
        ]);
        return (
          stored.storageVersion === LATEST_STORAGE_VERSION &&
          !!stored.rebrandAnnouncementStatus
        );
      },
      { timeout: 20000 },
    )
    .toBe(true);
  return session;
};

/**
 * Closes the browser and launches it again on the same profile. Chrome
 * reloads a command-line extension on every launch, which fires
 * `runtime.onInstalled` and so runs the storage migrations.
 * `chrome.runtime.reload()` can't stand in for this: it unloads a
 * command-line extension and never brings it back.
 */
export const relaunchExtension = async (
  session: ExtensionSession,
  profileDir: string,
): Promise<ExtensionSession> => {
  await session.context.close();
  return launchExtension(profileDir);
};

export type ExtensionTarget = Pick<ExtensionSession, "context" | "extensionId">;

/**
 * Runs `fn` in a short-lived extension page. Storage calls go through a page
 * rather than the service worker: a worker handle taken while the extension
 * is still starting up can stall for ~30s under parallel runs. The page is
 * `manifest.json` so the popup app doesn't boot alongside.
 */
const inExtensionPage = async <Arg, Result>(
  { context, extensionId }: ExtensionTarget,
  fn: (arg: Arg) => Promise<Result>,
  arg: Arg,
): Promise<Result> => {
  const page = await context.newPage();
  try {
    await page.goto(`chrome-extension://${extensionId}/manifest.json`);
    return await page.evaluate(fn, arg);
  } finally {
    await page.close();
  }
};

/**
 * Reads `chrome.storage.local`. Reads everything when `keys` is omitted.
 */
export const readLocalStorage = (
  target: ExtensionTarget,
  keys?: string[],
): Promise<Record<string, unknown>> =>
  inExtensionPage(
    target,
    (k: string[] | null) => chrome.storage.local.get(k),
    keys ?? null,
  );

/**
 * Clears `chrome.storage.local` and writes `data` in its place.
 */
export const replaceLocalStorage = (
  target: ExtensionTarget,
  data: Record<string, unknown>,
): Promise<void> =>
  inExtensionPage(
    target,
    async (d: Record<string, unknown>) => {
      await chrome.storage.local.clear();
      await chrome.storage.local.set(d);
    },
    data,
  );
