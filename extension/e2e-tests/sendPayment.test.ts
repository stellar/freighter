import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import {
  login,
  loginAndFund,
  loginToTestAccount,
  PASSWORD,
} from "./helpers/login";
import { TEST_M_ADDRESS, TEST_TOKEN_ADDRESS } from "./helpers/test-token";
import { sendXlmPayment } from "./helpers/sendPayment";
import { truncatedPublicKey } from "../src/helpers/stellar";

test("Swap doesn't throw error when account is unfunded", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await login({ page, extensionId });

  await page.getByTestId("BottomNav-link-swap").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText(
    "Swap XLM",
  );
});
test("Swap shows correct balances for assets", async ({
  page,
  extensionId,
}) => {
  await page.route("*/**/account-balances/*", async (route) => {
    const json = {
      balances: {
        "FOO:GBHNGLLIE3KWGKCHIKMHJ5HVZHYIK7WTBE4QF5PLAKL4CJGSEU7HZIW5": {
          token: {
            type: "credit_alphanum12",
            code: "FOO",
            issuer: {
              key: "GBHNGLLIE3KWGKCHIKMHJ5HVZHYIK7WTBE4QF5PLAKL4CJGSEU7HZIW5",
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
              "FOO-GBHNGLLIE3KWGKCHIKMHJ5HVZHYIK7WTBE4QF5PLAKL4CJGSEU7HZIW5",
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
        "BAZ:GBHNGLLIE3KWGKCHIKMHJ5HVZHYIK7WTBE4QF5PLAKL4CJGSEU7HZIW5": {
          token: {
            type: "credit_alphanum12",
            code: "BAZ",
            issuer: {
              key: "GBHNGLLIE3KWGKCHIKMHJ5HVZHYIK7WTBE4QF5PLAKL4CJGSEU7HZIW5",
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
              "BAZ-GBHNGLLIE3KWGKCHIKMHJ5HVZHYIK7WTBE4QF5PLAKL4CJGSEU7HZIW5",
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
        "PBT:CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND": {
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
      subentryCount: 14,
      error: {
        horizon: null,
        soroban: null,
      },
    };
    await route.fulfill({ json });
  });
  test.slow();
  await login({ page, extensionId });

  await page.getByTestId("BottomNav-link-swap").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText(
    "Swap XLM",
  );
  await page.getByText("From").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText(
    "Your assets",
  );
  await expect(page.getByText("100 FOO")).toBeVisible();
  await expect(page.getByText("10 BAZ")).toBeVisible();
  await expect(page.getByText("98.997 PBT")).toBeVisible();
  await expect(page.getByText("999 XLM")).toBeVisible();
});
test("Send doesn't throw error when account is unfunded", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await login({ page, extensionId });
  await page.getByTitle("Send Payment").click({ force: true });

  await expect(page.getByText("Send To")).toBeVisible();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText(
    "Send XLM",
  );
});
test("Send doesn't throw error when creating muxed account", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await loginAndFund({ page, extensionId });
  await page.getByTitle("Send Payment").click({ force: true });

  await expect(page.getByText("Send To")).toBeVisible();
  await page
    .getByTestId("send-to-input")
    .fill(
      "MAUPPMNJUS76SG5NA6UXVCSO5HYVAJT422LBISV6LMCX37OIEPDJGAAAAAAAAAAAAF54C",
    );
  await expect(
    page.getByText("The destination account doesn’t exist."),
  ).toBeVisible();
  await page.getByText("Continue").click();

  await expect(page.getByTestId("AppHeaderPageTitle")).toContainText(
    "Send XLM",
  );
  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByText("Continue").click({ force: true });
  await expect(page.getByText("Send Settings")).toBeVisible();
  await page.getByText("Review Send").click();
  await expect(page.getByText("Confirm Send")).toBeVisible({
    timeout: 200000,
  });
});

test("Send XLM payments to recent federated addresses", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });
  await page.getByTitle("Send Payment").click({ force: true });

  await expect(page.getByText("Send To")).toBeVisible();

  await page.getByTestId("send-to-input").fill("freighter.pb*lobstr.co");
  await expect(page.getByTestId("send-to-identicon")).toBeVisible();
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send XLM")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send Settings")).toBeVisible();
  await expect(page.getByTestId("SendSettingsTransactionFee")).toHaveText(
    /[0-9]/,
  );
  await expect(page.getByTestId("SendSettingsTransactionFee")).toContainText(
    "100 XLM",
  );
  await expect(page.getByText("Review Send")).toBeEnabled();
  await page.getByText("Review Send").click();

  await expect(page.getByText("Confirm Send")).toBeVisible();
  await expect(page.getByText("XDR")).toBeVisible();
  await page.getByTestId("transaction-details-btn-send").click();

  await expect(page.getByText("Successfully sent")).toBeVisible({
    timeout: 60000,
  });

  await page.getByText("Done").click();

  await page.getByTitle("Send Payment").click();

  await expect(page.getByText("Send To")).toBeVisible();
  await expect(page.getByText("RECENT")).toBeVisible();
  await page.getByTestId("recent-address-button").click();
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send XLM")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send Settings")).toBeVisible();
  await expect(page.getByTestId("SendSettingsTransactionFee")).toHaveText(
    /[0-9]/,
  );
  await expect(page.getByTestId("SendSettingsTransactionFee")).toContainText(
    "100 XLM",
  );
  await page.getByText("Review Send").click();
  await expect(page.getByText("Confirm Send")).toBeVisible();
  await page.getByTestId("transaction-details-btn-send").click();
  await expect(page.getByText("Successfully sent")).toBeVisible({
    timeout: 60000,
  });
});

