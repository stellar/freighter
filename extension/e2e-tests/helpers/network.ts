import { expect, Page } from "@playwright/test";

export type NetworkName = "Mainnet" | "Testnet" | "Futurenet";

/**
 * The `<select>` in Settings -> Network is driven by `NETWORK_NAMES`, which are
 * spaced ("Main Net"), unlike the display names the old header dropdown showed.
 */
const NETWORK_OPTION: Record<NetworkName, string> = {
  Mainnet: "Main Net",
  Testnet: "Test Net",
  Futurenet: "Future Net",
};

/**
 * Opens Settings from the account sheet, which is the only entry point.
 *
 * Waits on a test id rather than the page title: the Portuguese login helper
 * goes through here too, and the title is translated.
 */
export const goToSettings = async (page: Page) => {
  await page.getByTestId("account-chip").click();
  await page.getByTestId("account-sheet-settings").click();
  await expect(page.getByTestId("settings-network-link")).toBeVisible();
};

/**
 * Switch the active network.
 *
 * This used to be a dropdown behind a globe in the header. The header
 * restructure removed it, so switching now means walking into Settings ->
 * Network and back out again; callers still expect to end up on Home.
 */
export const switchNetwork = async (page: Page, network: NetworkName) => {
  await goToSettings(page);
  await page.getByTestId("settings-network-link").click();
  await page
    .getByTestId("network-settings-select")
    .selectOption(NETWORK_OPTION[network]);

  // Back out to Home: Network -> Settings -> Home.
  await page.getByTestId("BackButton").click();
  await expect(page.getByTestId("settings-network-link")).toBeVisible();
  await page.getByTestId("BackButton").click();
};

/** Open the connected-apps sheet from the header. */
export const goToConnectedApps = async (page: Page) => {
  await page.getByTestId("account-header-connected-apps-button").click();
  await expect(page.getByTestId("ConnectedAppsSheet")).toBeVisible();
};

/** Waits for Home to be ready, without depending on the network selector. */
export const expectHomeReady = async (page: Page, timeout = 30000) => {
  await expect(page.getByTestId("account-view")).toBeVisible({ timeout });
};
