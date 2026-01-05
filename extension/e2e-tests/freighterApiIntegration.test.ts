import { expect, test, expectPageToHaveScreenshot } from "./test-fixtures";
import { TEST_TOKEN_ADDRESS } from "./helpers/test-token";
import { loginToTestAccount } from "./helpers/login";
import { allowDapp } from "./helpers/allowDapp";
import {
  stubAccountBalances,
  stubAccountHistory,
  stubIsSac,
  stubScanDapp,
  stubTokenDetails,
  stubTokenPrices,
} from "./helpers/stubs";

const TX_TO_SIGN =
  "AAAAAgAAAADLvQoIbFw9k0tgjZoOrLTuJJY9kHFYp/YAEAlt/xirbAAAAGQAAAfjAAAOpQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAAAAAAAAvrwgAAAAAAAAAAA";
const SIGNED_TX =
  "AAAAAgAAAADLvQoIbFw9k0tgjZoOrLTuJJY9kHFYp/YAEAlt/xirbAAAAGQAAAfjAAAOpQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAAAAAAAAvrwgAAAAAAAAAAB/xirbAAAAEBWgE2DhhukpAdJTOhBxvuvePAJH+gBbD3hQQljuidQbTFDMEyak7c2fOjyK2moqVhf3AUpCIMSlALglwFXumQH";

const AUTH_ENTRY_TO_SIGN =
  "AAAACc7gMC1ZhE0yvcqRXIID3USzP7t+3BkFHqN6vt8o7NRyGVzFh1h1V3oANBPZAAAAAAAAAAGhRTk9qFLakLcWsi5wS6hhHr80ka5WABdo/8hF7QmS3QAAAARzd2FwAAAABAAAABIAAAAB0kc/9lM7RuxEsaiiUFR+T89kG7IOUk1U0cXCIDkTDesAAAASAAAAAZ+9o35h9wEnNl2hiVZHRJxsDoO3altsu023K1kAex/nAAAACgAAAAAAAAAAAAAAAAADDUAAAAAKAAAAAAAAAAAAAAAAAAGGoAAAAAEAAAAAAAAAAdJHP/ZTO0bsRLGoolBUfk/PZBuyDlJNVNHFwiA5Ew3rAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAFVmR/NPwhQJzrxxqVrqFZ83Hy9HmP4trSdB/dX7sAZjAAAAEgAAAAGhRTk9qFLakLcWsi5wS6hhHr80ka5WABdo/8hF7QmS3QAAAAoAAAAAAAAAAAAAAAAAAw1AAAAAAA==";

const SIGNED_AUTH_ENTRY =
  '"pUMQKvSlK72f3XmJmZbLLV05SPn9e8k/9m9RQOW2GDmpUZ/fS5ZWDsAF3rJulGg8AVL21FlUr+nRFcF+rLOiAw=="';

const MSG_TO_SIGN = "Hello, World!";
const SIGNED_MSG =
  '"dxdeMTXPabzkvpVyTFFvPyiQ1soAJVf55NLkzgQ1a5HihB0wGi78P6p4Qac3YJa9pOVD9YeKGeUPZVNCM/f8Cg=="';

const LONG_MSG_TO_SIGN = Array(10000).fill("a").join("");
const LONG_SIGNED_MSG =
  '"7JrY+dlbFjYGv0TVg+vnM+6XOMeDl2TojARHiyInnXamS5MHrmINhssrvFqGyPx/QGGsKZuvfuVzXPqGoLWkBw=="';

const JSON_MSG_TO_SIGN = JSON.stringify({
  message: "Hello, World!",
  timestamp: 111111,
  isActive: true,
  tags: ["tag1", "tag2"],
  nested: {
    message: "Hello, Universe!",
    timestamp: 222222,
    isActive: false,
    tags: ["tag01", "tag02"],
  },
});
const JSON_SIGNED_MSG =
  '\"42IH7/mvkAT+ltbEG8oEPhVBzP7hb6NU+P+WZP3j1AIMdbwuFPrzBuRFRvLjXdXl5lDmC7aL0zrZIUrfrMXHDw==\"';

