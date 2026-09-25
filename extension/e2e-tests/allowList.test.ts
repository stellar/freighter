import { expect, test, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginToTestAccount, PASSWORD } from "./helpers/login";
import { goToConnectedApps, switchNetwork } from "./helpers/network";

test("View Allow List selector", async ({ page, extensionId, context }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/setAllowed",
  );
  await pageTwo.getByText("Set Allowed").click();

  const popup = await popupPromise;

  await goToConnectedApps(page);

  await expect(popup.getByText("Connection Request")).toBeVisible();
  await popup.getByTestId("grant-access-connect-button").click();

  await expect(page.getByText("Nothing connected yet")).toBeVisible();

  await expectPageToHaveScreenshot({
    page,
    screenshot: "allowlist-empty.png",
  });

  // Reopening the sheet re-reads app data, which is how the connection just
  // granted reaches it.
  await page.getByTestId("ConnectedAppsSheet__close").click();
  await goToConnectedApps(page);
  await expect(
    page.getByTestId("ConnectedAppsSheet").getByText("play.freighter.app"),
  ).toBeVisible();

  await expectPageToHaveScreenshot({
    page,
    screenshot: "allowlist-populated.png",
  });

  // Confirm the allow list is divided by network. The sheet only ever shows
  // the active network now, so this switches in Settings rather than picking
  // a network from a dropdown on the screen itself.
  await page.getByTestId("ConnectedAppsSheet__close").click();
  await switchNetwork(page, "Mainnet");
  await goToConnectedApps(page);

  await expect(page.getByText("Nothing connected yet")).toBeVisible();

  await expectPageToHaveScreenshot({
    page,
    screenshot: "allowlist-empty.png",
  });

  // create a new account and confirm the allowlist is divided by account
  await page.getByTestId("ConnectedAppsSheet__close").click();
  await switchNetwork(page, "Testnet");

  await page.getByTestId("account-view-account-name").click();
  await page.getByTestId("add-wallet").click();
  await page.getByText("Create a new wallet").click();

  await page.locator("#password-input").fill(PASSWORD);
  await page.getByText("Create New Address").click();

  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 10000,
  });
  await goToConnectedApps(page);

  await expect(page.getByText("Nothing connected yet")).toBeVisible();

  await expectPageToHaveScreenshot({
    page,
    screenshot: "allowlist-empty.png",
  });
});

test("Disconnecting apps shows a success toast", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  // Connects play.freighter.app to the current network, so the Connected apps
  // view has a row to disconnect.
  const grantAccess = async () => {
    const popupPromise = page.context().waitForEvent("page");
    await pageTwo.goto(
      "https://play.freighter.app/#/extension/playground/setAllowed",
    );
    await pageTwo.getByText("Set Allowed").click();
    const popup = await popupPromise;
    await expect(popup.getByText("Connection Request")).toBeVisible();
    await popup.getByTestId("grant-access-connect-button").click();
  };

  await goToConnectedApps(page);
  await grantAccess();
  // Close and reopen rather than reload: opening the sheet is what re-reads
  // the allow list.
  await page.getByTestId("ConnectedAppsSheet__close").click();
  await goToConnectedApps(page);
  await expect(
    page.getByTestId("ConnectedAppsSheet").getByText("play.freighter.app"),
  ).toBeVisible();

  // Removing a single app names it in the toast.
  await page.locator(".ConnectedAppsSheet__row .Button").first().click();
  await expect(page.getByText("play.freighter.app disconnected")).toBeVisible();
  await expect(page.getByText("Nothing connected yet")).toBeVisible();

  // "Disconnect all" reports the batch instead of naming each app.
  await grantAccess();
  await page.getByTestId("ConnectedAppsSheet__close").click();
  await goToConnectedApps(page);
  await expect(
    page.getByTestId("ConnectedAppsSheet").getByText("play.freighter.app"),
  ).toBeVisible();

  await page.getByTestId("disconnect-all").click();
  await expect(page.getByText("All apps disconnected")).toBeVisible();
  await expect(page.getByText("Nothing connected yet")).toBeVisible();
});
