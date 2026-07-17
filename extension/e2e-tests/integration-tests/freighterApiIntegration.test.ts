import { expect, test, expectPageToHaveScreenshot } from "../test-fixtures";
import { TEST_TOKEN_ADDRESS } from "../helpers/test-token";
import { loginToTestAccount, switchToMainnet } from "../helpers/login";
import { allowDapp } from "../helpers/dAppSessionHelper";
import {
  SAC_CONTRACT_ID,
  delayAddTokenRoundTrip,
  stubAccountBalances,
  stubAccountHistory,
  stubBackendSubmitTx,
  stubFeeStats,
  stubHorizonAccounts,
  stubIsSac,
  stubIsSacTrue,
  stubSacTokenDetails,
  stubSacViaInitScript,
  stubScanAssetSafe,
  stubScanDapp,
  stubScanTx,
  stubTokenDetails,
  stubTokenPrices,
  stubVerifiedToken,
} from "../helpers/stubs";

const TX_TO_SIGN =
  "AAAAAgAAAADLvQoIbFw9k0tgjZoOrLTuJJY9kHFYp/YAEAlt/xirbAAAAGQAAAfjAAAOpQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAAAAAAAAvrwgAAAAAAAAAAA";
const SIGNED_TX =
  "AAAAAgAAAADLvQoIbFw9k0tgjZoOrLTuJJY9kHFYp/YAEAlt/xirbAAAAGQAAAfjAAAOpQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAAAAAAAAvrwgAAAAAAAAAAB/xirbAAAAEBWgE2DhhukpAdJTOhBxvuvePAJH+gBbD3hQQljuidQbTFDMEyak7c2fOjyK2moqVhf3AUpCIMSlALglwFXumQH";

const AUTH_ENTRY_TO_SIGN =
  "AAAACc7gMC1ZhE0yvcqRXIID3USzP7t+3BkFHqN6vt8o7NRyGVzFh1h1V3oANBPZAAAAAAAAAAGhRTk9qFLakLcWsi5wS6hhHr80ka5WABdo/8hF7QmS3QAAAARzd2FwAAAABAAAABIAAAAB0kc/9lM7RuxEsaiiUFR+T89kG7IOUk1U0cXCIDkTDesAAAASAAAAAZ+9o35h9wEnNl2hiVZHRJxsDoO3altsu023K1kAex/nAAAACgAAAAAAAAAAAAAAAAADDUAAAAAKAAAAAAAAAAAAAAAAAAGGoAAAAAEAAAAAAAAAAdJHP/ZTO0bsRLGoolBUfk/PZBuyDlJNVNHFwiA5Ew3rAAAACHRyYW5zZmVyAAAAAwAAABIAAAAAAAAAAFVmR/NPwhQJzrxxqVrqFZ83Hy9HmP4trSdB/dX7sAZjAAAAEgAAAAGhRTk9qFLakLcWsi5wS6hhHr80ka5WABdo/8hF7QmS3QAAAAoAAAAAAAAAAAAAAAAAAw1AAAAAAA==";

const SIGNED_AUTH_ENTRY =
  "pUMQKvSlK72f3XmJmZbLLV05SPn9e8k/9m9RQOW2GDmpUZ/fS5ZWDsAF3rJulGg8AVL21FlUr+nRFcF+rLOiAw==";

// A valid HashIdPreimage XDR of type ENVELOPE_TYPE_OP_ID (6), NOT sorobanAuthorization.
// Used to test the second validation catch in SignAuthEntry (wrong preimage variant).
const NON_SOROBAN_AUTH_ENTRY =
  "AAAABgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAA==";

// A CAP-71 (protocol 27) ENVELOPE_TYPE_SOROBAN_AUTHORIZATION_WITH_ADDRESS
// preimage on TestNet, bound to account GAAQCAIB… (ed25519 0x01*32) — never the
// e2e test account. Used to exercise the bound-address mismatch block.
const V2_AUTH_ENTRY_WRONG_ADDRESS =
  "AAAACs7gMC1ZhE0yvcqRXIID3USzP7t+3BkFHqN6vt8o7NRyAAAAAAAAACoAD0JAAAAAAAAAAAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQAAAAAAAAABAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMAAAAIdHJhbnNmZXIAAAAAAAAAAA==";

const MSG_TO_SIGN = "Hello, World!";
const SIGNED_MSG =
  "dxdeMTXPabzkvpVyTFFvPyiQ1soAJVf55NLkzgQ1a5HihB0wGi78P6p4Qac3YJa9pOVD9YeKGeUPZVNCM/f8Cg==";