test("should sign transaction when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

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

  await expect(txPopup.getByText("GDF3…ZEFY")).toBeVisible();

  await expect(txPopup.getByText("-5")).toBeVisible();
  await expectPageToHaveScreenshot({
    page: txPopup,
    screenshot: "sign-transaction.png",
  });
  await txPopup.getByRole("button", { name: "Confirm" }).click();
  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(SIGNED_TX);
});

// TODO: once freighter-api is updated in npm to fix signing address, this test should be unskipped
test.skip("should sign transaction for a specific account when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  await loginToTestAccount({ page, extensionId });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  page.getByTestId("account-view-account-name").click();
  page.getByText("Account 2").click();
  await expect(page.getByTestId("account-header")).toBeVisible();
  await allowDapp({ page });

  await pageTwo.goto(
    "https://docs.freighter.app/docs/playground/signTransaction",
  );
  await pageTwo.getByRole("textbox").first().fill(TX_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign Transaction XDR").click();

  const txPopupPromise = page.context().waitForEvent("page");
  const txPopup = await txPopupPromise;

  await expect(txPopup.getByText("Confirm Transaction")).toBeVisible();
  await expect(txPopup.getByText("GDF3…ZEFY")).toBeVisible();

  await txPopup.getByRole("button", { name: "Confirm" }).click();
  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(SIGNED_TX);
});

// TODO: Add domain not allowed to SignTransaction when warning is redesigned
test("should not sign transaction when not allowed", async ({
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
      "docs.freighter.app is not currently connected to Freighter",
    ),
  ).toBeVisible();
  await expect(txPopup.getByTestId("sign-transaction-sign")).toBeDisabled();
  await expectPageToHaveScreenshot({
    page: txPopup,
    screenshot: "domain-not-allowed-sign-transaction.png",
  });
});

test("should sign auth entry when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

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
  await pageTwo
    .getByText("Sign Authorization Entry XDR")
    .click({ force: true });

  const popup = await popupPromise;

  await expect(popup.getByText("Confirm Authorization").first()).toBeVisible();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "sign-auth-entry.png",
  });

  await popup.getByRole("button", { name: "Confirm" }).click();

  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(
    SIGNED_AUTH_ENTRY,
  );
});

// unlike sign tx and add token, if a dapp is not allowed, it shows the connection request modal
test("should not sign auth entry when not allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

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
  await pageTwo
    .getByText("Sign Authorization Entry XDR")
    .click({ force: true });

  const popup = await popupPromise;

  await expect(popup.getByText("Connection Request")).toBeVisible();
});

test("should sign auth entry for a selected account when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  await loginToTestAccount({ page, extensionId });

  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  page.getByTestId("account-view-account-name").click();
  page.getByText("Account 2").click();
  await expect(page.getByTestId("account-header")).toBeVisible();
  await allowDapp({ page });

  await pageTwo.goto(
    "https://docs.freighter.app/docs/playground/signAuthEntry",
  );
  await pageTwo.getByRole("textbox").first().fill(AUTH_ENTRY_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo
    .getByRole("textbox")
    .nth(2)
    .fill("GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY");
  await pageTwo.getByText("Sign Authorization Entry XDR").click();

  const popupPromise = page.context().waitForEvent("page");
  const popup = await popupPromise;

  await expect(popup.getByText("Confirm Authorization").first()).toBeVisible();
  await expect(popup.getByText("GDF3…ZEFY")).toBeVisible();

  await popup.getByRole("button", { name: "Confirm" }).click();

  await expect(pageTwo.getByRole("textbox").nth(4)).toHaveValue(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(
    SIGNED_AUTH_ENTRY,
  );
});
test("should sign message string when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

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

  await popup.getByTestId("sign-message-approve-button").click();

  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(SIGNED_MSG);
  await expect(pageTwo.getByRole("textbox").nth(4)).toHaveValue(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});

test("should sign message long string when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  await loginToTestAccount({ page, extensionId });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();

  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto("https://docs.freighter.app/docs/playground/signMessage");
  await pageTwo.getByRole("textbox").first().fill(LONG_MSG_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign message").click();

  const popup = await popupPromise;

  await expect(popup.getByText(LONG_MSG_TO_SIGN)).toBeVisible();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "sign-message-long-string.png",
  });

  await popup.getByTestId("sign-message-approve-button").click();

  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(LONG_SIGNED_MSG);
  await expect(pageTwo.getByRole("textbox").nth(4)).toHaveValue(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});

