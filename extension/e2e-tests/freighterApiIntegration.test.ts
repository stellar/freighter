import { expect, test, expectPageToHaveScreenshot } from "./test-fixtures";
import { TEST_TOKEN_ADDRESS } from "./helpers/test-token";
import { loginToTestAccount } from "./helpers/login";
import { allowDapp } from "./helpers/allowDapp";

const TX_TO_SIGN =
  "AAAAAgAAAADLvQoIbFw9k0tgjZoOrLTuJJY9kHFYp/YAEAlt/xirbAAAAGQAAAfjAAAOpQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAAAAAAAAvrwgAAAAAAAAAAA";
const SIGNED_TX =
  "AAAAAgAAAADLvQoIbFw9k0tgjZoOrLTuJJY9kHFYp/YAEAlt/xirbAAAAGQAAAfjAAAOpQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAAAAAAAAvrwgAAAAAAAAAAB/xirbAAAAEBWgE2DhhukpAdJTOhBxvuvePAJH+gBbD3hQQljuidQbTFDMEyak7c2fOjyK2moqVhf3AUpCIMSlALglwFXumQH";

const AUTH_ENTRY_TO_SIGN =
  "AAAACc7gMC1ZhE0yvcqRXIID3USzP7t+3BkFHqN6vt8o7NRyGVzFh1h1V3oANBPZAAAAAAAAAAGhRTk9qFLakLcWsi5wS6hhHr80ka5WABdo/8hF7QmS3QAAAARzd2FwAAAABAAAABIAAAAB0kc/9lM7RuxEsaiiUFR+T89kG7IOUk1U0cXCIDkTDesAAAASAAAAAZ+9o35h9wEnNl2hiVZHRJxsDoO3altsu023K1kAex/nAAAACgAAAAAAAAAAAAAAAAADDUAAAAAKAAAAAAAAAAAAAAAAAAGGoAAAAAEAAAAAAAAAAdJHP/ZTO0bsRLGoolBUfk/PZBuyDlJNVNHFwiA5Ew3rAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAFVmR/NPwhQJzrxxqVrqFZ83Hy9HmP4trSdB/dX7sAZjAAAAEgAAAAGhRTk9qFLakLcWsi5wS6hhHr80ka5WABdo/8hF7QmS3QAAAAoAAAAAAAAAAAAAAAAAAw1AAAAAAA==";

const SIGNED_AUTH_ENTRY = JSON.stringify({
  type: "Buffer",
  data: [
    165, 67, 16, 42, 244, 165, 43, 189, 159, 221, 121, 137, 153, 150, 203, 45,
    93, 57, 72, 249, 253, 123, 201, 63, 246, 111, 81, 64, 229, 182, 24, 57, 169,
    81, 159, 223, 75, 150, 86, 14, 192, 5, 222, 178, 110, 148, 104, 60, 1, 82,
    246, 212, 89, 84, 175, 233, 209, 21, 193, 126, 172, 179, 162, 3,
  ],
});

const MSG_TO_SIGN = "test message";

const SIGNED_MSG =
  '"vtBm2byHA0fY2ZsV46t2owv/sD5RfS+iExq7/u37C7ZE401RAGsIsEIHfdbFqOez+KOiBbTT8BKvHtq8/WXYAA=="';

test("should sign transaction when allowed", async ({ page, extensionId }) => {
  await loginToTestAccount({ page, extensionId });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const txPopupPromise = page.context().waitForEvent("page");

  await pageTwo.goto(
    "https://docs.freighter.app/docs/playground/signTransaction",
  );
  await pageTwo.getByRole("textbox").first().fill(TX_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign Transaction XDR").click();

  const txPopup = await txPopupPromise;

  await expect(txPopup.getByText("Confirm Transaction")).toBeVisible();
  await expect(txPopup.getByText("Payment")).toBeVisible();

  await expect(
    txPopup.getByTestId("OperationKeyVal__value").first(),
  ).toHaveText("GBTY…JZOF");

  await expect(txPopup.getByTestId("OperationKeyVal__key").nth(1)).toHaveText(
    "Asset Code",
  );
  await expect(txPopup.getByTestId("OperationKeyVal__value").nth(1)).toHaveText(
    "XLM",
  );
  await expect(txPopup.getByTestId("OperationKeyVal__key").nth(2)).toHaveText(
    "Amount",
  );
  await expect(txPopup.getByTestId("OperationKeyVal__value").nth(2)).toHaveText(
    "5.0000000",
  );
  await expectPageToHaveScreenshot({
    page: txPopup,
    screenshot: "sign-transaction.png",
  });
  await txPopup.getByRole("button", { name: "Confirm" }).click();
});

// TODO: Add domain not allowed to SignTransaction when warning is redesigned
test.skip("should not sign transaction when not allowed", async ({
  page,
  extensionId,
}) => {
  await loginToTestAccount({ page, extensionId });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const txPopupPromise = page.context().waitForEvent("page");

  await pageTwo.goto(
    "https://docs.freighter.app/docs/playground/signTransaction",
  );
  await pageTwo.getByRole("textbox").first().fill(TX_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign Transaction XDR").click();

  const txPopup = await txPopupPromise;

  await expect(
    txPopup.getByText(
      "docs.freighter.app is currently not connected to this Freighter account",
    ),
  ).toBeVisible();
  await expect(txPopup.getByTestId("sign-transaction-sign")).toBeDisabled();
  await expectPageToHaveScreenshot({
    page: txPopup,
    screenshot: "domain-not-allowed-sign-transaction.png",
  });
});

test("should sign auth entry when allowed", async ({ page, extensionId }) => {
  await loginToTestAccount({ page, extensionId });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://docs.freighter.app/docs/playground/signAuthEntry",
  );
  await pageTwo.getByRole("textbox").first().fill(AUTH_ENTRY_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign Authorization Entry XDR").click();

  const popup = await popupPromise;

  await expect(popup.getByText("Authorization Entry").first()).toBeVisible();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "sign-auth-entry.png",
  });

  await popup.getByRole("button", { name: "Approve" }).click();

  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(
    SIGNED_AUTH_ENTRY,
  );
});

