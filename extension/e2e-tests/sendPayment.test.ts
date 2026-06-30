import { test, expect } from "./test-fixtures";
import { BrowserContext, Page } from "@playwright/test";
import { login, loginToTestAccount, switchToMainnet } from "./helpers/login";
import { TEST_TOKEN_ADDRESS } from "./helpers/test-token";
import {
  stubAccountBalancesE2e,
  stubAccountBalancesWithUnfundedDestination,
  stubAccountBalancesWithUSDC,
  stubContractSpec,
  stubFederationWithMemo,
  stubScanTxWithUnfundedWarning,
  stubScanTxWithUnfundedNonNativeWarning,
  stubScanTx,
} from "./helpers/stubs";

const MUXED_ACCOUNT_ADDRESS =
  "MCQ7EGW7VXHI4AKJAFADOIHCSK2OCVA42KUETUK5LQ3LVSEQEEKP6AAAAAAAAAAAAFLVY";
const UNFUNDED_DESTINATION =
  "GDMDFPJPFH4Z2LLUCNNQT3HVQ2XU2TMZBA6OL37C752WCKU7JZO2S52R";
const FUNDED_DESTINATION =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

function visibleTokenList(page: Page) {
  return page.locator('[data-testid="token-list"]:visible').first();
}

async function stubSendTokenPrices(context: BrowserContext) {
  await context.route("**/token-prices*", async (route) => {
    const request = route.request();
    let tokenIds = [] as string[];

    if (request.method() === "POST") {
      try {
        const body = await request.postDataJSON();
        tokenIds = body.tokens || [];
      } catch {
        tokenIds = [];
      }
    }

    const data: Record<
      string,
      { currentPrice: string; percentagePriceChange24h: string }
    > = {
      native: {
        currentPrice: "0.4079853099738737",
        percentagePriceChange24h: "1.022345803068746424",
      },
      "USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5": {
        currentPrice: "1.0000000000000000",
        percentagePriceChange24h: "0.0000000000000000",
      },
    };

    for (const id of tokenIds) {
      if (!data[id]) {
        data[id] = {
          currentPrice: "0.4079853099738737",
          percentagePriceChange24h: "1.022345803068746424",
        };
      }
    }

    await route.fulfill({ json: { data } });
  });
}

async function clickVisibleBackButton(page: Page) {
  await page.locator('[data-testid="BackButton"]:visible').first().click();
}

test("Swap doesn't throw error when account is unfunded", async ({
  page,
  extensionId,
}) => {
  await login({ page, extensionId });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("swap-src-asset-tile")).toBeVisible({
    timeout: 10000,
  });
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
  await expect(page.getByTestId("swap-src-asset-tile")).toBeVisible({
    timeout: 15000,
  });
  // Click on source asset tile to see asset list
  await page.getByTestId("swap-src-asset-tile").click();
  await expect(page.getByText("Swap from")).toBeVisible();
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

  await expect(page.getByTestId("token-list")).toBeVisible();
  await page.getByTestId("SendRow-native").click();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
});