test("should sign message json when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  await loginToTestAccount({ page, extensionId });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();

  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto("https://docs.freighter.app/docs/playground/signMessage");
  await pageTwo.getByRole("textbox").first().fill(JSON_MSG_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign message").click();

  const popup = await popupPromise;

  await expect(popup.getByText("Hello, World!")).toBeVisible();
  await expect(popup.getByText("Hello, Universe!")).toBeVisible();
  await expect(popup.getByText("111111")).toBeVisible();
  await expect(popup.getByText("true")).toBeVisible();
  await expect(popup.getByText("tag1")).toBeVisible();
  await expect(popup.getByText("tag2")).toBeVisible();
  await expect(popup.getByText("Hello, Universe!")).toBeVisible();
  await expect(popup.getByText("222222")).toBeVisible();
  await expect(popup.getByText("false")).toBeVisible();
  await expect(popup.getByText("tag01")).toBeVisible();
  await expect(popup.getByText("tag02")).toBeVisible();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "sign-message-json.png",
  });

  await popup.getByTestId("sign-message-approve-button").click();

  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(JSON_SIGNED_MSG);
  await expect(pageTwo.getByRole("textbox").nth(4)).toHaveValue(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});

test("should sign message for a specific account when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  await loginToTestAccount({ page, extensionId });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  page.getByTestId("account-view-account-name").click();
  page.getByText("Account 2").click();
  await expect(page.getByTestId("account-header")).toBeVisible();
  await allowDapp({ page });

  await pageTwo.goto("https://docs.freighter.app/docs/playground/signMessage");
  await pageTwo.getByRole("textbox").first().fill(MSG_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo
    .getByRole("textbox")
    .nth(2)
    .fill("GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY");
  await pageTwo.getByText("Sign Message").click();

  const popupPromise = page.context().waitForEvent("page");
  const popup = await popupPromise;

  await expect(popup.getByText("Sign message")).toBeVisible();
  await expect(popup.getByText("GDF3…ZEFY")).toBeVisible();

  await popup.getByRole("button", { name: "Confirm" }).click();

  await expect(pageTwo.getByRole("textbox").nth(4)).toHaveValue(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
  await expect(pageTwo.getByRole("textbox").nth(3)).toHaveText(SIGNED_MSG);
});

// unlike sign tx and add token, if a dapp is not allowed, it shows the connection request modal
test("should not sign message when not allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);
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
  await pageTwo.getByText("Sign message").click({ force: true });

  const popup = await popupPromise;

  await expect(popup.getByText("Connection Request")).toBeVisible();
});

test("should add token when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(context);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);
  await stubIsSac(context);

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

  await expect(popup.getByText("E2E Token")).toBeDefined();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "add-token.png",
  });
  await popup.getByTestId("add-token-approve").click();

  await expect(pageTwo.getByRole("textbox").nth(2)).toHaveText(
    "Token info successfully sent.",
  );
});

test("should not add token when not allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(context);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);
  await stubIsSac(context);

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
  await pageTwo.getByText("Add Token").click({ force: true });

  const popup = await popupPromise;

  await expect(
    popup.getByText(
      "docs.freighter.app is not currently connected to Freighter",
    ),
  ).toBeVisible();
  await expect(popup.getByTestId("add-token-approve")).toBeDisabled();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "domain-not-allowed-add-token.png",
  });
});

test("should get public key when logged out", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Log Out").click();
  await expect(page.getByText("Welcome back")).toBeVisible();

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://docs.freighter.app/docs/playground/requestAccess",
  );
  await pageTwo.getByText("Request Access").click();

  const popup = await popupPromise;
  await expect(popup.getByText("Welcome back")).toBeVisible();
  await popup.locator("#password-input").fill("My-password123");
  await popup.getByRole("button", { name: "Unlock" }).click();
  await expect(popup.getByText("Connection Request")).toBeVisible();
  await popup.getByTestId("grant-access-connect-button").click();

  await expect(pageTwo.getByRole("textbox").first()).toHaveValue(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});