test("Send XLM payments from multiple accounts to G Address", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await loginAndFund({ page, extensionId });
  await sendXlmPayment({ page });

  await page.getByTestId("BackButton").click();
  await page.getByTestId("BottomNav-link-account").click();
  await page.getByTestId("AccountHeader__icon-btn").click();
  await page.getByText("Create a new Stellar address").click();

  // test incorrect password
  await page.locator("#password-input").fill("wrong password");
  await page.getByText("Create New Address").click();
  await expect(page.getByText("Incorrect password")).toBeVisible();
  await page.locator("#password-input").fill(PASSWORD);
  await page.getByText("Create New Address").click();

  await expect(page.getByTestId("not-funded")).toBeVisible({
    timeout: 10000,
  });
  await page.getByRole("button", { name: "Fund with Friendbot" }).click();

  await expect(page.getByTestId("account-assets")).toBeVisible({
    timeout: 30000,
  });
  await sendXlmPayment({ page });

  await page.getByTestId("BackButton").click();
  await page.getByTestId("BottomNav-link-account").click();
  await page.getByTestId("AccountHeader__icon-btn").click();

  await page.getByText("Account 1").click();
  await sendXlmPayment({ page });

  await page.getByTestId("BackButton").click();
  await page.getByTestId("BottomNav-link-account").click();
  await page.getByTestId("AccountHeader__icon-btn").click();
  await page.getByText("Import a Stellar secret key").click();

  // test private key account from different mnemonic phrase
  await page
    .locator("#privateKey-input")
    .fill("SDCUXKGHQ4HX5NRX5JN7GMJZUXQBWZXLKF34DLVYZ4KLXXIZTG7Q26JJ");
  // test incorrect password
  await page.locator("#password-input").fill("wrongpassword");
  await page.locator("#authorization-input").click({ force: true });

  await page.getByTestId("import-account-button").click();
  await expect(
    page.getByText("Please enter a valid secret key/password combination"),
  ).toHaveCount(2);
  await page.locator("#password-input").fill(PASSWORD);
  await page.getByTestId("import-account-button").click();

  await sendXlmPayment({ page });
});