const LONG_MSG_TO_SIGN = Array(10000).fill("a").join("");
const LONG_SIGNED_MSG =
  "7JrY+dlbFjYGv0TVg+vnM+6XOMeDl2TojARHiyInnXamS5MHrmINhssrvFqGyPx/QGGsKZuvfuVzXPqGoLWkBw==";

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
  "42IH7/mvkAT+ltbEG8oEPhVBzP7hb6NU+P+WZP3j1AIMdbwuFPrzBuRFRvLjXdXl5lDmC7aL0zrZIUrfrMXHDw==";

const isIntegrationMode = process.env.IS_INTEGRATION_MODE === "true";

test("should sign transaction when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const txPopupPromise = page.context().waitForEvent("page");

  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signTransaction",
  );
  await pageTwo.getByRole("textbox").first().fill(TX_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign Transaction XDR").click();

  const txPopup = await txPopupPromise;
  await stubAccountBalances(txPopup);
  // Stub scan-tx with detailed asset diffs
  await txPopup.route("**/scan-tx", async (route) => {
    await route.fulfill({
      json: {
        data: {
          simulation: {
            status: "Success",
            assets_diffs: {
              GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY: [
                {
                  asset: {
                    type: "NATIVE",
                    code: "XLM",
                  },
                  in: null,
                  out: {
                    usd_price: 0,
                    summary: "Sent 5 XLM",
                    value: 5,
                    raw_value: 50000000,
                  },
                  asset_type: "NATIVE",
                },
              ],
              GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF: [
                {
                  asset: {
                    type: "NATIVE",
                    code: "XLM",
                  },
                  in: {
                    usd_price: 0,
                    summary: "Received 5 XLM",
                    value: 5,
                    raw_value: 50000000,
                  },
                  out: null,
                  asset_type: "NATIVE",
                },
              ],
            },
            exposures: {},
            assets_ownership_diff: {},
            address_details: [],
            account_summary: {
              account_assets_diffs: [
                {
                  asset: {
                    type: "NATIVE",
                    code: "XLM",
                  },
                  in: null,
                  out: {
                    usd_price: 0,
                    summary: "Sent 5 XLM",
                    value: 5,
                    raw_value: 50000000,
                  },
                  asset_type: "NATIVE",
                },
              ],
              account_exposures: [],
              account_ownerships_diff: [],
              total_usd_diff: {
                in: 0,
                out: 0,
                total: 0,
              },
              total_usd_exposure: {},
            },
            transaction_actions: null,
          },
          validation: {
            status: "Success",
            result_type: "Benign",
            description: "",
            reason: "",
            classification: "",
            features: [],
          },
          request_id: "9e460857-734b-405e-9e1f-86e656def1dd",
        },
        error: null,
      },
    });
  });

  await expect(txPopup.getByText("Confirm Transaction")).toBeVisible();
  await expect(txPopup.getByText("Network")).toBeVisible();
  await expect(txPopup.getByText("Test Net")).toBeVisible();

  await expect(txPopup.getByText("GDF3…ZEFY")).toBeVisible();

  await expect(txPopup.getByText("-5")).toBeVisible();
  await expectPageToHaveScreenshot({
    page: txPopup,
    screenshot: "sign-transaction.png",
  });
  await txPopup.getByRole("button", { name: "Confirm" }).click();
  await expect(pageTwo.locator("#result-signTx")).toHaveText(SIGNED_TX);
});

// TODO: once freighter-api is updated in npm to fix signing address, this test should be unskipped
test.skip("should sign transaction for a specific account when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  page.getByTestId("account-view-account-name").click();
  page.getByText("Account 2").click();
  await expect(page.getByTestId("account-header")).toBeVisible();
  await allowDapp({ page });

  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signTransaction",
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
  await expect(pageTwo.locator("#result-signTx")).toHaveText(SIGNED_TX);
});

// TODO: Add domain not allowed to SignTransaction when warning is redesigned
test("should not sign transaction when not allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const txPopupPromise = page.context().waitForEvent("page");

  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signTransaction",
  );
  await pageTwo.getByRole("textbox").first().fill(TX_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign Transaction XDR").click();

  const txPopup = await txPopupPromise;
  await stubAccountBalances(txPopup);

  await expect(
    txPopup.getByText(
      "play.freighter.app is not currently connected to Freighter",
    ),
  ).toBeVisible();
  await expect(txPopup.getByTestId("sign-transaction-sign")).toBeDisabled();
  await expectPageToHaveScreenshot({
    page: txPopup,
    screenshot: "domain-not-allowed-sign-transaction.png",
  });
});

