import { test, expect } from "./test-fixtures";
import { login, loginToTestAccount } from "./helpers/login";
import { TEST_TOKEN_ADDRESS } from "./helpers/test-token";
import {
  stubAccountBalancesE2e,
  stubAccountBalancesWithUnfundedDestination,
  stubAccountBalancesWithUSDC,
  stubContractSpec,
  stubScanTxWithUnfundedWarning,
  stubScanTxWithUnfundedNonNativeWarning,
  stubScanTx,
} from "./helpers/stubs";

const isIntegrationMode = process.env.IS_INTEGRATION_MODE === "true";

const MUXED_ACCOUNT_ADDRESS =
  "MCQ7EGW7VXHI4AKJAFADOIHCSK2OCVA42KUETUK5LQ3LVSEQEEKP6AAAAAAAAAAAAFLVY";
const UNFUNDED_DESTINATION =
  "GDMDFPJPFH4Z2LLUCNNQT3HVQ2XU2TMZBA6OL37C752WCKU7JZO2S52R";
const FUNDED_DESTINATION =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

test("Swap doesn't throw error when account is unfunded", async ({
  page,
  extensionId,
}) => {
  await login({ page, extensionId });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");
});
test("Swap shows correct balances for assets", async ({
  page,
  extensionId,
  context,
}) => {
  const stubOverrides = async () => {
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
  };
  test.slow();
  await loginToTestAccount({ page, extensionId, context, stubOverrides });

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
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
});

test("Send XLM below minimum to unfunded destination shows warning", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await page.unroute("**/account-balances/**");
    await stubAccountBalancesWithUnfundedDestination(
      page,
      UNFUNDED_DESTINATION,
    );
    await stubScanTxWithUnfundedWarning(page);
  };
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides,
    isIntegrationMode,
  });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Select address to send to
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(UNFUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

  // Verify amount input is shown
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Enter amount less than 1 XLM
  await page.getByTestId("send-amount-amount-input").fill("0.5");

  // Click Review Send and wait for simulation to complete
  const reviewButton = page.getByText("Review Send");
  await reviewButton.click({ force: true });

  const warningLabel = page.getByTestId("blockaid-miss-label");
  await expect(warningLabel).toBeVisible({ timeout: 30000 });
  await warningLabel.click();

  await expect(
    page.getByText(
      /This is a new account and needs at least 1 XLM to be created/,
    ),
  ).toBeVisible({ timeout: 30000 });

  await expect(page.getByText("Suspicious Request")).toBeVisible();
});

test("Send XLM at minimum to unfunded destination proceeds without warning", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await page.unroute("**/account-balances/**");
    await stubAccountBalancesWithUnfundedDestination(
      page,
      UNFUNDED_DESTINATION,
    );
    // Stub scan-tx to return success (no warning) for 1 XLM to unfunded destination
    await stubScanTx(page);
  };
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides,
    isIntegrationMode,
  });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Select address to send to
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(UNFUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

  // Verify amount input is shown
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Enter exactly 1 XLM (minimum required)
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Click Review Send and wait for simulation to complete
  const reviewButton = page.getByText("Review Send");
  await reviewButton.click({ force: true });

  // Verify "You are sending" review page appears without the unfunded warning
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 30000,
  });

  await expect(page.getByTestId("blockaid-miss-label")).toHaveCount(0);
});

test("Send non-native asset to unfunded destination shows destination missing warning", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await page.unroute("**/account-balances/**");
    // Use combined stub that handles both sender (with USDC) and unfunded destination
    await stubAccountBalancesWithUnfundedDestination(
      page,
      UNFUNDED_DESTINATION,
      {
        "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5": {
          code: "USDC",
          issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
          type: "credit_alphanum4",
          total: "1000.0000000",
          available: "1000.0000000",
          limit: "922337203685.4775807",
        },
      },
    );
    await stubScanTxWithUnfundedNonNativeWarning(page);
  };
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides,
    isIntegrationMode,
  });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Change asset to USDC
  await page.getByTestId("send-amount-edit-dest-asset").click();
  await page.getByText("USDC").click();

  // Select address to send to
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(UNFUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

  // Verify amount input is shown
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Enter USDC amount
  await page.getByTestId("send-amount-amount-input").fill("10");

  // Click Review Send and wait for simulation to complete
  const reviewButton = page.getByText("Review Send");
  await reviewButton.click({ force: true });

  const warningLabel = page.getByTestId("blockaid-miss-label");
  await expect(warningLabel).toBeVisible({ timeout: 30000 });
  await warningLabel.click();

  await expect(
    page.getByText(
      /This is a new account and needs 1 XLM in order to get started/,
    ),
  ).toBeVisible({ timeout: 30000 });

  await expect(page.getByText("Suspicious Request")).toBeVisible();
});

