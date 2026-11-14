import { expect, Page } from "@playwright/test";

// Every wallet sees the one-time Ethena launch promo on its first unlock to
// Home. Closes it there, back to Home.
export const closeEthenaLaunchPromo = async (page: Page) => {
  await expect(page.getByTestId("ethena-launch")).toBeVisible({
    timeout: 30000,
  });
  await page.getByTestId("ethena-launch-close").click();
  await expect(page.getByTestId("ethena-launch")).toBeHidden();
};