test("should sign correct transactions when Freighter receives multiple requests", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  await loginToTestAccount({ page, extensionId, context });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const txPopupPromise = page.context().waitForEvent("page");

  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signTransaction",
  );
  await pageTwo.getByRole("textbox").first().fill(TX_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign Transaction XDR").click();

  const txPopup = await txPopupPromise;
  await stubAccountBalances(txPopup);
  // Stub scan-tx with detailed asset diffs
  await txPopup.route("**/scan-tx", async (route) => {
    await route.fulfill({
      json: {
        data: {
          simulation: {
            status: "Success",
            assets_diffs: {
              GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY: [
                {
                  asset: {
                    type: "NATIVE",
                    code: "XLM",
                  },
                  in: null,
                  out: {
                    usd_price: 0,
                    summary: "Sent 5 XLM",
                    value: 5,
                    raw_value: 50000000,
                  },
                  asset_type: "NATIVE",
                },
              ],
              GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF: [
                {
                  asset: {
                    type: "NATIVE",
                    code: "XLM",
                  },
                  in: {
                    usd_price: 0,
                    summary: "Received 5 XLM",
                    value: 5,
                    raw_value: 50000000,
                  },
                  out: null,
                  asset_type: "NATIVE",
                },
              ],
            },
            exposures: {},
            assets_ownership_diff: {},
            address_details: [],
            account_summary: {
              account_assets_diffs: [
                {
                  asset: {
                    type: "NATIVE",
                    code: "XLM",
                  },
                  in: null,
                  out: {
                    usd_price: 0,
                    summary: "Sent 5 XLM",
                    value: 5,
                    raw_value: 50000000,
                  },
                  asset_type: "NATIVE",
                },
              ],
              account_exposures: [],
              account_ownerships_diff: [],
              total_usd_diff: {
                in: 0,
                out: 0,
                total: 0,
              },
              total_usd_exposure: {},
            },
            transaction_actions: null,
          },
          validation: {
            status: "Success",
            result_type: "Benign",
            description: "",
            reason: "",
            classification: "",
            features: [],
          },
          request_id: "9e460857-734b-405e-9e1f-86e656def1dd",
        },
        error: null,
      },
    });
  });

  await expect(txPopup.getByText("Confirm Transaction")).toBeVisible();

  await expect(txPopup.getByText("GDF3…ZEFY")).toBeVisible();

  await expect(txPopup.getByText("-5")).toBeVisible();

  // now open a third tab and send another transaction signing request before approving the first one

  const pageThree = await page.context().newPage();
  await pageThree.waitForLoadState();

  const txPopupPromise2 = page.context().waitForEvent("page");
  await pageThree.goto(
    "https://play.freighter.app/#/extension/playground/signTransaction",
  );
  await pageThree
    .getByRole("textbox")
    .first()
    .fill(
      "AAAAAgAAAADLvQoIbFw9k0tgjZoOrLTuJJY9kHFYp/YAEAlt/xirbAAAAGQAAAUVAAAA/QAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAQAAAABngBTmbmUycqG2cAMHcomSR80dRzGtKzxM6gb3yySD5AAAAAAAAAAABfXhAAAAAAAAAAAA",
    );
  await pageThree
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageThree.getByText("Sign Transaction XDR").click();

  const txPopup2 = await txPopupPromise2;
  await expect(txPopup2.getByText("Confirm Transaction")).toBeVisible();
  await expect(txPopup2.getByText("GDF3…ZEFY")).toBeVisible();
  await expect(txPopup2.getByText("-10")).toBeVisible();

  await txPopup.getByRole("button", { name: "Confirm" }).click();
  await expect(pageTwo.locator("#result-signTx")).toHaveText(SIGNED_TX);
});

test("should sign auth entry when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();

  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signAuthEntry",
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
  await expect(popup.getByText("Network")).toBeVisible();
  await expect(popup.getByText("Test Net")).toBeVisible();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "sign-auth-entry.png",
  });

  await popup.getByRole("button", { name: "Confirm" }).click();

  await expect(pageTwo.locator("#result-signAuth")).toHaveText(
    SIGNED_AUTH_ENTRY,
  );
});