test("Blocks sending to your own account (base G... and muxed M...)", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  // The logged-in test account and one of its muxed (M...) forms.
  const OWN_BASE = "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY";
  const OWN_MUXED =
    "MDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWYAAAAAAAAAAAFLVH4";

  await loginToTestAccount({ page, extensionId, context });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("token-list")).toBeVisible();
  await page.getByTestId("SendRow-native").click();

  // Sending to your own base (G...) address is blocked.
  await page.getByTestId("send-to-input").fill(OWN_BASE);
  await expect(page.getByText("You cannot send to yourself")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("send-to-btn-continue")).toHaveCount(0);
  await expect(page.getByTestId("send-amount-amount-input")).toHaveCount(0);

  // Sending to one of your own muxed (M...) addresses is also blocked.
  await page.getByTestId("send-to-input").fill(OWN_MUXED);
  await expect(page.getByText("You cannot send to yourself")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("send-to-btn-continue")).toHaveCount(0);
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
  });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("token-list")).toBeVisible();
  await page.getByTestId("SendRow-native").click();
  await page.getByTestId("send-to-input").fill(UNFUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

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
  });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("token-list")).toBeVisible();
  await page.getByTestId("SendRow-native").click();
  await page.getByTestId("send-to-input").fill(UNFUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

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
  });

  await page.getByTestId("nav-link-send").click({ force: true });
  // Select USDC directly from token picker
  const usdcOption = page
    .locator(
      '[data-testid="SendRow-USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5"], [data-testid="Select-assets-row-USDC"]',
    )
    .first();
  await expect(usdcOption).toBeVisible({ timeout: 10000 });
  await usdcOption.click({ force: true });
  await page.getByTestId("send-to-input").fill(UNFUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

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

  await expect(page.getByTestId("token-list")).toBeVisible();
  await page.getByTestId("SendRow-native").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

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
  });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("token-list")).toBeVisible();
  await page.getByTestId("SendRow-native").click();

  await page.getByTestId("send-to-input").fill(MUXED_ACCOUNT_ADDRESS);
  await expect(
    page.getByText("The destination account doesn't exist."),
  ).toBeVisible({ timeout: 10000 });
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
  });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("token-list")).toBeVisible();
  await page.getByTestId("SendRow-native").click();

  await page.getByTestId("send-to-input").fill(MUXED_ACCOUNT_ADDRESS);
  await expect(
    page.getByText("The destination account doesn't exist."),
  ).toBeVisible({ timeout: 10000 });
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

  // send SAC to C address — follow new linear flow: token picker → destination → amount
  await page.getByTestId("nav-link-send").click({ force: true });
  // Step 1: token picker — select USDC
  await page.getByTestId("Select-assets-row-USDC").click({ force: true });
  // Step 2: destination
  await page.getByTestId("send-to-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByText("Continue").click({ force: true });

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

  await expect(page.getByTestId("token-list")).toBeVisible();
  await page.getByTestId("SendRow-native").click();
  // Fill an address to proceed to AMOUNT
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("100");
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("100");

  // Navigate to address picker from AMOUNT and back
  await page.getByTestId("address-tile").click();
  await expect(page.getByTestId("send-to-input")).toBeVisible();

  await clickVisibleBackButton(page);

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
  });

  await goToTokenAmountStepFromHomeSend(page);

  await page.getByTestId("send-amount-amount-input").fill("50");
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("50");

  // Change token via the token tile on the AMOUNT screen
  await page.getByTestId("send-amount-edit-dest-asset").click();
  await visibleTokenList(page)
    .getByText("USDC", { exact: true })
    .first()
    .click({ force: true });

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
  });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(visibleTokenList(page)).toBeVisible();
  await page.getByTestId("SendRow-native").click();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Change to USDC and enter amount
  await page.getByTestId("send-amount-edit-dest-asset").click();
  await visibleTokenList(page)
    .getByText("USDC", { exact: true })
    .first()
    .click({ force: true });
  await page.getByTestId("send-amount-amount-input").fill("100");

  // Press BackButton (X) to exit the flow
  await clickVisibleBackButton(page);

  await expect(page.getByTestId("account-view")).toBeVisible();

  // Re-enter send flow: should start fresh at token picker
  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(visibleTokenList(page)).toBeVisible();
  // Select XLM and navigate to AMOUNT to verify reset state
  await page.getByTestId("SendRow-native").click();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("0");
  // Verify XLM is selected (not USDC from the previous session)
  await expect(page.getByTestId("send-amount-edit-dest-asset")).toContainText(
    "XLM",
  );
});

