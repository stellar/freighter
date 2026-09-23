import { expect, Page } from "@playwright/test";

export type NetworkName = "Mainnet" | "Testnet" | "Futurenet";

/**
 * Switch the active network.
 *
 * The globe selector this drives is removed by the header restructure, which
 * moves network switching into Settings. Keeping every spec behind this helper
 * makes that a single-file change rather than ~11 edits across 7 files.
 */
export const switchNetwork = async (page: Page, network: NetworkName) => {
  await page.getByTestId("network-selector-open").click();
  await page.getByText(network, { exact: true }).click();
};

/**
 * Open the connected-apps list.
 *
 * Shares the globe dropdown with the network switcher today; the header
 * restructure gives it its own icon. Same reason as {@link switchNetwork}:
 * keep the entry point in one place.
 */
export const goToConnectedApps = async (page: Page) => {
  await page.getByTestId("network-selector-open").click();
  await page.getByText("Connected apps").click();
};

/** Waits for Home to be ready, without depending on the network selector. */
export const expectHomeReady = async (page: Page, timeout = 30000) => {
  await expect(page.getByTestId("account-view")).toBeVisible({ timeout });
};