// unlike sign tx and add token, if a dapp is not allowed, it shows the connection request modal
test("should not sign auth entry when not allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();

  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signAuthEntry",
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
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });

  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  await page.getByTestId("account-view-account-name").click();
  await page.getByText("Account 2").click();
  await expect(page.getByTestId("account-header")).toBeVisible();
  await allowDapp({ page });

  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signAuthEntry",
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

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.getByText("Sign Authorization Entry XDR").click();

  const popup = await popupPromise;

  await expect(popup.getByText("Confirm Authorization").first()).toBeVisible();
  await expect(popup.getByText("GDF3…ZEFY")).toBeVisible();

  await popup.getByRole("button", { name: "Confirm" }).click();

  await expect(pageTwo.locator("#result-signAuth-signer")).toHaveText(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
  await expect(pageTwo.locator("#result-signAuth")).toHaveText(
    SIGNED_AUTH_ENTRY,
  );
});
test("should sign message string when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();

  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signMessage",
  );
  await pageTwo.getByRole("textbox").first().fill(MSG_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign message").click();

  const popup = await popupPromise;

  await expect(popup.getByText(MSG_TO_SIGN)).toBeVisible();
  await expect(popup.getByText("Network")).toBeVisible();
  await expect(popup.getByText("Test Net")).toBeVisible();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "sign-message.png",
  });

  await popup.getByTestId("sign-message-approve-button").click();

  await expect(pageTwo.locator("#result-signMsg")).toHaveText(SIGNED_MSG);
  await expect(pageTwo.locator("#result-signMsg-signer")).toHaveText(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});

test("should sign message long string when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();

  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signMessage",
  );
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

  await expect(pageTwo.locator("#result-signMsg")).toHaveText(LONG_SIGNED_MSG);
  await expect(pageTwo.locator("#result-signMsg-signer")).toHaveText(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});

test("should sign correct message when Freighter receives multiple requests", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);

  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();

  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signMessage",
  );
  await pageTwo.getByRole("textbox").first().fill(MSG_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign message").click();

  const popup = await popupPromise;

  await expect(popup.getByText(MSG_TO_SIGN)).toBeVisible();

  await popup.getByTestId("sign-message-approve-button").click();

  // now open a third tab and send another transaction signing request before approving the first one

  const pageThree = await page.context().newPage();
  await pageThree.waitForLoadState();

  const popupPromise2 = page.context().waitForEvent("page");
  await pageThree.goto(
    "https://play.freighter.app/#/extension/playground/signMessage",
  );
  await pageThree.getByRole("textbox").first().fill("new message");
  await pageThree
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageThree.getByText("Sign message").click();

  const popup2 = await popupPromise2;
  await expect(popup2.getByText("new message")).toBeVisible();

  await expect(pageTwo.locator("#result-signMsg")).toHaveText(SIGNED_MSG);
  await expect(pageTwo.locator("#result-signMsg-signer")).toHaveText(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});

test("should sign message json when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();

  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signMessage",
  );
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

  await expect(pageTwo.locator("#result-signMsg")).toHaveText(JSON_SIGNED_MSG);
  await expect(pageTwo.locator("#result-signMsg-signer")).toHaveText(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});

test("should sign message for a specific account when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  await page.getByTestId("account-view-account-name").click();
  await page.getByText("Account 2").click();
  await expect(page.getByTestId("account-header")).toBeVisible();
  await allowDapp({ page });

  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signMessage",
  );
  await pageTwo.getByRole("textbox").first().fill(MSG_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo
    .getByRole("textbox")
    .nth(2)
    .fill("GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY");

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.getByText("Sign Message").click();

  const popup = await popupPromise;

  await expect(popup.getByText("Sign message")).toBeVisible();
  await expect(popup.getByText("GDF3…ZEFY")).toBeVisible();

  await popup.getByRole("button", { name: "Confirm" }).click();

  await expect(pageTwo.locator("#result-signMsg-signer")).toHaveText(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
  await expect(pageTwo.locator("#result-signMsg")).toHaveText(SIGNED_MSG);
});

// unlike sign tx and add token, if a dapp is not allowed, it shows the connection request modal
test("should not sign message when not allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signMessage",
  );
  await pageTwo.getByRole("textbox").first().fill(MSG_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Sign message").click({ force: true });

  const popup = await popupPromise;

  await expect(popup.getByText("Connection Request")).toBeVisible();
});