test("Swap persists amount when navigating to choose source asset", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("swap-src-asset-tile")).toBeVisible({
    timeout: 15000,
  });

  const amountInput = page.locator('input[type="text"]').first();
  await amountInput.fill("100");
  await expect(amountInput).toHaveValue("100");

  await page.getByTestId("swap-src-asset-tile").click({ force: true });
  await expect(page.getByText("Swap from")).toBeVisible();

  await clickVisibleBackButton(page);

  await expect(page.getByTestId("swap-src-asset-tile")).toBeVisible({
    timeout: 15000,
  });
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
  });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("swap-src-asset-tile")).toBeVisible({
    timeout: 15000,
  });

  const amountInput = page.locator('input[type="text"]').first();
  await amountInput.fill("50");
  await expect(amountInput).toHaveValue("50");

  await page.getByTestId("swap-src-asset-tile").click({ force: true });
  await page.getByText("USDC").first().click({ force: true });

  await expect(page.getByTestId("swap-src-asset-tile")).toBeVisible({
    timeout: 15000,
  });
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
  });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("swap-src-asset-tile")).toBeVisible({
    timeout: 15000,
  });

  const amountInput = page.locator('input[type="text"]').first();
  await amountInput.fill("100");
  await expect(amountInput).toHaveValue("100");

  await page.getByTestId("swap-dst-asset-tile").click({ force: true });
  await page.getByText("USDC").first().click({ force: true });

  await expect(page.getByTestId("swap-src-asset-tile")).toBeVisible({
    timeout: 15000,
  });
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
  });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("swap-src-asset-tile")).toBeVisible();

  const amountInput = page.locator('input[type="text"]').first();
  await amountInput.fill("100");

  await page.getByTestId("swap-src-asset-tile").click({ force: true });
  await page.getByText("USDC").first().click({ force: true });

  await page.getByTestId("swap-dst-asset-tile").click({ force: true });
  await page.getByText("XLM").first().click({ force: true });

  await expect(page.getByTestId("swap-src-asset-tile")).toBeVisible();
  await clickVisibleBackButton(page);

  await expect(page.getByTestId("account-view")).toBeVisible();

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("swap-src-asset-tile")).toBeVisible();

  const newAmountInput = page.locator('input[type="text"]').first();
  await expect(newAmountInput).toHaveValue("0");
  // Verify XLM is selected (more reliable than checking for "0 XLM" text)
  await expect(page.getByTestId("swap-src-asset-tile")).toContainText("XLM");
});

test("Send flow starts at token picker and proceeds to amount screen", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-send").click({ force: true });

  // Step 1: token picker
  await expect(visibleTokenList(page)).toBeVisible();
  await expect(page.getByTestId("send-amount-amount-input")).toHaveCount(0);

  // Step 2: select XLM → DESTINATION
  await page.getByTestId("SendRow-native").click();
  await expect(page.getByTestId("send-to-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-amount-input")).toHaveCount(0);

  // Step 3: fill address and continue → AMOUNT
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
});

test("Send flow from asset detail starts at destination step", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesE2e(page);
  };
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, true);
  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  await page.getByText("E2E").click();
  await page.getByTestId("asset-detail-send-button").click();

  // Asset detail pre-selects asset via ?asset= param → starts at DESTINATION
  await expect(page.getByTestId("send-to-input")).toBeVisible();
  // Token picker must NOT be visible (asset was pre-selected)
  await expect(page.getByTestId("token-list")).toHaveCount(0);
  // Amount screen must NOT be visible yet
  await expect(page.getByTestId("send-amount-amount-input")).toHaveCount(0);
});

test("Send flow change recipient from amount screen dismisses back", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  // Navigate to AMOUNT screen
  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(visibleTokenList(page)).toBeVisible();
  await page.getByTestId("SendRow-native").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Click address tile to change recipient — DESTINATION slides in from bottom
  await page.getByTestId("address-tile").click();
  await expect(page.getByTestId("send-to-input")).toBeVisible();

  // Back dismisses back to AMOUNT
  await clickVisibleBackButton(page);
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
});

test("Send flow change token from amount screen dismisses back", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };
  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await switchToMainnet(page);

  // Navigate to AMOUNT screen
  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(visibleTokenList(page)).toBeVisible();
  await page.getByTestId("SendRow-native").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Click token tile to change asset — token picker slides in from bottom
  await page.getByTestId("send-amount-edit-dest-asset").click();
  // Should now show token list (no tabs, inline list)
  await expect(visibleTokenList(page)).toBeVisible();

  // Back dismisses back to AMOUNT
  await clickVisibleBackButton(page);
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
});

