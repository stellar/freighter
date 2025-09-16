import { test, expect } from "./test-fixtures";
import { login, loginAndFund, loginToTestAccount } from "./helpers/login";
import { TEST_M_ADDRESS, TEST_TOKEN_ADDRESS } from "./helpers/test-token";
import {
  stubAccountBalances,
  stubAccountBalancesE2e,
  stubAccountHistory,
  stubTokenDetails,
  stubTokenPrices,
} from "./helpers/stubs";

const MUXED_ACCOUNT_ADDRESS =
  "MCCRNOIMODZT7HVQA3NM46YMLOBAXMSMHK3XXIN62CTWIPPP3J2E4AAAAAAAAAAAAEIAM";

test("Swap doesn't throw error when account is unfunded", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await login({ page, extensionId });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText(
    "Swap from",
  );
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
          minimumBalance: "8",
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

  await expect(page.getByText("Send")).toBeVisible();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Send");
});
test("Send doesn't throw error when creating muxed account", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await loginAndFund({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByText("Send")).toBeVisible();
  await page.getByTestId("send-to-input").fill(MUXED_ACCOUNT_ADDRESS);
  await expect(
    page.getByText("The destination account doesn’t exist."),
  ).toBeVisible();
  await page.getByText("Continue").click();

  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Send");
  await page.getByTestId(`SendRow-native`).click({ force: true });
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

  await expect(page.getByText("Send")).toBeVisible();
  await page.getByTestId("send-to-input").fill(MUXED_ACCOUNT_ADDRESS);
  await expect(
    page.getByText("The destination account doesn’t exist."),
  ).toBeVisible();
  await page.getByText("Continue").click();

  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Send");
  await page.getByTestId(`SendRow-native`).click({ force: true });
  await page.getByTestId("send-amount-amount-input").fill("1000");
  await page.getByText("Review Send").click({ force: true });
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });
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

  await expect(page.getByText("Send")).toBeVisible();

  await page.getByTestId("send-to-input").fill("freighter.pb*lobstr.co");
  await expect(page.getByTestId("send-to-identicon")).toBeVisible();
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send")).toBeVisible();
  await page.getByTestId(`SendRow-native`).click({ force: true });
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

  await expect(page.getByText("Send")).toBeVisible();
  await expect(page.getByText("Recents")).toBeVisible();
  await page.getByTestId("recent-address-button").click();
  await page.getByTestId(`SendRow-native`).click({ force: true });

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

  // send XLM to C address
  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByText("Send")).toBeVisible();
  await page.getByTestId("send-to-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send")).toBeVisible();
  await page.getByTestId(`SendRow-native`).click({ force: true });
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await page.getByText("Review Send").click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 60000,
  });

  await page.getByTestId(`SubmitAction`).click({ force: true });

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

  // send XLM to C address
  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByText("Send")).toBeVisible();
  await page.getByTestId("send-to-input").fill(TEST_M_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send")).toBeVisible();
  await page.getByTestId(`SendRow-native`).click({ force: true });
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
  await expect(page.getByText("Swap XLM")).toBeVisible();
  await expect(
    page.getByTestId("AssetSelect").filter({ hasText: "USDC" }),
  ).toBeVisible({
    timeout: 20000,
  });
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await expect(page.getByTestId("SendAmountRateAmount")).toBeVisible({
    timeout: 20000,
  });
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Swap Settings")).toBeVisible();
  await expect(page.getByTestId("SendSettingsTransactionFee")).toHaveText(
    /[0-9]/,
  );
  await page.getByText("Review Swap").click({ force: true });

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

  // send E2E token to C address
  await page.getByTestId("nav-link-send").click({ force: true });
  await page.getByTestId("send-to-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send")).toBeVisible();
  await page
    .getByTestId(`SendRow-E2E:${TEST_TOKEN_ADDRESS}`)
    .click({ force: true });
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await page.getByText("Review Send").click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 60000,
  });

  await page.getByTestId(`SubmitAction`).click({ force: true });

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