test("should add an unverified SEP-41 token when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  await stubIsSac(context);

  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/addToken",
  );
  await pageTwo.getByRole("textbox").first().fill(TEST_TOKEN_ADDRESS);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Add Token").click();

  const popup = await popupPromise;

  await expect(popup.getByText("E2E Token")).toBeDefined();
  await expect(popup.getByTestId("add-token-unverified")).toBeVisible();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "add-token.png",
  });
  // Register the close listener BEFORE clicking: window.close() can fire
  // fast enough that waiting for the event after the click races it.
  const popupClosed = popup.waitForEvent("close", { timeout: 15000 });
  await popup.getByTestId("add-token-approve").click();

  // SEP-41 is a one-step flow: a single Confirm click resolves the dApp
  // request AND closes the popup — no separate success screen / Done click.
  await popupClosed;

  await expect(pageTwo.locator("#result-addToken")).toContainText(
    "Token added:",
  );
});

// The cryptographically-derived SAC contract for E2E:SAC_ISSUER on testnet.
// new Asset("E2E", SAC_ISSUER).contractId("Test SDF Network ; September 2015")
// SAC_CONTRACT_ID (derived from Asset("E2E", SAC_ISSUER)) is imported from
// helpers/stubs — using it, not TEST_TOKEN_ADDRESS, is required so isAssetSac()
// in useGetChangeTrustData verifies correctly and builds the XDR.

// SAC token test: skipped in integration mode — the stubs needed to classify
// SAC_CONTRACT_ID as a SAC must be injected before the popup opens, which
// requires the window.fetch addInitScript approach described below. In
// integration mode all stubs are bypassed and the real backend is used, but
// the test account does not have a live SAC on testnet.
test("should add an unverified SAC token through the Change Trust review when allowed", async ({
  page,
  extensionId,
  context,
}) => {
  test.skip(
    isIntegrationMode,
    "SAC stub injection via addInitScript is not compatible with integration mode",
  );

  // Playwright's context.route() / page.route() does not reliably intercept
  // fetch calls made by Chrome extension popup pages in headless mode because
  // those pages run in an isolated extension process. We therefore override
  // window.fetch via context.addInitScript(), which is guaranteed to run before
  // ANY page script on every new page — including the popup opened by
  // browser.windows.create(). This is the same technique used in
  // stubAccountHistoryWith (page level) applied at context level.
  //
  // Endpoints overridden:
  //   is-sac-contract → { isSacContract: true }
  //   token-details   → { name: "E2E:<SAC_ISSUER>", symbol: "E2E", decimals: 7 }
  //
  // Effect on the AddToken flow:
  //   useTokenLookup receives isSacContract=true → sets issuer to the G-address
  //   → StrKey.isValidEd25519PublicKey(issuer) = true → isSac = true
  //   → Confirm click calls setShowTrustlineReview(true) instead of handleApprove()
  //   → ChangeTrustInternal renders, isAssetSac verifies SAC_CONTRACT_ID, builds XDR
  await stubSacViaInitScript(context);

  // context.route() as belt-and-suspenders (intercepted when CDP cooperates)
  await stubIsSacTrue(context);
  await stubSacTokenDetails(context);

  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  // Open a second tab pointing at the addToken playground.
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/addToken",
  );
  // Use the cryptographically-derived SAC contract ID, not TEST_TOKEN_ADDRESS.
  // AddToken passes this contractId to useTokenLookup and then to ChangeTrustInternal;
  // isAssetSac() verifies it against Asset("E2E", SAC_ISSUER).contractId(passphrase).
  await pageTwo.getByRole("textbox").first().fill(SAC_CONTRACT_ID);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Add Token").click();

  const popup = await popupPromise;

  // Belt-and-suspenders page-level stubs on the popup for requests fired after
  // the popup is captured (ChangeTrust data-loading phase).
  await stubIsSacTrue(popup);
  await stubSacTokenDetails(popup);
  await stubFeeStats(popup);
  await stubHorizonAccounts(popup);
  await stubScanAssetSafe(popup);
  await stubScanTx(popup);
  await stubBackendSubmitTx(popup);
  await stubAccountBalances(popup);

  // Wait for the token lookup to resolve (the Confirm button is hidden while
  // isLoading). For a SAC token the Add Token screen shows the Fee and Token
  // address rows (per the Figma design) before the trustline review.
  await expect(popup.getByTestId("AddToken__Metadata__Row__Fee")).toBeVisible({
    timeout: 15000,
  });
  await expect(
    popup.getByTestId("AddToken__Metadata__Row__TokenAddress"),
  ).toBeVisible();
  await expect(popup.getByTestId("add-token-unverified")).toBeVisible();

  // Clicking confirm for a SAC slides in the standard changeTrust review.
  await popup.getByTestId("add-token-approve").click();

  await expect(popup.getByTestId("ChangeTrustInternal__Body")).toBeVisible({
    timeout: 15000,
  });
  await expect(popup.getByText("Add Trustline")).toBeVisible();
});