test("Send XLM to funded destination does not show unfunded warning", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  // Don't stub unfunded balances - the default stub will return isFunded: true
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Select address to send to (using funded destination)
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

  // Verify amount input is shown
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Enter amount
  await page.getByTestId("send-amount-amount-input").fill("0.5");

  // Click Review Send and wait for simulation to complete
  const reviewButton = page.getByText("Review Send");
  await reviewButton.click({ force: true });

  // Verify "You are sending" review page appears
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 30000,
  });

  await expect(page.getByTestId("blockaid-miss-label")).toHaveCount(0);
});

test("Send doesn't throw error when creating muxed account", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  const stubOverrides = async () => {
    // Override account-balances to return 0 XLM only for the muxed account address
    await page.route("**/account-balances/**", async (route) => {
      const url = route.request().url();
      const isMuxedAccount = url.includes(
        "GCQ7EGW7VXHI4AKJAFADOIHCSK2OCVA42KUETUK5LQ3LVSEQEEKP7O7B",
      );

      const json = {
        balances: {
          native: {
            token: {
              type: "native",
              code: "XLM",
            },
            total: isMuxedAccount ? "0" : "10000.0000000",
            available: isMuxedAccount ? "0" : "10000.0000000",
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
        },
        isFunded: !isMuxedAccount,
        subentryCount: 0,
        error: {
          horizon: null,
          soroban: null,
        },
      };
      await route.fulfill({ json });
    });
  };

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides,
    isIntegrationMode,
  });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();

  await page.getByTestId("send-to-input").fill(MUXED_ACCOUNT_ADDRESS);
  await expect(
    page.getByText("The destination account doesn't exist."),
  ).toBeVisible();
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  const reviewSendButton = page.getByText("Review Send");
  await expect(reviewSendButton).toBeEnabled({ timeout: 15000 });
  await reviewSendButton.click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });
});

test("Send can review formatted inputs", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  const stubOverrides = async () => {
    // Override account-balances to return 0 XLM only for the muxed account address
    await page.route("**/account-balances/**", async (route) => {
      const url = route.request().url();
      const isMuxedAccount = url.includes(
        "GCQ7EGW7VXHI4AKJAFADOIHCSK2OCVA42KUETUK5LQ3LVSEQEEKP7O7B",
      );

      const json = {
        balances: {
          native: {
            token: {
              type: "native",
              code: "XLM",
            },
            total: isMuxedAccount ? "0" : "10000.0000000",
            available: isMuxedAccount ? "0" : "10000.0000000",
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
        },
        isFunded: !isMuxedAccount,
        subentryCount: 0,
        error: {
          horizon: null,
          soroban: null,
        },
      };
      await route.fulfill({ json });
    });
  };

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides,
    isIntegrationMode,
  });
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

  const reviewSendButton = page.getByText("Review Send");
  await expect(reviewSendButton).toBeEnabled({ timeout: 15000 });
  await reviewSendButton.click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });
});

test.fixme("Send SAC to C address", async ({ page, extensionId, context }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

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

test("SendPayment persists amount and asset when navigating to choose address", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("100");
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("100");

  await page.getByTestId("address-tile").click();
  await expect(page.getByTestId("send-to-input")).toBeVisible();

  await page.getByTestId("BackButton").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("100");
});

test("SendPayment resets amount when user selects new asset", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides,
    isIntegrationMode,
  });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("send-amount-amount-input").fill("50");
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("50");

  await page.locator(".SendAmount__EditDestAsset").click();
  await page.getByText("USDC").first().click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("0");
});

test("SendPayment resets state when navigating back to account", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides,
    isIntegrationMode,
  });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.locator(".SendAmount__EditDestAsset").click();
  await page.getByText("USDC").first().click({ force: true });
  await page.getByTestId("send-amount-amount-input").fill("100");

  await page.getByTestId("address-tile").click();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("BackButton").click();

  await expect(page.getByTestId("account-view")).toBeVisible();

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("0");
  // Verify XLM is selected (more reliable than checking for "0 XLM" text)
  await expect(page.locator(".SendAmount__EditDestAsset")).toContainText("XLM");
});

