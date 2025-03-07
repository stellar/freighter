import { expect, test } from "../test-fixtures";

export const allowDapp = async ({ page }) => {
  // open a second tab and go to docs playground
  const newPage = await page.context().newPage();
  await newPage.waitForLoadState();

  const allowedPopupPromise = page.context().waitForEvent("page");

  await newPage.goto("https://docs.freighter.app/docs/playground/setAllowed");
  await newPage.getByText("Set Allowed Status").click();

  const allowedPopup = await allowedPopupPromise;

  await allowedPopup.getByRole("button", { name: "Connect" }).click();

  await expect(newPage.getByRole("textbox").first()).toHaveValue("true");
};
