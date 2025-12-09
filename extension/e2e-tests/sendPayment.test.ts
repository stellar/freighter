import { TransactionBuilder } from "stellar-sdk";
import { test, expect } from "./test-fixtures";
import { login, loginAndFund, loginToTestAccount } from "./helpers/login";
import { TEST_M_ADDRESS, TEST_TOKEN_ADDRESS } from "./helpers/test-token";
import {
  stubAccountBalances,
  stubAccountBalancesE2e,
  stubAccountHistory,
  stubTokenDetails,
  stubTokenPrices,
  stubContractSpec,
  stubMemoRequiredAccounts,
} from "./helpers/stubs";

const MUXED_ACCOUNT_ADDRESS =
  "MCQ7EGW7VXHI4AKJAFADOIHCSK2OCVA42KUETUK5LQ3LVSEQEEKP6AAAAAAAAAAAAFLVY";

test("Swap doesn't throw error when account is unfunded", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await login({ page, extensionId });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");
});
test("Swap shows correct balances for assets", async ({
  page,
  extensionId,
}) => {
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await page.route("*/**/account-balances/*", async (route) => {
    const json = {
      balances: {
        "FOO:GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY": {
          token: {
            type: "credit_alphanum12",
            code: "FOO",
            issuer: {
              key: "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
            },
          },
          sellingLiabilities: "0",
          buyingLiabilities: "0",
          total: "100",
          limit: "922337203685.4775807",
          available: "100",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address:
              "FOO-GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
            metadata: {
              external_links: {},
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {
              top_holders: [],
            },
          },
        },
        "BAZ:GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY": {
          token: {
            type: "credit_alphanum12",
            code: "BAZ",
            issuer: {
              key: "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
            },
          },
          sellingLiabilities: "0",
          buyingLiabilities: "0",
          total: "10",
          limit: "922337203685.4775807",
          available: "10",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address:
              "BAZ-GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
            metadata: {
              external_links: {},
            },
            fees: {},
            features: [
              {
                feature_id: "HIGH_REPUTATION_TOKEN",
                type: "Benign",
                description: "Token with verified high reputation",
              },
            ],
            trading_limits: {},
            financial_stats: {
              top_holders: [],
            },
          },
        },
        native: {
          token: {
            type: "native",
            code: "XLM",
          },
          total: "999",
          available: "999",
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
        "PBT:GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY": {
          token: {
            code: "PBT",
            issuer: {
              key: "CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND",
            },
          },
          contractId:
            "CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND",
          symbol: "PBT",
          decimals: 5,
          total: "9899700",
          available: "9899700",
          blockaidData: {
            result_type: "Benign",
            malicious_score: "0.0",
            attack_types: {},
            chain: "stellar",
            address:
              "PBT-CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND",
            metadata: {
              external_links: {},
            },
            fees: {},
            features: [],
            trading_limits: {},
            financial_stats: {
              top_holders: [],
            },
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
  test.slow();
  await login({ page, extensionId });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");
  // Click on source asset tile to see asset list
  await page.getByTestId("swap-src-asset-tile").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText(
    "Swap from",
  );
  await expect(page.getByText(/FOO/)).toBeVisible();
  await expect(page.getByTestId("FOO-balance")).toContainText("100");
  await expect(page.getByTestId("BAZ-balance")).toContainText("10");
  await expect(page.getByTestId("PBT-balance")).toContainText("98.997");
  await expect(page.getByTestId("XLM-balance")).toContainText("998");
});
test("Send doesn't throw error when account is unfunded", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await login({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
});
test("Send doesn't throw error when creating muxed account", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await loginAndFund({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page.getByTestId("send-to-input").fill(MUXED_ACCOUNT_ADDRESS);
  await expect(
    page.getByText("The destination account doesn’t exist."),
  ).toBeVisible();
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByText("Review Send").click({ force: true });
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });
});

test("Send can review formatted inputs", async ({ page, extensionId }) => {
  test.slow();
  await loginAndFund({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page.getByTestId("send-to-input").fill(MUXED_ACCOUNT_ADDRESS);
  await expect(
    page.getByText("The destination account doesn’t exist."),
  ).toBeVisible();
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1000");
  await page.getByText("Review Send").click({ force: true });
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });
});

test("Send persists inputs and submits to network", async ({
  page,
  extensionId,
}) => {
  test.slow();
  let isScanSkiped = false;
  page.on("request", (request) => {
    if (
      request
        .url()
        .includes("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF")
    ) {
      isScanSkiped = request.url().includes("should_skip_scan=true");
    }
  });

  await loginAndFund({ page, extensionId });
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
  await page.getByTestId("send-amount-btn-memo").click();
  await page.getByTestId("edit-memo-input").fill("test memo");
  await page.getByText("Save").click();
  await page.getByTestId("send-amount-btn-fee").click();
  await page.getByTestId("edit-tx-settings-fee-input").fill("0.00009");
  await page.getByText("Save").click();
  await page.getByText("Review Send").click({ force: true });
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
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
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);

  test.slow();
  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page.getByTestId("send-to-input").fill("freighter.pb*lobstr.co");
  await expect(page.getByTestId("send-to-identicon")).toBeVisible();
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByText("Review Send").click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible();
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

  await page.getByTestId("address-tile").click();

  await expect(page.getByText("Recents")).toBeVisible();

  await page.getByTestId("recent-address-button").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByText("Review Send").click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible();

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

test("Send XLM payment to C address", async ({ page, extensionId }) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);

  test.slow();
  await loginToTestAccount({ page, extensionId });

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

  await expect(page.getByTestId("SubmitAction")).toBeVisible({
    timeout: 60000,
  });
  await page.getByTestId(`SubmitAction`).click({ force: true, timeout: 60000 });

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

test("Send XLM payment to M address", async ({ page, extensionId }) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);

  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page.getByTestId("send-to-input").fill(TEST_M_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await page.getByText("Review Send").click();

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

test.skip("Send SAC to C address", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  // add USDC asset
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage assets").click({ force: true });

  await page.getByText("Add an asset").click({ force: true });
  await page
    .getByTestId("search-asset-input")
    .fill("GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5");
  await expect(page.getByText("USDC")).toBeVisible();

  await page.getByTestId("ManageAssetRowButton").click({ force: true });
  await expect(page.getByTestId("NewAssetWarningAddButton")).toBeVisible({
    timeout: 20000,
  });

  await page.getByText("Add asset").dispatchEvent("click");
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 300000,
  });

  // swap to get some USDC
  await page.getByTestId("nav-link-swap").click({ force: true });
  await expect(page.getByText("Swap")).toBeVisible();

  // Click on destination asset tile to select USDC
  await page.getByTestId("swap-dst-asset-tile").click({ force: true });
  await expect(page.getByText("Swap to")).toBeVisible();
  await page.getByText("USDC").click({ force: true });

  // Back at amount step, fill in amount
  await expect(page.getByText("Swap")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await expect(page.getByTestId("SendAmountRateAmount")).toBeVisible({
    timeout: 20000,
  });

  // Click continue to show review modal, then confirm
  await page.getByText("Continue").click({ force: true });
  await expect(page.getByText("You are swapping")).toBeVisible();
  await page.getByText("Confirm").click({ force: true });

  await expect(page.getByText("Confirm Swap")).toBeVisible();
  await page.getByTestId("transaction-details-btn-send").click({ force: true });

  await expect(page.getByText("Successfully swapped")).toBeVisible({
    timeout: 40000,
  });
  await page.getByText("Done").click({ force: true });

  // send SAC to C address
  await page.getByTestId("nav-link-send").click({ force: true });
  await page.getByTestId("send-to-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await page.getByTestId("send-amount-asset-select").click({ force: true });
  await page.getByTestId("Select-assets-row-USDC").click({ force: true });

  await expect(page.getByText("Send USDC")).toBeVisible();

  await page.getByTestId("SendAmountSetMax").click({ force: true });
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send Settings")).toBeVisible();
  await expect(page.getByText("Review Send")).toBeEnabled();
  await page.getByText("Review Send").click();

  await expect(page.getByText("Confirm Send")).toBeVisible();
  await page.getByTestId("transaction-details-btn-send").click({ force: true });

  await expect(page.getByText("Successfully sent")).toBeVisible({
    timeout: 40000,
  });

  await page.getByText("Details").click({ force: true });

  await expect(page.getByText("Sent USDC")).toBeVisible();

  await page.getByTestId("BackButton").click({ force: true });
  await page.getByTestId("BackButton").click({ force: true });
  await page.getByTestId("BackButton").click({ force: true });
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  // remove USDC
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage assets").click({ force: true });
  await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
  await page.getByText("Remove asset").click({ force: true });

  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
});

test("Send token payment to C address", async ({ page, extensionId }) => {
  await stubTokenDetails(page);
  await stubAccountBalancesE2e(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);

  test.slow();
  await loginToTestAccount({ page, extensionId });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page.getByTestId("send-to-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.locator(".SendAmount__EditDestAsset").click();

  await page
    .getByTestId(`SendRow-E2E:${TEST_TOKEN_ADDRESS}`)
    .click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await page.getByText("Review Send").click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 60000,
  });

  await expect(page.getByTestId("SubmitAction")).toBeVisible({
    timeout: 60000,
  });
  await page.getByTestId(`SubmitAction`).click({ force: true, timeout: 60000 });

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

// Classic token to G address -> Normal (regression test)
test("Send classic token to G address allows memo", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  const G_ADDRESS = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(G_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Add memo - should be enabled for classic token to G address
  await page.getByTestId("send-amount-btn-memo").click();
  await expect(page.getByTestId("edit-memo-input")).toBeVisible();
  await page.getByTestId("edit-memo-input").fill("classic G memo");
  await page.getByText("Save").click();

  // Click Review Send
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Verify memo is shown in review
  await expect(page.getByTestId("review-tx-memo")).toHaveText("classic G memo");
});

// Classic token to M address -> Memo enabled
test("Send classic token to M address allows memo", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(TEST_M_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Add memo - should be enabled for classic token to M address
  await page.getByTestId("send-amount-btn-memo").click();
  await expect(page.getByTestId("edit-memo-input")).toBeVisible();
  // Memo input should not be disabled
  await expect(page.getByTestId("edit-memo-input")).toBeEnabled();
  await page.getByTestId("edit-memo-input").fill("classic M memo");
  await page.getByText("Save").click();

  // Click Review Send
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Verify memo is shown in review (classic transactions support M address + memo)
  await expect(page.getByTestId("review-tx-memo")).toHaveText("classic M memo");
});

// Custom token without Soroban mux support to G -> Memo NOT allowed
test("Send custom token without Soroban mux support to G address disables memo", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalancesE2e(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);

  await loginToTestAccount({ page, extensionId });
  // Stub contract spec to indicate NO muxed support (without Soroban mux support)
  // Set up after login to avoid interfering with initial page load
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, false);
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible({
    timeout: 30000,
  });

  const G_ADDRESS = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(G_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible({
    timeout: 30000,
  });

  // Select custom token
  await page.locator(".SendAmount__EditDestAsset").click();
  await page
    .getByTestId(`SendRow-E2E:${TEST_TOKEN_ADDRESS}`)
    .click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible({
    timeout: 30000,
  });
  await page.getByTestId("send-amount-amount-input").fill(".001");

  // Wait for contract check to complete
  await page.waitForTimeout(2000);

  // Memo button should be enabled, but memo input should be disabled
  // (tokens without Soroban mux support don't support memo)
  const memoButton = page.getByTestId("send-amount-btn-memo");
  await expect(memoButton).toBeEnabled();

  // Click memo button to see disabled message
  await memoButton.click();
  await expect(page.getByTestId("edit-memo-input")).toBeVisible();
  await expect(page.getByTestId("edit-memo-input")).toBeDisabled();
  await expect(
    page.getByText("Memo is not supported for this operation"),
  ).toBeVisible();
  await page.getByText("Cancel").click();

  // Click Review Send - should be enabled (transaction is allowed, just no memo)
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Verify memo row is NOT shown in review (tokens without Soroban mux support don't support memo)
  await expect(page.getByTestId("review-tx-memo")).not.toBeVisible();
});

// Custom token without Soroban mux support to M -> Impossible/disabled
test("Send custom token without Soroban mux support to M address is disabled", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalancesE2e(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);

  await loginToTestAccount({ page, extensionId });
  // Stub contract spec to indicate NO muxed support (without Soroban mux support)
  // Set up after login to avoid interfering with initial page load
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, false);
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(TEST_M_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Select custom token
  await page.locator(".SendAmount__EditDestAsset").click();
  await page
    .getByTestId(`SendRow-E2E:${TEST_TOKEN_ADDRESS}`)
    .click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");

  // Wait for contract check to complete
  await page.waitForTimeout(2000);

  // Verify warning banner is shown
  await expect(
    page.getByText(
      "This token does not support muxed address (M-) as a target destination",
    ),
  ).toBeVisible();

  // Memo button should be enabled, but memo input should be disabled
  const memoButton = page.getByTestId("send-amount-btn-memo");
  await expect(memoButton).toBeEnabled();

  // Verify Review Send button is disabled
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeDisabled();
});

// Custom token with Soroban mux support to G -> Memo can be added
test("Send custom token with Soroban mux support to G address allows memo", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalancesE2e(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);

  await loginToTestAccount({ page, extensionId });
  // Stub contract spec to indicate muxed support (with Soroban mux support)
  // Set up after login to avoid interfering with initial page load
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, true);
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  const G_ADDRESS = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(G_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Select custom token
  await page.locator(".SendAmount__EditDestAsset").click();
  await page
    .getByTestId(`SendRow-E2E:${TEST_TOKEN_ADDRESS}`)
    .click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");

  // Wait for contract check to complete - wait for memo button to be enabled
  // (it might be disabled initially while contract check is in progress)
  const memoButton = page.getByTestId("send-amount-btn-memo");
  await expect(memoButton).toBeEnabled({ timeout: 10000 });

  // Add memo - should be enabled for custom token with Soroban mux support to G address
  await memoButton.click();
  await expect(page.getByTestId("edit-memo-input")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("edit-memo-input")).toBeEnabled({
    timeout: 10000,
  });
  await page.getByTestId("edit-memo-input").fill("soroban mux G memo");
  await page.getByText("Save").click();

  // Click Review Send
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Verify memo is shown in review
  await expect(page.getByTestId("review-tx-memo")).toHaveText(
    "soroban mux G memo",
  );
});

// Custom token with Soroban mux support to M -> Memo disabled (embedded)
test("Send custom token with Soroban mux support to M address disables memo", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalancesE2e(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);

  await loginToTestAccount({ page, extensionId });
  // Stub contract spec to indicate muxed support (with Soroban mux support)
  // Set up after login to avoid interfering with initial page load
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, true);
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(TEST_M_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Select custom token
  await page.locator(".SendAmount__EditDestAsset").click();
  await page
    .getByTestId(`SendRow-E2E:${TEST_TOKEN_ADDRESS}`)
    .click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");

  // Wait for contract check to complete - wait for the memo button to be enabled
  // (it might be disabled initially while contract check is in progress)
  const memoButton = page.getByTestId("send-amount-btn-memo");
  await expect(memoButton).toBeEnabled({ timeout: 10000 });

  // Click memo button to see disabled message
  await memoButton.click();
  await expect(page.getByTestId("edit-memo-input")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("edit-memo-input")).toBeDisabled();
  // Wait for the disabled message to appear
  // The message should appear once the contract check completes
  await expect(
    page.getByText("Memo is disabled for this transaction"),
  ).toBeVisible({ timeout: 15000 });
  await page.getByText("Cancel").click();

  // Click Review Send
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Verify memo row is NOT shown in review (memo is embedded in M address for tokens with Soroban mux support)
  await expect(page.getByTestId("review-tx-memo")).not.toBeVisible();
});

test.afterAll(async ({ page, extensionId }) => {
  if (
    test.info().status !== test.info().expectedStatus &&
    test.info().title === "Send SAC to C address"
  ) {
    // remove trustline in cleanup if Send SAC to C address test failed
    test.slow();
    await loginToTestAccount({ page, extensionId });

    await page.getByTestId("account-options-dropdown").click();
    await page.getByText("Manage assets").click({ force: true });

    await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
    await page.getByText("Remove asset").click();
    await expect(page.getByTestId("account-view")).toBeVisible({
      timeout: 30000,
    });
  }
});

const MEMO_REQUIRED_ADDRESS =
  "GA6SXIZIKLJHCZI2KEOBEUUOFMM4JUPPM2UTWX6STAWT25JWIEUFIMFF";

// Reset environment variables before each memo-related test
// This ensures IS_PLAYWRIGHT is set for memo validation bypass
test.beforeEach(async ({ page }) => {
  await page.evaluate(() => {
    // Ensure IS_PLAYWRIGHT is set for memo validation bypass
    (window as any).IS_PLAYWRIGHT = "true";
  });
});

test("Send payment shows memo required warning when destination requires memo", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Click Review Send to trigger memo validation
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open - this happens after simulation completes
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for the review transaction content to be ready (not in loading state)
  // Check that AddMemoAction is visible (validation complete)
  await expect(page.getByTestId("AddMemoAction")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("Add Memo")).toBeVisible();
});

test("Send payment allows submission after adding memo to memo-required address", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Add memo from SendPayment page
  await page.getByTestId("send-amount-btn-memo").click();
  await page.getByTestId("edit-memo-input").fill("test memo");
  await page.getByText("Save").click();

  // Verify memo was saved and review modal doesn't auto-open
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  expect(await page.getByText("You are sending").isVisible()).toBeFalsy();

  // Click Review Send - this triggers simulation and opens review sheet
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");

  // Wait for button to be enabled (simulation not in progress) before clicking
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });

  // Click the button to start simulation and open review sheet
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open - this happens after simulation completes
  // The simulation may take time, so we wait for the review sheet content
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for the review transaction content to be ready (not in loading state)
  // Check that either SubmitAction or AddMemoAction is visible (validation complete)
  await expect(
    page
      .getByTestId("SubmitAction")
      .or(page.getByTestId("AddMemoAction"))
      .first(),
  ).toBeVisible({
    timeout: 15000,
  });

  // Wait for validation to complete - submit button should be enabled when done
  // (memo already added, so no "Add Memo" button should appear)
  await expect(page.getByTestId("SubmitAction")).toBeEnabled({
    timeout: 5000,
  });

  // Verify review modal opens and "Add Memo" button is not visible (memo already added)
  await expect(page.getByTestId("AddMemoAction")).not.toBeVisible();
  await expect(page.getByTestId("review-tx-memo")).toHaveText("test memo");
});

test("Send payment returns to review modal after adding memo from review flow", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Click Review Send to open review modal
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for memo validation to complete - the "Add Memo" button appears when validation is done
  await expect(page.getByTestId("AddMemoAction")).toBeVisible({
    timeout: 10000,
  });

  // Click Add Memo from review modal
  await page.getByTestId("AddMemoAction").click();

  // Fill and save memo
  await expect(page.getByTestId("edit-memo-input")).toBeVisible();
  await page.getByTestId("edit-memo-input").fill("review memo");
  await page.getByText("Save").click();

  // Verify review modal is reopened after saving memo
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });
  await expect(page.getByTestId("AddMemoAction")).not.toBeVisible();
  await expect(page.getByTestId("review-tx-memo")).toHaveText("review memo");
});