// Regression: useSendQueryParams used to include transactionData.asset in its
// dependency array, so picking a new asset re-ran the effect, re-read the
// stale `?asset=` from the URL, and dispatched saveAsset() — reverting the
// user's pick back to the original asset that was set by Token Details.
test("Send flow from token detail allows changing the pre-selected asset", async ({
  page,
  extensionId,
  context,
}) => {
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };
  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await switchToMainnet(page);

  // Enter Send via XLM token detail → ?asset=native pre-selects XLM and the
  // flow lands directly on DESTINATION. Click the asset-code text inside the
  // first account-assets-item row to open the asset detail sheet.
  await page
    .getByTestId("account-assets-item")
    .filter({ hasText: "XLM" })
    .first()
    .click();
  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-to-input")).toBeVisible({
    timeout: 10000,
  });

  // Continue → AMOUNT screen with XLM selected.
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-edit-dest-asset")).toContainText(
    "XLM",
  );

  // Open the token picker and pick USDC.
  await page.getByTestId("send-amount-edit-dest-asset").click();
  await expect(visibleTokenList(page)).toBeVisible();
  await visibleTokenList(page)
    .getByText("USDC", { exact: true })
    .first()
    .click({ force: true });

  // The asset selector must reflect USDC (not the pre-selected XLM).
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-edit-dest-asset")).toContainText(
    "USDC",
  );
  await expect(
    page.getByTestId("send-amount-edit-dest-asset"),
  ).not.toContainText("XLM");
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
  });
  await page.getByText("E2E").click();

  await page.getByTestId("asset-detail-send-button").click();
  // Asset detail navigates with ?asset= param, so we land at DESTINATION (not token picker)
  await expect(page.getByTestId("send-to-input")).toBeVisible();
  await page
    .getByTestId("send-to-input")
    .fill("GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY");
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("0.123");
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue(
    "0.123",
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
  });
  await page.getByText("XLM").click();

  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-to-input")).toBeVisible();
  await page
    .getByTestId("send-to-input")
    .fill("GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY");
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("0.01");
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

// --- Federation address memo tests (SEP-0002) ---
// These tests stub the federation server endpoint that is already intercepted by
// the default stubAllExternalApis setup. stubFederationWithMemo overrides that
// stub to inject memo / memo_type fields in the federation response.
//
// Navigation flow for the Send screen:
//   nav-link-send  →  SendAmount (send-amount-amount-input)
//   address-tile   →  SendTo     (send-to-input)
//   Continue       →  SendAmount (send-amount-btn-memo)

// The default federation stub (stubFederation) resolves "freighter.pb*lobstr.co"
// to GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF without a memo.
// We use the same address so the stellar.toml stub (pointing to lobstr.co) works.
const FEDERATION_ADDRESS = "freighter.pb*lobstr.co";

// Navigates the new linearized flow: home → token list → fill federation
// address → AMOUNT screen. Use before the federation assertions below.
async function goToAmountViaFederationAddress(
  page: Page,
  federationAddress: string,
) {
  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(visibleTokenList(page)).toBeVisible({ timeout: 10000 });
  await page.getByTestId("SendRow-native").first().click();
  await expect(page.getByTestId("send-to-input")).toBeVisible({
    timeout: 10000,
  });
  await page.getByTestId("send-to-input").fill(federationAddress);
  await expect(page.getByTestId("send-to-btn-continue")).toBeVisible({
    timeout: 10000,
  });
  await page.getByTestId("send-to-btn-continue").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible({
    timeout: 10000,
  });
}

test("Federation address with text memo pre-populates memo field", async ({
  page,
  extensionId,
  context,
}) => {
  const stubOverrides = async () => {
    await stubFederationWithMemo(page, {
      stellar_address: FEDERATION_ADDRESS,
      account_id: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
      memo: "payment-ref-42",
      memo_type: "text",
    });
  };

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await goToAmountViaFederationAddress(page, FEDERATION_ADDRESS);

  await page.getByTestId("send-amount-btn-memo").click();
  await expect(page.getByTestId("edit-memo-input")).toHaveValue(
    "payment-ref-42",
  );
});

test("Federation address with id memo pre-populates memo field", async ({
  page,
  extensionId,
  context,
}) => {
  const stubOverrides = async () => {
    await stubFederationWithMemo(page, {
      stellar_address: FEDERATION_ADDRESS,
      account_id: "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF",
      memo: "12345",
      memo_type: "id",
    });
  };

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await goToAmountViaFederationAddress(page, FEDERATION_ADDRESS);

  await page.getByTestId("send-amount-btn-memo").click();
  await expect(page.getByTestId("edit-memo-input")).toHaveValue("12345");
});