test("Swap persists amount when navigating to choose source asset", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");

  const amountInput = page.locator('input[type="text"]').first();
  await amountInput.fill("100");
  await expect(amountInput).toHaveValue("100");

  await page.getByTestId("swap-src-asset-tile").click({ force: true });
  await expect(page.getByText("Swap from")).toBeVisible();

  await page.getByTestId("BackButton").click();

  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");
  await expect(amountInput).toHaveValue("100");
});

test("Swap resets amount when user selects new source asset", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides,
    isIntegrationMode,
  });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");

  const amountInput = page.locator('input[type="text"]').first();
  await amountInput.fill("50");
  await expect(amountInput).toHaveValue("50");

  await page.getByTestId("swap-src-asset-tile").click({ force: true });
  await page.getByText("USDC").first().click({ force: true });

  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");
  await expect(amountInput).toHaveValue("0");
});

test("Swap preserves amount when selecting destination asset", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides,
    isIntegrationMode,
  });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");

  const amountInput = page.locator('input[type="text"]').first();
  await amountInput.fill("100");
  await expect(amountInput).toHaveValue("100");

  await page.getByTestId("swap-dst-asset-tile").click({ force: true });
  await page.getByText("USDC").first().click({ force: true });

  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");
  await expect(amountInput).toHaveValue("100");
});

test("Swap resets state when navigating back to account", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides,
    isIntegrationMode,
  });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");

  const amountInput = page.locator('input[type="text"]').first();
  await amountInput.fill("100");

  await page.getByTestId("swap-src-asset-tile").click({ force: true });
  await page.getByText("USDC").first().click({ force: true });

  await page.getByTestId("swap-dst-asset-tile").click({ force: true });
  await page.getByText("XLM").first().click({ force: true });

  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");
  await page.getByTestId("BackButton").click();

  await expect(page.getByTestId("account-view")).toBeVisible();

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText("Swap");

  const newAmountInput = page.locator('input[type="text"]').first();
  await expect(newAmountInput).toHaveValue("0");
  // Verify XLM is selected (more reliable than checking for "0 XLM" text)
  await expect(page.getByTestId("swap-src-asset-tile")).toContainText("XLM");
});

test.afterAll(async ({ page, extensionId, context }) => {
  if (
    test.info().status !== test.info().expectedStatus &&
    test.info().title === "Send SAC to C address"
  ) {
    // remove trustline in cleanup if Send SAC to C address test failed
    test.slow();
    await loginToTestAccount({ page, extensionId, context });

    await page.getByTestId("account-options-dropdown").click();
    await page.getByText("Manage assets").click({ force: true });

    await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
    await page.getByText("Remove asset").click();
    await expect(page.getByTestId("account-view")).toBeVisible({
      timeout: 30000,
    });
  }
});

test("Send token payment from Asset Detail", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesE2e(page);
  };
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, true);

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides,
    isIntegrationMode,
  });
  await page.getByText("E2E").click();

  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("0.123");

  await page.getByTestId("address-tile").click();
  await page
    .getByTestId("send-to-input")
    .fill("GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY");
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue(
    "0.123",
  );

  // confirm that input width stays proportional to amount length
  await expect(page.getByTestId("send-amount-amount-input")).toHaveCSS(
    "width",
    "102px",
  );

  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible();

  await expect(page.getByTestId("SubmitAction")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId("SubmitAction")).toBeEnabled();
});

test("Send XLM payment from Asset Detail", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesE2e(page);
  };
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, true);

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides,
    isIntegrationMode,
  });
  await page.getByText("XLM").click();

  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("0.01");

  await page.getByTestId("address-tile").click();
  await page
    .getByTestId("send-to-input")
    .fill("GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY");
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue(
    "0.01",
  );

  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible();

  await expect(page.getByTestId("SubmitAction")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId("SubmitAction")).toBeEnabled();
});

// Reset environment variables before each memo-related test
// This ensures IS_PLAYWRIGHT is set for memo validation bypass
test.beforeEach(async ({ page }) => {
  await page.evaluate(() => {
    // Ensure IS_PLAYWRIGHT is set for memo validation bypass
    (window as any).IS_PLAYWRIGHT = "true";
  });
});