// Regression test for PR #2869 comment 4859103563: a successful SAC trustline
// could still resolve the dApp's addToken() request as "user rejected" if the
// user clicked Done before the background ADD_TOKEN round-trip finished —
// window.close() raced response(true) and rejectOnWindowClose won, reporting
// a rejection for a trustline that had actually succeeded on-chain. The fix
// makes Done await the in-flight add before closing. This test forces the
// race by artificially delaying the ADD_TOKEN message round-trip and clicking
// Done the instant "Success!" appears — reproducing the race deterministically
// instead of relying on click timing.
test("should not report the dApp request as rejected when Done is clicked immediately after a successful SAC trustline", async ({
  page,
  extensionId,
  context,
}) => {
  test.skip(
    isIntegrationMode,
    "SAC stub injection via addInitScript is not compatible with integration mode",
  );

  // Same SAC-classification stubs as the test above (see its comment for why
  // this init-script approach, rather than context.route(), is required).
  await stubSacViaInitScript(context);

  // Delay ONLY the ADD_TOKEN background round-trip so a same-tick "click Done
  // the moment Success renders" can race ahead of response(true) if Done
  // doesn't await it.
  await delayAddTokenRoundTrip(context);

  await stubIsSacTrue(context);
  await stubSacTokenDetails(context);

  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/addToken",
  );
  await pageTwo.getByRole("textbox").first().fill(SAC_CONTRACT_ID);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Add Token").click();

  const popup = await popupPromise;

  await stubIsSacTrue(popup);
  await stubSacTokenDetails(popup);
  await stubFeeStats(popup);
  await stubHorizonAccounts(popup);
  await stubScanAssetSafe(popup);
  await stubScanTx(popup);
  await stubBackendSubmitTx(popup);
  await stubAccountBalances(popup);

  await expect(popup.getByTestId("AddToken__Metadata__Row__Fee")).toBeVisible({
    timeout: 15000,
  });
  await popup.getByTestId("add-token-approve").click();

  await expect(popup.getByTestId("ChangeTrustInternal__Body")).toBeVisible({
    timeout: 15000,
  });
  await popup.getByRole("button", { name: "Confirm", exact: true }).click();

  // Click Done the instant it appears — no wait between Success rendering and
  // the click, so this races the (artificially delayed) ADD_TOKEN response.
  await expect(
    popup.getByTestId("SubmitTransaction__Title__Success"),
  ).toBeVisible({ timeout: 15000 });
  await popup.getByRole("button", { name: "Done", exact: true }).click();

  // The popup should wait out the delayed round-trip before closing.
  await popup.waitForEvent("close", { timeout: 15000 });

  // The dApp must see the trustline succeed — never "user rejected" — even
  // though Done was clicked before the round-trip had a chance to finish.
  await expect(pageTwo.locator("#result-addToken")).toContainText(
    "Token added:",
    { timeout: 15000 },
  );
  await expect(pageTwo.locator("#result-addToken")).not.toContainText(
    "rejected",
  );
});

test("should not add a SEP-41 token when the domain is not allowed", async ({
  page,
  extensionId,
  context,
}) => {
  if (!isIntegrationMode) {
    await stubIsSac(context);
  }

  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/addToken",
  );
  await pageTwo.getByRole("textbox").first().fill(TEST_TOKEN_ADDRESS);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Add Token").click({ force: true });

  const popup = await popupPromise;

  await expect(
    popup.getByText(
      "play.freighter.app is not currently connected to Freighter",
    ),
  ).toBeVisible();
  await expect(popup.getByTestId("add-token-approve")).toBeDisabled();
  await expectPageToHaveScreenshot({
    page: popup,
    screenshot: "domain-not-allowed-add-token.png",
  });
});