test("Send payment returns to review modal after cancelling memo editor from review flow", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Click Review Send to open review modal
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for memo validation to complete - the "Add Memo" button appears when validation is done
  await expect(page.getByTestId("AddMemoAction")).toBeVisible({
    timeout: 10000,
  });

  // Click Add Memo from review modal
  await page.getByTestId("AddMemoAction").click();

  // Cancel memo editor
  await expect(page.getByTestId("edit-memo-input")).toBeVisible();
  await page.getByText("Cancel").click();

  // Verify review modal is reopened after cancelling and "Add Memo" button is still visible
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });
  await expect(page.getByTestId("AddMemoAction")).toBeVisible();
});

test("Send payment shows memo value directly when memo is added before review", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Add memo before going to review
  await page.getByTestId("send-amount-btn-memo").click();
  await page.getByTestId("edit-memo-input").fill("pre-review memo");
  await page.getByText("Save").click();

  // After saving memo, a simulation is triggered to regenerate XDR with the new memo
  // Wait for the memo editor to close
  await expect(page.getByTestId("edit-memo-input")).not.toBeVisible({
    timeout: 5000,
  });

  // Wait for any loading overlays to disappear
  await page.waitForTimeout(500);

  // Wait for the simulation to complete before clicking Review Send
  // Verify we're still on the send amount page
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Wait for the simulation to complete before clicking Review Send
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 30000 });

  // Click the button to start simulation and open review sheet
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open - this happens after simulation completes
  // The simulation runs, then setIsReviewingTx(true) is called
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for the review transaction content to be ready (not in loading state)
  // Check that SubmitAction is visible (validation complete)
  await expect(page.getByTestId("SubmitAction")).toBeVisible({
    timeout: 15000,
  });

  // Wait for validation to complete - submit button should be enabled when done
  await expect(page.getByTestId("SubmitAction")).toBeEnabled({
    timeout: 5000,
  });

  // Verify review modal opens and shows memo directly, "Add Memo" button is not visible
  await expect(page.getByTestId("AddMemoAction")).not.toBeVisible();
  await expect(page.getByTestId("review-tx-memo")).toHaveText(
    "pre-review memo",
  );
  // Verify the "Send to" button is visible (not "Add Memo")
  await expect(page.getByTestId("SubmitAction")).toBeVisible();
});

