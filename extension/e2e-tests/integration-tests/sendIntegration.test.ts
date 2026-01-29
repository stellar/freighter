import { TransactionBuilder } from "stellar-sdk";
import { test, expect } from "../test-fixtures";
import { loginToTestAccount } from "../helpers/login";
import { TEST_M_ADDRESS, TEST_TOKEN_ADDRESS } from "../helpers/test-token";

// test.beforeEach(async ({ page, context }) => {
//   if (!process.env.IS_INTEGRATION_MODE) {
//     await stubAllExternalApis(page, context);
//   }
// });

test("Send persists inputs and submits to network", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  let isScanSkiped = false;

  const stubOverrides = async () => {
    if (!process.env.IS_INTEGRATION_MODE) {
      await page.route("**/submit-tx", async (route) => {
        const json = {
          memo: "test memo",
          max_fee: "900",
          envelope_xdr:
            "AAAAAgAAAADLvQoIbFw9k0tgjZoOrLTuJJY9kHFYp/YAEAlt/xirbAAAA4QAAAUVAAAAvgAAAAEAAAAAAAAAAAAAAABper1qAAAAAQAAAAl0ZXN0IG1lbW8AAAAAAAABAAAAAAAAAAEAAAAAZ4AU5m5lMnKhtnADB3KJkkfNHUcxrSs8TOoG98skg+QAAAAAAAAAAACYloAAAAAAAAAAAf8Yq2wAAABApUEUNnMHzyHA+ZclMfxsX1vv5wfoKegPYhxYnOuiSgit7kCLrVcahgbHAnvb0H+SM0PlZwOxEuaeBJA/B7GdAg==",

          successful: true,
        };
        await route.fulfill({ json });
      });
    }
    page.on("request", (request) => {
      if (
        request
          .url()
          .includes("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF")
      ) {
        isScanSkiped = request.url().includes("should_skip_scan=true");
      }
    });
  };

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");

  await page.getByText("Continue").click();
  expect(isScanSkiped).toBeTruthy();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Add memo
  await page.getByTestId("send-amount-btn-memo").click();
  await page.getByTestId("edit-memo-input").fill("test memo");
  await page.getByText("Save").click();

  // Wait for memo editor to close
  await expect(page.getByTestId("edit-memo-input")).not.toBeVisible({
    timeout: 5000,
  });

  // Add fee
  await page.getByTestId("send-amount-btn-fee").click();
  await page.getByTestId("edit-tx-settings-fee-input").fill("0.00009");
  await page.getByText("Save").click();

  // Wait for fee editor to close
  await expect(page.getByTestId("edit-tx-settings-fee-input")).not.toBeVisible({
    timeout: 5000,
  });

  // Wait for simulation to complete
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 30000 });

  // Click Review Send button
  await reviewSendButton.click();

  // Verify review modal opens
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByTestId("review-tx-send-amount")).toHaveText("1 XLM");
  await expect(page.getByTestId("review-tx-memo")).toHaveText("test memo");
  await expect(page.getByTestId("review-tx-fee")).toHaveText("0.00009 XLM");

  let submitTxResponse = "";
  page.on("response", async (response) => {
    if (response.url().includes("/submit-tx")) {
      submitTxResponse = await response.text();
    }
  });

  await page.getByTestId(`SubmitAction`).click();

  await expect(page.getByText("Sent!")).toBeVisible({
    timeout: 60000,
  });
  const submitTxResponseJson = JSON.parse(submitTxResponse);

  expect(submitTxResponseJson.memo).toBe("test memo");
  expect(submitTxResponseJson.max_fee).toBe("900");

  const tx = TransactionBuilder.fromXDR(
    submitTxResponseJson.envelope_xdr,
    "Test SDF Network ; September 2015",
  );

  const txOp = tx.operations[0] as any;

  expect(txOp.type).toBe("payment");
  expect(txOp.amount).toBe("1.0000000");
  expect(txOp.destination).toBe(
    "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
  );
  expect(txOp.asset.code).toBe("XLM");

  await page.getByText("Done").click();
});

test("Send XLM payments to recent federated addresses", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page.getByTestId("send-to-input").fill("freighter.pb*lobstr.co");
  await expect(page.getByTestId("send-to-identicon")).toBeVisible();
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  const reviewSendButton = page.getByText("Review Send");
  await expect(reviewSendButton).toBeEnabled({ timeout: 15000 });
  await reviewSendButton.click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 60000,
  });
  const submitAction = page.getByTestId("SubmitAction");

  await page.waitForTimeout(300);
  await submitAction.waitFor({ state: "visible" });
  await submitAction.click({ force: true });

  await expect(page.getByText("Sent!")).toBeVisible({
    timeout: 60000,
  });

  await page.getByText("Done").click();
  await page.getByTestId("nav-link-send").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByText("Send to")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await expect(page.getByText("Recents")).toBeVisible();

  await page.getByTestId("recent-address-button").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  const reviewSendButton2 = page.getByText("Review Send");
  await expect(reviewSendButton2).toBeEnabled({ timeout: 15000 });
  await reviewSendButton2.click();

  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 60000,
  });

  await page.waitForTimeout(300);
  await submitAction.waitFor({ state: "visible" });
  await submitAction.click({ force: true });

  let accountBalancesRequestWasMade = false;
  page.on("request", (request) => {
    if (request.url().includes("/account-balances/")) {
      accountBalancesRequestWasMade = true;
    }
  });

  await expect(page.getByText("Sent!")).toBeVisible({
    timeout: 60000,
  });
  expect(accountBalancesRequestWasMade).toBeTruthy();
});

