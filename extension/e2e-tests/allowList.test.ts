import { expect, test, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginAndFund, PASSWORD } from "./helpers/login";

test("View Allow List selector", async ({ page, extensionId }) => {
  test.slow();
  await loginAndFund({ page, extensionId });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto("https://docs.freighter.app/docs/playground/setAllowed");
  await pageTwo.getByText("Set Allowed Status").click();

  const popup = await popupPromise;

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Connected apps").click();

  await expect(popup.getByText("Connection Request")).toBeVisible();
  await popup.getByTestId("grant-access-connect-button").click();

  await expect(page.getByText("No connected apps found")).toBeVisible();

  await expectPageToHaveScreenshot({
    page,
    screenshot: "allowlist-empty.png",
  });

  await page.reload();
  await expect(page.getByText("Connected apps")).toBeVisible();

  await expect(page.getByText("docs.freighter.app")).toBeVisible();

  await expectPageToHaveScreenshot({
    page,
    screenshot: "allowlist-populated.png",
  });

  // confirm allowlist is divided by network
  await page
    .getByTestId("manage-connected-apps-select")
    .selectOption("Main Net");

  await expect(page.getByText("No connected apps found")).toBeVisible();

  await expectPageToHaveScreenshot({
    page,
    screenshot: "allowlist-empty.png",
  });

  // create a new account and confirm the allowlist is divided by account
  await page.getByTestId("BackButton").click();

  await page.getByTestId("AccountHeader__icon-btn").click();
  await page.getByText("Create a new Stellar address").click();

  await page.locator("#password-input").fill(PASSWORD);
  await page.getByText("Create New Address").click();

  await expect(page.getByTestId("not-funded")).toBeVisible({
    timeout: 10000,
  });
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Connected apps").click();

  await expect(page.getByText("No connected apps found")).toBeVisible();

  await expectPageToHaveScreenshot({
    page,
    screenshot: "allowlist-empty.png",
  });
});