test("should add a verified SEP-41 token without the unverified banner", async ({
  page,
  extensionId,
  context,
}) => {
  await stubIsSac(context);
  // Mark verified (chip shows "Verified"). On `context` so it's set
  // before the popup's initial asset-list fetch.
  await stubVerifiedToken(context, TEST_TOKEN_ADDRESS);

  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/addToken",
  );
  await pageTwo.getByRole("textbox").first().fill(TEST_TOKEN_ADDRESS);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Add Token").click();

  const popup = await popupPromise;

  // Also stub the asset-list on the popup page itself (belt-and-suspenders for
  // requests fired after the popup is captured).
  await stubVerifiedToken(popup, TEST_TOKEN_ADDRESS);

  await expect(popup.getByText("E2E Token")).toBeDefined();
  // Verified token: the verification chip shows "Verified", not "Unverified".
  await expect(popup.getByTestId("add-token-verified")).toBeVisible();
  await expect(popup.getByTestId("add-token-unverified")).toHaveCount(0);
  // Register the close listener BEFORE clicking: window.close() can fire
  // fast enough that waiting for the event after the click races it.
  const popupClosed = popup.waitForEvent("close", { timeout: 15000 });
  await popup.getByTestId("add-token-approve").click();

  // SEP-41 is a one-step flow: a single Confirm click resolves the dApp
  // request AND closes the popup — no separate success screen / Done click.
  await popupClosed;

  await expect(pageTwo.locator("#result-addToken")).toContainText(
    "Token added:",
  );
});

// SAC verified token test: skipped in integration mode for the same reasons as the
// unverified SAC test — stub injection via addInitScript is not compatible with
// integration mode (real backend is used and there is no live SAC on testnet).
test("should add a verified SAC token through the Change Trust review without the unverified banner", async ({
  page,
  extensionId,
  context,
}) => {
  test.skip(
    isIntegrationMode,
    "SAC stub injection via addInitScript is not compatible with integration mode",
  );

  // Inject the SAC stubs (is-sac-contract, token-details) AND the verified
  // asset-list via window.fetch override so they fire before the popup page
  // script runs — withAssetList makes getVerifiedTokens() find SAC_CONTRACT_ID
  // and set isVerifiedToken=true.
  await stubSacViaInitScript(context, { withAssetList: true });

  // context.route() as belt-and-suspenders
  await stubIsSacTrue(context);
  await stubSacTokenDetails(context);
  await stubVerifiedToken(context, SAC_CONTRACT_ID);

  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/addToken",
  );
  await pageTwo.getByRole("textbox").first().fill(SAC_CONTRACT_ID);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo.getByText("Add Token").click();

  const popup = await popupPromise;

  // Belt-and-suspenders page-level stubs on the popup.
  await stubIsSacTrue(popup);
  await stubSacTokenDetails(popup);
  await stubVerifiedToken(popup, SAC_CONTRACT_ID);
  await stubFeeStats(popup);
  await stubHorizonAccounts(popup);
  await stubScanAssetSafe(popup);
  await stubScanTx(popup);
  await stubBackendSubmitTx(popup);
  await stubAccountBalances(popup);

  await expect(popup.getByTestId("AddToken__Metadata__Row__Fee")).toBeVisible({
    timeout: 15000,
  });
  await expect(
    popup.getByTestId("AddToken__Metadata__Row__TokenAddress"),
  ).toBeVisible();
  // Verified SAC token: the verification chip shows "Verified", not "Unverified".
  await expect(popup.getByTestId("add-token-verified")).toBeVisible();
  await expect(popup.getByTestId("add-token-unverified")).toHaveCount(0);

  await popup.getByTestId("add-token-approve").click();

  await expect(popup.getByTestId("ChangeTrustInternal__Body")).toBeVisible({
    timeout: 15000,
  });
  await expect(popup.getByText("Add Trustline")).toBeVisible();
});

test("should get public key when logged out", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Log Out").click();
  await expect(page.getByText("Welcome back")).toBeVisible();

  // open a second tab and go to docs playground
  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/requestAccess",
  );
  await pageTwo.getByText("Request Access").click();

  const popup = await popupPromise;
  await expect(popup.getByText("Welcome back")).toBeVisible();
  await popup.locator("#password-input").fill("My-password123");
  await popup.getByRole("button", { name: "Unlock" }).click();
  await expect(popup.getByText("Connection Request")).toBeVisible();
  await popup.getByTestId("grant-access-connect-button").click();

  await expect(pageTwo.locator("#result-requestAccess")).toHaveText(
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
  );
});

// ── Network validation tests ──────────────────────────────────────────────────