test("Send XLM payment to C address", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page.getByTestId("send-to-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await page.getByText("Review Send").click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 60000,
  });

  const submitAction = page.getByTestId("SubmitAction");

  await page.waitForTimeout(300);
  await submitAction.waitFor({ state: "visible" });
  await submitAction.click({ force: true, timeout: 60000 });

  let accountBalancesRequestWasMade = false;
  page.on("request", (request) => {
    if (request.url().includes("/account-balances/")) {
      accountBalancesRequestWasMade = true;
    }
  });

  await expect(page.getByText("Sent!")).toBeVisible({
    timeout: 60000,
  });
  expect(accountBalancesRequestWasMade).toBeTruthy();
});

test("Send XLM payment to M address", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page.getByTestId("send-to-input").fill(TEST_M_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");

  const reviewSendButton = page.getByText("Review Send");
  await expect(reviewSendButton).toBeEnabled({ timeout: 15000 });
  await reviewSendButton.click();

  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 60000,
  });

  const submitButton = page.getByTestId("SubmitAction");
  await submitButton.scrollIntoViewIfNeeded();
  await submitButton.click();

  let accountBalancesRequestWasMade = false;
  page.on("request", (request) => {
    if (request.url().includes("/account-balances/")) {
      accountBalancesRequestWasMade = true;
    }
  });

  await expect(page.getByText("Sent!")).toBeVisible({
    timeout: 60000,
  });

  expect(accountBalancesRequestWasMade).toBeTruthy();
});

test("Send token payment to C address", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    if (!process.env.IS_INTEGRATION_MODE) {
      await page.route("**/account-balances/**", async (route) => {
        const json = {
          balances: {
            native: {
              token: {
                type: "native",
                code: "XLM",
              },
              total: "10000.0000000",
              available: "10000.0000000",
              sellingLiabilities: "0",
              buyingLiabilities: "0",
              minimumBalance: "1",
              blockaidData: {
                result_type: "Benign",
                malicious_score: "0.0",
                attack_types: {},
                chain: "stellar",
                address: "",
                metadata: {
                  type: "",
                },
                fees: {},
                features: [],
                trading_limits: {},
                financial_stats: {},
              },
            },
            [`E2E:${TEST_TOKEN_ADDRESS}`]: {
              token: {
                code: "E2E",
                issuer: {
                  key: TEST_TOKEN_ADDRESS,
                },
              },
              contractId: TEST_TOKEN_ADDRESS,
              total: "500.0000000",
              available: "500.0000000",
              sellingLiabilities: "0",
              buyingLiabilities: "0",
              minimumBalance: "0.5",
              blockaidData: {
                result_type: "Benign",
                malicious_score: "0.0",
                attack_types: {},
                chain: "stellar",
                address: "",
                metadata: {
                  type: "",
                },
                fees: {},
                features: [],
                trading_limits: {},
                financial_stats: {},
              },
            },
          },
          isFunded: true,
          subentryCount: 0,
          error: {
            horizon: null,
            soroban: null,
          },
        };
        await route.fulfill({ json });
      });
    }
  };
  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  if (process.env.IS_INTEGRATION_MODE) {
    // in integration mode, make sure the token is added first
    await page.getByTestId("account-options-dropdown").click();
    await page.getByText("Manage assets").click();
    await expect(page.getByText("Your assets")).toBeVisible();
    await page.getByText("Add an asset").click({ force: true });
    await page.getByTestId("search-asset-input").fill(TEST_TOKEN_ADDRESS);
    await page.getByTestId("ManageAssetRowButton").click();
    await expect(page.getByTestId("ToggleToken__asset-code")).toHaveText(
      "E2E Token",
    );
    await expect(page.getByTestId("ToggleToken__asset-add-remove")).toHaveText(
      "Add Token",
    );
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(
      page.getByTestId("ManageAssetRowButton__ellipsis-E2E"),
    ).toBeVisible();

    // now go back and make sure the asset is displayed in the account view
    await page.getByTestId("BackButton").click();
    await page.getByTestId("BackButton").click();
    await expect(page.getByTestId("account-view")).toBeVisible();
  }

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page.getByTestId("send-to-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.locator(".SendAmount__EditDestAsset").click();

  await page.getByText("E2E").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await page.getByText("Review Send").click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 60000,
  });

  const submitButton = page.getByTestId("SubmitAction");
  await submitButton.scrollIntoViewIfNeeded();
  await submitButton.click();

  let accountBalancesRequestWasMade = false;
  page.on("request", (request) => {
    if (request.url().includes("/account-balances/")) {
      accountBalancesRequestWasMade = true;
    }
  });

  await expect(page.getByText("Sent!")).toBeVisible({
    timeout: 60000,
  });

  expect(accountBalancesRequestWasMade).toBeTruthy();
});