test("Federation address with invalid account_id shows error notification", async ({
  page,
  extensionId,
  context,
}) => {
  const stubOverrides = async () => {
    await stubFederationWithMemo(page, {
      account_id: "not-a-valid-stellar-key",
    });
  };

  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(visibleTokenList(page)).toBeVisible({ timeout: 10000 });
  await page.getByTestId("SendRow-native").first().click();
  await expect(page.getByTestId("send-to-input")).toBeVisible({
    timeout: 10000,
  });
  await page.getByTestId("send-to-input").fill(FEDERATION_ADDRESS);

  // The error notification should appear with the validation message
  await expect(
    page.getByText("Federation server returned an invalid address"),
  ).toBeVisible({ timeout: 10000 });
});

test("Switching from federation address to regular address clears memo", async ({
  page,
  extensionId,
  context,
}) => {
  const federationAccountId =
    "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

  const stubOverrides = async () => {
    await stubAccountBalancesE2e(page);
    await stubFederationWithMemo(page, {
      account_id: federationAccountId,
      memo: "test-memo-123",
      memo_type: "text",
      stellar_address: FEDERATION_ADDRESS,
    });
  };

  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  // Scenario 1: Federation address with memo
  await goToAmountViaFederationAddress(page, FEDERATION_ADDRESS);

  // Verify memo is set from federation
  await page.getByTestId("send-amount-btn-memo").click();
  await expect(page.getByTestId("edit-memo-input")).toHaveValue(
    "test-memo-123",
  );

  // Save and close memo modal by pressing Enter
  await page.getByTestId("edit-memo-input").press("Enter");
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible({
    timeout: 10000,
  });

  // Now switch to regular address from the send amount screen via the address tile
  await page.getByTestId("address-tile").click();
  await expect(page.getByTestId("send-to-input")).toBeVisible({
    timeout: 10000,
  });

  // Clear and use regular address
  await page.getByTestId("send-to-input").clear();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);

  await expect(page.getByTestId("send-to-btn-continue")).toBeVisible({
    timeout: 10000,
  });
  await page.getByTestId("send-to-btn-continue").click({ force: true });

  // Verify memo is cleared for regular address
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible({
    timeout: 10000,
  });
  await page.getByTestId("send-amount-btn-memo").click();
  await expect(page.getByTestId("edit-memo-input")).toHaveValue("");
});

test("Federation address with hash memo type prepopulates memo", async ({
  page,
  extensionId,
  context,
}) => {
  const federationAccountId =
    "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
  // SEP-0002 specifies hash memos as base64-encoded 32-byte values
  const hashMemo = "A".repeat(43) + "=";

  const stubOverrides = async () => {
    await stubAccountBalancesE2e(page);
    await stubFederationWithMemo(page, {
      account_id: federationAccountId,
      memo: hashMemo,
      memo_type: "hash",
      stellar_address: FEDERATION_ADDRESS,
    });
  };

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await goToAmountViaFederationAddress(page, FEDERATION_ADDRESS);

  // Verify memo type is set to hash and memo value matches
  await page.getByTestId("send-amount-btn-memo").click();
  await expect(page.getByTestId("edit-memo-input")).toHaveValue(hashMemo);
});

// ============================================================================
// Navigation & Multi-Step Flow Tests
// ============================================================================
// Tests for send flow navigation, state management, and complex user journeys

async function goToTokenAmountStepFromHomeSend(page: Page) {
  await page.getByTestId("nav-link-send").click({ force: true });

  const tokenList = page.locator('[data-testid="token-list"]:visible').first();
  const destinationInput = page.getByTestId("send-to-input");

  await Promise.race([
    tokenList.waitFor({ state: "visible", timeout: 10000 }).catch(() => null),
    destinationInput
      .first()
      .waitFor({ state: "visible", timeout: 10000 })
      .catch(() => null),
  ]);

  await expect(page).toHaveURL(/\/account\/sendPayment/);

  if (await tokenList.isVisible()) {
    await page.getByTestId("SendRow-native").first().click();
  }

  await expect(destinationInput).toBeVisible({ timeout: 10000 });

  await destinationInput.fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
}

async function goToAssetDetail(page: Page) {
  await page.getByText("E2E").first().click({ force: true });
  await expect(page.getByTestId("asset-detail-send-button")).toBeVisible();
}