test("should show network mismatch warning when signing auth entry for wrong network", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  // Switch to MainNet so the wallet's expected networkId is the MainNet hash,
  // while AUTH_ENTRY_TO_SIGN embeds the TestNet networkId.
  await switchToMainnet(page);
  await allowDapp({ page });

  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signAuthEntry",
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

  await expect(
    popup.getByText(/The authorization entry is for Test Net/),
  ).toBeVisible();
  await expect(
    popup.getByText(
      "Signing this authorization is not possible at the moment.",
    ),
  ).toBeVisible();
});

test("should block signing an auth entry bound to a different account", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  // Stay on TestNet so the embedded networkId matches (passes the network
  // check) and we reach the bound-address mismatch check. The preimage is
  // bound to GAAQCAIB… which is not the test account.
  await allowDapp({ page });

  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signAuthEntry",
  );
  await pageTwo.getByRole("textbox").first().fill(V2_AUTH_ENTRY_WRONG_ADDRESS);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo
    .getByText("Sign Authorization Entry XDR")
    .click({ force: true });

  const popup = await popupPromise;

  await expect(
    popup.getByText("Freighter is set to a different account"),
  ).toBeVisible();
  await expect(
    popup.getByText(
      "Signing this authorization is not possible at the moment.",
    ),
  ).toBeVisible();
});

test("should show invalid entry warning when auth entry XDR cannot be parsed", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signAuthEntry",
  );
  // TX_TO_SIGN is a TransactionEnvelope XDR — it will fail to parse as HashIdPreimage
  await pageTwo.getByRole("textbox").first().fill(TX_TO_SIGN);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo
    .getByText("Sign Authorization Entry XDR")
    .click({ force: true });

  const popup = await popupPromise;

  await expect(popup.getByText("Invalid Authorization Entry")).toBeVisible();
  await expect(
    popup.getByText("The authorization entry XDR could not be parsed."),
  ).toBeVisible();
});

test("should show invalid entry warning when auth entry is not a Soroban authorization", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signAuthEntry",
  );
  // NON_SOROBAN_AUTH_ENTRY is a valid HashIdPreimage of type OP_ID (6), not sorobanAuthorization
  await pageTwo.getByRole("textbox").first().fill(NON_SOROBAN_AUTH_ENTRY);
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Test SDF Network ; September 2015");
  await pageTwo
    .getByText("Sign Authorization Entry XDR")
    .click({ force: true });

  const popup = await popupPromise;

  await expect(popup.getByText("Invalid Authorization Entry")).toBeVisible();
  await expect(
    popup.getByText(
      "The authorization entry is malformed or contains invalid data.",
    ),
  ).toBeVisible();
});

test("should show network warning when signing message with mismatched network passphrase", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signMessage",
  );
  await pageTwo.getByRole("textbox").first().fill(MSG_TO_SIGN);
  // Wallet is on TestNet; provide MainNet passphrase to trigger network mismatch
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Public Global Stellar Network ; September 2015");
  await pageTwo.getByText("Sign message").click();

  const popup = await popupPromise;

  await expect(
    popup.getByText("The requester expects you to sign this message on"),
  ).toBeVisible();
  // Should show "Main Net" (the mapped network name) instead of the raw passphrase
  await expect(popup.getByText(/Main Net/)).toBeVisible();
  await expect(
    popup.getByText("Signing this message is not possible at the moment."),
  ).toBeVisible();
});

test("should show network mismatch warning when signing transaction for wrong network", async ({
  page,
  extensionId,
  context,
}) => {
  await loginToTestAccount({ page, extensionId, context, isIntegrationMode });
  await allowDapp({ page });

  const pageTwo = await page.context().newPage();
  await pageTwo.waitForLoadState();

  const popupPromise = page.context().waitForEvent("page");
  await pageTwo.goto(
    "https://play.freighter.app/#/extension/playground/signTransaction",
  );
  await pageTwo.getByRole("textbox").first().fill(TX_TO_SIGN);
  // Wallet is on TestNet; provide MainNet passphrase to trigger the mismatch check
  await pageTwo
    .getByRole("textbox")
    .nth(1)
    .fill("Public Global Stellar Network ; September 2015");
  await pageTwo.getByText("Sign Transaction XDR").click();

  const txPopup = await popupPromise;
  await stubAccountBalances(txPopup);
  await txPopup.route("**/scan-tx", async (route) => {
    await route.fulfill({
      json: { data: null, error: null },
    });
  });

  await expect(txPopup.getByText(/trying to sign is on/)).toBeVisible();
  // Should show "Main Net" (the mapped network name) instead of the raw passphrase
  await expect(txPopup.getByText(/Main Net/)).toBeVisible();
});
