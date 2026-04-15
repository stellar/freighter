import { type Page } from "@playwright/test";
import { expect } from "../test-fixtures";

// Opens the GrantAccess popup. Pass autoConnect: true to also click Connect
// and assert the dapp is allowed (used by integration tests via allowDapp).
export const openGrantAccessPopup = async ({
  page,
  autoConnect = false,
}: {
  page: Page;
  autoConnect?: boolean;
}) => {
  const docsPage = await page.context().newPage();
  await docsPage.waitForLoadState();
  const popupPromise = page.context().waitForEvent("page");
  await docsPage.goto("https://docs.freighter.app/docs/playground/setAllowed");
  await docsPage.getByText("Set Allowed Status").click();
  const popup = await popupPromise;
  if (autoConnect) {
    await popup.getByRole("button", { name: "Connect" }).click();
    await expect(docsPage.getByRole("textbox").first()).toHaveValue("true");
  }
  return popup;
};

export const allowDapp = ({ page }: { page: Page }) =>
  openGrantAccessPopup({ page, autoConnect: true });

// Triggers the SignMessage popup via the signMessage playground.
// The dapp connection request appears first — this handles it automatically
// by waiting up to 15s for it to load, then clicking through to the sign message popup.
export const openSignMessagePopup = async ({ page }: { page: Page }) => {
  const newPage = await page.context().newPage();
  await newPage.waitForLoadState();

  // The first popup will be the connection request (dapp not yet connected)
  const connectionPopupPromise = page.context().waitForEvent("page");

  await newPage.goto("https://docs.freighter.app/docs/playground/signMessage");
  await newPage.getByRole("textbox").first().fill("Test message");
  await newPage
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await newPage.getByText("Sign message").click();

  const connectionPopup = await connectionPopupPromise;

  // Register the sign message popup listener before clicking connect
  // to avoid missing the event
  const signMessagePopupPromise = page.context().waitForEvent("page");

  // Connection request can be slow to load — wait up to 15s for the connect button.
  // Matches both "Connect" (safe) and "Connect anyway" (malicious / unable-to-scan).
  const connectButton = connectionPopup.getByRole("button", {
    name: /^Connect/i,
  });
  await connectButton.waitFor({ timeout: 15000 });
  await connectButton.click();

  return signMessagePopupPromise;
};