async function goToCollectibleDetail(page: Page) {
  await page.getByTestId("account-tab-collectibles").click();
  await page.getByTestId("account-collectible-image").first().click();
  await expect(page.getByTestId("CollectibleDetail")).toBeVisible();
}

async function goToCollectibleReviewStep(page: Page) {
  await page
    .locator('[data-testid="send-to-input"]:visible')
    .first()
    .fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("SelectedCollectible")).toBeVisible();
}

test("Send flow navigation: home to amount to back returns to account home", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  // Initiate send from home account screen
  await goToTokenAmountStepFromHomeSend(page);

  // Close send flow from amount step
  await clickVisibleBackButton(page);

  // Verify return to account home (not token picker)
  await expect(page.getByTestId("account-view")).toBeVisible();
  await expect(page.getByTestId("token-list")).toHaveCount(0);
});

test("Send flow navigation: collectible selection closes to home account", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await stubContractSpec(
    page,
    "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
    true,
  );
  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("token-list")).toBeVisible();
  await expect(page).toHaveURL(/\/account\/sendPayment/);

  await page.getByText("Stellar Frog 1").click();
  await goToCollectibleReviewStep(page);

  // Close from collectible send flow
  await clickVisibleBackButton(page);

  // Verify return to account home
  await expect(page.getByTestId("account-view")).toBeVisible();
  await expect(page.getByTestId("token-list")).toHaveCount(0);
});

test("Send flow navigation: initiate from token detail closes back to token detail", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubAccountBalancesE2e(page);
  };
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, true);

  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  // Navigate to token detail and initiate send
  await goToAssetDetail(page);
  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-to-input")).toBeVisible();
  await expect(page).toHaveURL(/\/account\/sendPayment/);

  // Enter recipient and proceed to amount
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Close send flow and verify return to token detail
  await clickVisibleBackButton(page);
  await expect(page).toHaveURL(/tab=tokens&asset_detail=/);
  await expect(page.getByTestId("asset-detail-send-button")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "E2E", exact: true }),
  ).toBeVisible();
});

test("Send flow navigation: initiate from collectible detail closes back to collectible detail", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await stubContractSpec(
    page,
    "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
    true,
  );
  await loginToTestAccount({ page, extensionId, context });

  await goToCollectibleDetail(page);
  await page.getByTestId("CollectibleDetail__footer__buttons__send").click();

  // Proceed through collectible send flow
  await goToCollectibleReviewStep(page);
  await expect(page).toHaveURL(/\/account\/sendPayment/);

  // Close and verify return to collectible detail
  await clickVisibleBackButton(page);

  await expect(page).toHaveURL(/tab=collectibles&collection_detail=/);
  await expect(page.getByTestId("CollectibleDetail")).toBeVisible();
  await expect(
    page.getByTestId("CollectibleDetail__footer__buttons__send"),
  ).toBeVisible();
});

// ============================================================================
// Send Flow Workflows
// ============================================================================
// Comprehensive integration tests combining navigation, input handling, and submission

test("Send workflow: navigate, close, re-enter, input, and submit transaction", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  // First send attempt: navigate to amount, enter value, then close
  await goToTokenAmountStepFromHomeSend(page);
  await page.getByTestId("send-amount-amount-input").fill("5.5");
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("5.5");

  // Close send flow
  await clickVisibleBackButton(page);
  await expect(page.getByTestId("account-view")).toBeVisible();

  // Re-enter send flow - clear previous input
  await goToTokenAmountStepFromHomeSend(page);

  // Enter new valid amount (field will auto-clear on new entry)
  await page.getByTestId("send-amount-amount-input").fill("1.234567");
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue(
    "1.234567",
  );

  // Proceed to review and submission
  const reviewButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewButton).toBeEnabled({ timeout: 10000 });
  await reviewButton.click({ force: true });

  // Verify reached review screen
  await expect(page.getByText("You are sending")).toBeVisible();
  await expect(page.getByTestId("SubmitAction")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByTestId("SubmitAction")).toBeEnabled();
});