test("Send XLM payment to C address", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  // send XLM to C address
  await page.getByTitle("Send Payment").click({ force: true });
  await expect(page.getByText("Send To")).toBeVisible();
  await page.getByTestId("send-to-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send XLM")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send Settings")).toBeVisible();
  await expect(page.getByTestId("SendSettingsTransactionFee")).toHaveText(
    /[0-9]/,
  );
  await page.getByPlaceholder("Memo (optional)").fill("Test memo");
  await page.getByText("Review Send").click();

  await expect(page.getByText("Confirm Send")).toBeVisible({
    timeout: 200000,
  });
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-confirm.png",
  });
  await page.getByTestId("transaction-details-btn-send").click();

  await expect(page.getByText("Successfully sent")).toBeVisible({
    timeout: 60000,
  });

  await page.getByText("Details").click({ force: true });

  await expect(page.getByText("Sent XLM")).toBeVisible();
  await expect(page.getByTestId("asset-amount")).toContainText("0.001");
  await expect(page.getByTestId("memo")).toContainText("Test memo");

  await page.getByTestId("BackButton").click({ force: true });
  await page.getByTestId("BottomNav-link-account").click({ force: true });
});

test("Send XLM payment to M address", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  // send XLM to C address
  await page.getByTitle("Send Payment").click({ force: true });
  await expect(page.getByText("Send To")).toBeVisible();
  await page.getByTestId("send-to-input").fill(TEST_M_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send XLM")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send Settings")).toBeVisible();
  await expect(page.getByTestId("SendSettingsTransactionFee")).toHaveText(
    /[0-9]/,
  );
  await page.getByText("Review Send").click();

  await expect(page.getByText("Confirm Send")).toBeVisible({
    timeout: 200000,
  });
  await expectPageToHaveScreenshot({
    page,
    screenshot: "send-payment-confirm.png",
  });
  await page.getByTestId("transaction-details-btn-send").click();

  await expect(page.getByText("Successfully sent")).toBeVisible({
    timeout: 60000,
  });

  await page.getByText("Details").click({ force: true });

  await expect(page.getByText("Sent XLM")).toBeVisible();
  await expect(page.getByTestId("asset-amount")).toContainText("0.001");
  await expect(page.getByTestId("to-field")).toContainText(
    truncatedPublicKey(TEST_M_ADDRESS),
  );

  await page.getByTestId("BackButton").click({ force: true });
  await page.getByTestId("BottomNav-link-account").click({ force: true });
});

test.skip("Send SAC to C address", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  // add USDC asset
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage Assets").click({ force: true });

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
  await page.getByTestId("BottomNav-link-swap").click({ force: true });
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
  await page.getByTitle("Send Payment").click({ force: true });
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
  await page.getByTestId("BottomNav-link-account").click({ force: true });

  // remove USDC
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage Assets").click({ force: true });
  await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
  await page.getByText("Remove asset").click({ force: true });

  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });
});

test("Send token payment to C address", async ({ page, extensionId }) => {
  test.slow();
  await loginToTestAccount({ page, extensionId });

  // add E2E token
  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Manage Assets").click({ force: true });
  await expect(page.getByText("Your assets")).toBeVisible();
  await page.getByText("Add an asset").click({ force: true });
  await page.getByTestId("search-asset-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByTestId("ManageAssetRowButton").click({ force: true });
  await page.getByTestId("add-asset").dispatchEvent("click");

  // send E2E token to C address
  await page.getByTitle("Send Payment").click({ force: true });
  await page.getByTestId("send-to-input").fill(TEST_TOKEN_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  await page.getByTestId("send-amount-asset-select").click({ force: true });
  await page.getByTestId("Select-assets-row-E2E").click({ force: true });

  await expect(page.getByText("Send E2E")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByText("Send Settings")).toBeVisible();
  await expect(page.getByText("Review Send")).toBeEnabled();
  await page.getByText("Review Send").click();

  await expect(page.getByText("Confirm Send")).toBeVisible();
  await page.getByTestId("transaction-details-btn-send").click();

  await expect(page.getByText("Successfully sent")).toBeVisible({
    timeout: 600000,
  });

  await page.getByText("Details").click({ force: true });

  await expect(page.getByText("Sent E2E")).toBeVisible();
  await expect(page.getByTestId("asset-amount")).toContainText("0.001");
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
    await page.getByText("Manage Assets").click({ force: true });

    await page.getByTestId("ManageAssetRowButton__ellipsis-USDC").click();
    await page.getByText("Remove asset").click();
    await expect(page.getByTestId("account-view")).toBeVisible({
      timeout: 30000,
    });
  }
});