test("should not sign auth entry when not allowed", async ({
  page,
  extensionId,
}) => {
  await loginToTestAccount({ page, extensionId });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://docs.freighter.app/docs/playground/signAuthEntry",
  );
  await pageTwo.getByRole("textbox").first().fill(AUTH_ENTRY_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign Authorization Entry XDR").click();

  const popup = await popupPromise;

  await expect(
    popup.getByText(
      "docs.freighter.app is currently not connected to this Freighter account",
    ),
  ).toBeVisible();

  await expect(
    popup.getByTestId("sign-auth-entry-approve-button"),
  ).toBeDisabled();

  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "domain-not-allowed-sign-auth-entry.png",
  });
});

test("should sign message when allowed", async ({ page, extensionId }) => {
  await loginToTestAccount({ page, extensionId });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto("https://docs.freighter.app/docs/playground/signMessage");
  await pageTwo.getByRole("textbox").first().fill(MSG_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign message").click();

  const popup = await popupPromise;

  await expect(popup.getByText(MSG_TO_SIGN)).toBeVisible();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "sign-message.png",
  });

  await popup.getByRole("button", { name: "Approve" }).click();

  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(SIGNED_MSG);
  await expect(pageTwo.getByRole("textbox").nth(4)).toHaveValue(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});

test("should not sign message when not allowed", async ({
  page,
  extensionId,
}) => {
  await loginToTestAccount({ page, extensionId });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto("https://docs.freighter.app/docs/playground/signMessage");
  await pageTwo.getByRole("textbox").first().fill(MSG_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign message").click();

  const popup = await popupPromise;

  await expect(
    popup.getByText(
      "docs.freighter.app is currently not connected to this Freighter account",
    ),
  ).toBeVisible();
  await expect(popup.getByTestId("sign-message-approve-button")).toBeDisabled();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "domain-not-allowed-sign-message.png",
  });
});

test("should add token when allowed", async ({ page, extensionId }) => {
  await loginToTestAccount({ page, extensionId });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto("https://docs.freighter.app/docs/playground/addToken");
  await pageTwo.getByRole("textbox").first().fill(TEST_TOKEN_ADDRESS);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Add Token").click();

  const popup = await popupPromise;

  await expect(popup.getByTestId("add-token-asset-code")).toHaveText("E2E");
  await expect(popup.getByTestId("add-token-asset-name")).toHaveText(
    "E2E Token",
  );
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "add-token.png",
  });
  await popup.getByTestId("add-token-approve").click();

  await expect(pageTwo.getByRole("textbox").nth(2)).toHaveText(
    "Token info successfully sent.",
  );
});

test("should not add token when not allowed", async ({ page, extensionId }) => {
  await loginToTestAccount({ page, extensionId });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto("https://docs.freighter.app/docs/playground/addToken");
  await pageTwo.getByRole("textbox").first().fill(TEST_TOKEN_ADDRESS);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Add Token").click();

  const popup = await popupPromise;

  await expect(
    popup.getByText(
      "docs.freighter.app is currently not connected to this Freighter account",
    ),
  ).toBeVisible();
  await expect(popup.getByTestId("add-token-approve")).toBeDisabled();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "domain-not-allowed-add-token.png",
  });
});
test("should get public key when logged out", async ({ page, extensionId }) => {
  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Log Out").click();
  await expect(page.getByText("Welcome back!")).toBeVisible();

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://docs.freighter.app/docs/playground/requestAccess",
  );
  await pageTwo.getByText("Request Access").click();

  const popup = await popupPromise;
  await expect(popup.getByText("Welcome back!")).toBeVisible();
  await popup.locator("#password-input").fill("My-password123");
  await popup.getByText("Login").click();
  await expect(popup.getByText("Connection Request")).toBeVisible();
  await popup.getByTestId("grant-access-connect-button").click();

  await expect(pageTwo.getByRole("textbox").first()).toHaveValue(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});