test("Send payment shows Add Memo when switching from non-memo-required to memo-required address", async ({
  page,
  extensionId,
}) => {
  test.slow();
  const NON_MEMO_REQUIRED_ADDRESS =
    "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // First, set a non-memo-required address
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(NON_MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Go to review with non-memo-required address
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for validation to complete - submit button should be enabled when done
  await expect(page.getByTestId("SubmitAction")).toBeEnabled({
    timeout: 10000,
  });

  // Verify "Add Memo" button is not visible for non-memo-required address
  await expect(page.getByTestId("AddMemoAction")).not.toBeVisible();

  // Go back to change address
  await page.getByText("Cancel").click();

  // Change to memo-required address
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").clear();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  // Make sure amount is still 1 XLM after switching addresses
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Go to review again with memo-required address
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for memo validation to complete - the "Add Memo" button appears when validation is done
  await expect(page.getByTestId("AddMemoAction")).toBeVisible({
    timeout: 10000,
  });
});

test("Send payment shows Add Memo after cancelling review and returning to memo-required address", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Go to review - should show "Add Memo" button
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for memo validation to complete - the "Add Memo" button appears when validation is done
  await expect(page.getByTestId("AddMemoAction")).toBeVisible({
    timeout: 10000,
  });

  // Cancel review
  await page.getByText("Cancel").click();

  // Wait for review sheet to close completely
  await expect(page.getByText("You are sending")).not.toBeVisible({
    timeout: 5000,
  });

  // Verify we're back on the send amount page
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Ensure amount is still set after cancelling
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("1");

  // Wait a moment for UI to stabilize after modal closes
  await page.waitForTimeout(300);

  // Re-query the button after cancelling (button reference might be stale)
  // Wait for button to be visible and enabled
  await expect(page.getByTestId("send-amount-btn-continue")).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByTestId("send-amount-btn-continue")).toBeEnabled({
    timeout: 10000,
  });

  // Click the button to open review again
  await page.getByTestId("send-amount-btn-continue").click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for memo validation to complete - the "Add Memo" button appears when validation is done
  await expect(page.getByTestId("AddMemoAction")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText("Add Memo")).toBeVisible();
});