test("Send workflow: input handling with amounts, formatting, and value boundaries", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await goToTokenAmountStepFromHomeSend(page);

  // Test 1: High value with thousand separators
  await page.getByTestId("send-amount-amount-input").fill("99999999");
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue(
    "99,999,999",
  );

  // Test 2: Non-numeric characters are filtered
  await page.getByTestId("send-amount-amount-input").fill("abc123.45xyz");
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue(
    "123.45",
  );

  // Test 3: Negative sign is stripped
  await page.getByTestId("send-amount-amount-input").fill("-50");
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("50");

  // Test 4: Valid decimal at boundary (7 decimals - Stellar max precision)
  await page.getByTestId("send-amount-amount-input").fill("0.0000001");
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue(
    "0.0000001",
  );
  await page.waitForTimeout(500);

  // Test 5: Zero amount disables continue button
  await page.getByTestId("send-amount-amount-input").fill("0");
  await page.waitForTimeout(500);
  let continueBtn = page.getByTestId("send-amount-btn-continue");
  await expect(continueBtn).toBeDisabled();

  // Test 6: Valid amount enables continue and reaches review
  await page.getByTestId("send-amount-amount-input").fill("2.5");
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("2.5");
  continueBtn = page.getByTestId("send-amount-btn-continue");
  await expect(continueBtn).toBeEnabled({ timeout: 10000 });
  await continueBtn.click({ force: true });

  // Verify transaction review screen
  await expect(page.getByText("You are sending")).toBeVisible();
});

test("Send workflow: 25% amount is preserved across fiat toggle and review", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await stubSendTokenPrices(context);
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };
  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await switchToMainnet(page);

  await goToTokenAmountStepFromHomeSend(page);

  // Set amount via percentage button and capture exact value shown in token mode.
  await page.getByRole("button", { name: "25%" }).click({ force: true });
  const amountInput = page.getByTestId("send-amount-amount-input");
  await expect(amountInput).toBeVisible();
  const amountBeforeToggle = await amountInput.inputValue();
  await expect(amountBeforeToggle).not.toBe("0");

  // Toggle to fiat and back to token.
  const toggleButton = page.locator(".SendAmount__amount-price button").first();
  await expect(toggleButton).toHaveCount(1, { timeout: 15000 });
  await expect(toggleButton).toBeVisible({ timeout: 10000 });
  await toggleButton.click({ force: true });
  await page.waitForTimeout(500);
  await toggleButton.click({ force: true });
  await page.waitForTimeout(500);

  // Exact token input should remain unchanged.
  await expect(amountInput).toHaveValue(amountBeforeToggle);

  // Review modal should use the same exact token value.
  const continueBtn = page.getByTestId("send-amount-btn-continue");
  await expect(continueBtn).toBeEnabled({ timeout: 10000 });
  await continueBtn.click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible();
  await expect(page.getByTestId("review-tx-send-amount")).toContainText(
    `${amountBeforeToggle.replace(/,/g, "")} XLM`,
  );
});

test("Send workflow: typed token amount is preserved across fiat toggle and review", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await stubSendTokenPrices(context);
  const stubOverrides = async () => {
    await stubAccountBalancesWithUSDC(page);
  };
  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await switchToMainnet(page);

  await goToTokenAmountStepFromHomeSend(page);

  const amountInput = page.getByTestId("send-amount-amount-input");
  await expect(amountInput).toBeVisible();

  await amountInput.fill("11");
  await expect(amountInput).toHaveValue("11");

  // Toggle to fiat and back.
  const toggleButton = page.locator(".SendAmount__amount-price button").first();
  await expect(toggleButton).toHaveCount(1, { timeout: 15000 });
  await expect(toggleButton).toBeVisible({ timeout: 10000 });
  await toggleButton.click({ force: true });
  await page.waitForTimeout(500);
  await toggleButton.click({ force: true });
  await page.waitForTimeout(500);

  // Exact typed token amount should be preserved.
  await expect(amountInput).toHaveValue("11");

  // Review modal should receive the preserved exact token amount.
  const continueBtn = page.getByTestId("send-amount-btn-continue");
  await expect(continueBtn).toBeEnabled({ timeout: 10000 });
  await continueBtn.click({ force: true });

  await expect(page.getByText("You are sending")).toBeVisible();
  await expect(page.getByTestId("review-tx-send-amount")).toContainText(
    "11 XLM",
  );
  await expect(page.getByTestId("SubmitAction")).toBeVisible({
    timeout: 15000,
  });
});
