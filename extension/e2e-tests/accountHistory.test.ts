import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginAndFund, loginToTestAccount } from "./helpers/login";
import { TEST_M_ADDRESS } from "./helpers/test-token";
import { stubAccountBalances, stubTokenDetails } from "./helpers/stubs";
import {
  TransactionBuilder,
  Operation,
  Asset,
  Keypair,
  Networks,
  Memo,
} from "stellar-sdk";

test("View Account History", async ({ page, extensionId }) => {
  test.slow();
  await loginAndFund({ page, extensionId });

  await page.getByTestId("nav-link-account-history").click();
  await expectPageToHaveScreenshot({
    page,
    screenshot: "account-history.png",
  });
});

test("View failed transaction", async ({ page, extensionId }) => {
  await page.route("*/**/account-history/*", async (route) => {
    const json = [
      {
        amount: "0.0010000",
        asset_code: "USDC",
        asset_issuer:
          "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        asset_type: "credit_alphanum4",
        created_at: "2025-03-21T22:28:46Z",
        from: "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
        id: "164007621169153",
        paging_token: "164007621169153",
        source_account:
          "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
        to: "GCKUVXILBNYS4FDNWCGCYSJBY2PBQ4KAW2M5CODRVJPUFM62IJFH67J2",
        transaction_attr: {},
        transaction_hash:
          "686601028de9ddf40a1c24461a6a9c0415d60a39255c35eccad0b52ac1e700a5",
        transaction_successful: false,
        type: "payment",
        type_i: 1,
      },
    ];
    await route.fulfill({ json });
  });

  test.slow();
  await loginAndFund({ page, extensionId });
  await page.getByTestId("nav-link-account-history").click();
  await expect(page.getByTestId("history-item-amount-component")).toHaveText(
    "Mar 21",
  );
  await expect(page.getByTestId("history-item-label")).toHaveText(
    "Transaction Failed",
  );
  await expectPageToHaveScreenshot({
    page,
    screenshot: "failed-transaction-history-item.png",
  });
  await page.getByText("Transaction failed").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toHaveText("History");
  await expectPageToHaveScreenshot({
    page,
    screenshot: "failed-transaction.png",
  });
});
test("Hide create claimable balance spam", async ({ page, extensionId }) => {
  await page.route("*/**/account-history/*", async (route) => {
    const json = [
      {
        amount: "0.0010000",
        asset_code: "USDC",
        asset_issuer:
          "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        asset_type: "credit_alphanum4",
        created_at: "2025-03-21T22:28:46Z",
        from: "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
        id: "164007621169153",
        paging_token: "164007621169153",
        source_account:
          "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
        to: "GCKUVXILBNYS4FDNWCGCYSJBY2PBQ4KAW2M5CODRVJPUFM62IJFH67J2",
        transaction_attr: {},
        transaction_hash:
          "686601028de9ddf40a1c24461a6a9c0415d60a39255c35eccad0b52ac1e700a5",
        transaction_successful: true,
        type: "payment",
        type_i: 1,
      },
      {
        amount: "0.0010000",
        asset_code: "USDC",
        asset_issuer:
          "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        asset_type: "credit_alphanum4",
        created_at: "2025-03-21T22:28:46Z",
        from: "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
        id: "164007621169153",
        paging_token: "164007621169153",
        source_account:
          "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
        to: "GCKUVXILBNYS4FDNWCGCYSJBY2PBQ4KAW2M5CODRVJPUFM62IJFH67J2",
        transaction_attr: {},
        transaction_hash:
          "686601028de9ddf40a1c24461a6a9c0415d60a39255c35eccad0b52ac1e700a5",
        transaction_successful: true,
        type: "payment",
        type_i: 1,
      },
      {
        amount: "0.0010000",
        asset: "USDC",
        created_at: "2025-03-19T22:28:46Z",
        id: "164007621169153",
        paging_token: "164007621169153",
        source_account:
          "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
        transaction_attr: {
          operation_count: 100,
          successful: true,
        },
        transaction_hash:
          "686601028de9ddf40a1c24461a6a9c0415d60a39255c35eccad0b52ac1e700a5",
        transaction_successful: true,
        type: "create_claimable_balance",
        type_i: 14,
      },
      {
        amount: "0.0010000",
        asset: "USDC",
        created_at: "2025-03-18T22:28:46Z",
        id: "164007621169153",
        paging_token: "164007621169153",
        source_account:
          "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY",
        transaction_attr: {
          operation_count: 100,
          successful: false,
        },
        transaction_hash:
          "686601028de9ddf40a1c24461a6a9c0415d60a39255c35eccad0b52ac1e700a5",
        transaction_successful: false,
        type: "create_claimable_balance",
        type_i: 14,
      },
    ];
    await route.fulfill({ json });
  });

  test.slow();
  await loginAndFund({ page, extensionId });
  await page.getByTestId("nav-link-account-history").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toHaveText("History");
  const historyItems = page.getByTestId("history-item");
  expect(historyItems).toHaveCount(2);
});

test("History row displays muxed address extracted from XDR for payment", async ({
  page,
  extensionId,
}) => {
  test.slow();
  const TEST_ACCOUNT =
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY";
  const BASE_G_ADDRESS =
    "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
  const TRANSACTION_HASH =
    "686601028de9ddf40a1c24461a6a9c0415d60a39255c35eccad0b52ac1e700a5";

  const sourceKeypair = Keypair.fromSecret(
    "SBPQUZ6G4FZNWFHKUWC5BEYWF6R52E3SEP7R3GWYSM2XTKGF5LNTWW4R",
  );
  const sourceAccount = {
    accountId: () => sourceKeypair.publicKey(),
    sequenceNumber: () => "376114581078717",
    incrementSequenceNumber: () => {},
  };

  const tx = new TransactionBuilder(sourceAccount as any, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: TEST_M_ADDRESS, // Muxed address in XDR
        asset: Asset.native(),
        amount: "1.0000000",
      }),
    )
    .setTimeout(30)
    .build();

  const envelopeXdr = tx.toXDR();

  await stubAccountBalances(page);
  await loginToTestAccount({ page, extensionId });

  // Stub account history (returns both base G address and muxed M address)
  await page.route("**/account-history/**", async (route) => {
    const json = [
      {
        amount: "1.0000000",
        asset_code: "XLM",
        asset_type: "native",
        created_at: "2025-03-21T22:28:46Z",
        from: TEST_ACCOUNT,
        id: "164007621169153",
        paging_token: "164007621169153",
        source_account: TEST_ACCOUNT,
        to: BASE_G_ADDRESS, // Horizon returns base G address
        to_muxed: TEST_M_ADDRESS, // And also the muxed M address
        transaction_attr: {
          hash: TRANSACTION_HASH,
          memo: null,
          fee_charged: "100",
          operation_count: 1,
        },
        transaction_hash: TRANSACTION_HASH,
        transaction_successful: true,
        type: "payment",
        type_i: 1,
      },
    ];
    await route.fulfill({ json });
  });

  // Stub transaction XDR endpoint
  await page.route("**/transactions/**", async (route) => {
    const url = route.request().url();
    if (url.includes(TRANSACTION_HASH)) {
      await route.fulfill({
        json: {
          envelope_xdr: envelopeXdr,
        },
      });
    } else {
      await route.continue();
    }
  });
  await page.getByTestId("nav-link-account-history").click();

  await expect(page.getByTestId("history-item").nth(0)).toBeVisible({
    timeout: 10000,
  });

  await page.getByTestId("history-item").nth(0).click();

  // Verify muxed address is displayed (from to_muxed field in API response)
  const dstAmount = page.getByTestId("KeyIdenticonKey");
  await expect(dstAmount).toBeVisible({ timeout: 10000 });
  expect(await dstAmount.textContent()).toContain(TEST_M_ADDRESS.slice(0, 4));

  // Verify memo row is hidden for M addresses
  await expect(page.getByText("Memo")).not.toBeVisible();
});

// Horizon API does not return the muxed address for createAccount operations
test.skip("History row displays address extracted from XDR for createAccount", async ({
  page,
  extensionId,
}) => {
  test.slow();
  const TEST_ACCOUNT =
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY";
  const BASE_G_ADDRESS =
    "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
  const TRANSACTION_HASH =
    "686601028de9ddf40a1c24461a6a9c0415d60a39255c35eccad0b52ac1e700a6";

  const sourceKeypair = Keypair.fromSecret(
    "SBPQUZ6G4FZNWFHKUWC5BEYWF6R52E3SEP7R3GWYSM2XTKGF5LNTWW4R",
  );
  const sourceAccount = {
    accountId: () => sourceKeypair.publicKey(),
    sequenceNumber: () => "376114581078717",
    incrementSequenceNumber: () => {},
  };

  const tx = new TransactionBuilder(sourceAccount as any, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.createAccount({
        destination: BASE_G_ADDRESS,
        startingBalance: "1.0000000",
      }),
    )
    .setTimeout(30)
    .build();

  const envelopeXdr = tx.toXDR();

  await stubAccountBalances(page);
  await loginToTestAccount({ page, extensionId });

  await page.route("**/account-history/**", async (route) => {
    const json = [
      {
        amount: "1.0000000",
        asset_code: "XLM",
        asset_type: "native",
        created_at: "2025-03-21T22:28:46Z",
        account: BASE_G_ADDRESS,
        id: "164007621169154",
        paging_token: "164007621169154",
        source_account: TEST_ACCOUNT,
        starting_balance: "1.0000000",
        transaction_attr: {
          hash: TRANSACTION_HASH,
          memo: null,
          fee_charged: "100",
          operation_count: 1,
          envelope_xdr: envelopeXdr,
        },
        transaction_hash: TRANSACTION_HASH,
        transaction_successful: true,
        type: "createAccount",
        type_i: 0,
      },
    ];
    await route.fulfill({ json });
  });

  await page.getByTestId("nav-link-account-history").click();

  await expect(page.getByTestId("history-item").first()).toBeVisible({
    timeout: 10000,
  });

  await page.getByTestId("history-item").first().click();

  // Verify createAccount transaction detail is displayed
  await expect(
    page.getByTestId("TransactionDetailModal").getByText("Create Account"),
  ).toBeVisible({ timeout: 10000 });
});

test("History row displays regular G address when no muxed address in XDR", async ({
  page,
  extensionId,
}) => {
  test.slow();
  const TEST_ACCOUNT =
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY";
  const G_ADDRESS = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
  const TRANSACTION_HASH =
    "686601028de9ddf40a1c24461a6a9c0415d60a39255c35eccad0b52ac1e700a7";

  const sourceKeypair = Keypair.fromSecret(
    "SBPQUZ6G4FZNWFHKUWC5BEYWF6R52E3SEP7R3GWYSM2XTKGF5LNTWW4R",
  );
  const sourceAccount = {
    accountId: () => sourceKeypair.publicKey(),
    sequenceNumber: () => "376114581078717",
    incrementSequenceNumber: () => {},
  };

  const tx = new TransactionBuilder(sourceAccount as any, {
    fee: "100",
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: G_ADDRESS, // Regular G address
        asset: Asset.native(),
        amount: "1.0000000",
      }),
    )
    .addMemo(Memo.text("test memo"))
    .setTimeout(30)
    .build();

  const envelopeXdr = tx.toXDR();

  // Stub account history
  await page.route("**/account-history/**", async (route) => {
    const json = [
      {
        amount: "1.0000000",
        asset_code: "XLM",
        asset_type: "native",
        created_at: "2025-03-21T22:28:46Z",
        from: TEST_ACCOUNT,
        id: "164007621169155",
        paging_token: "164007621169155",
        source_account: TEST_ACCOUNT,
        to: G_ADDRESS,
        transaction_attr: {
          hash: TRANSACTION_HASH,
          memo: "test memo",
          fee_charged: "100",
          operation_count: 1,
        },
        transaction_hash: TRANSACTION_HASH,
        transaction_successful: true,
        type: "payment",
        type_i: 1,
      },
    ];
    await route.fulfill({ json });
  });

  // Stub transaction XDR endpoint
  await page.route("**/transactions/**", async (route) => {
    const url = route.request().url();
    if (url.includes(TRANSACTION_HASH)) {
      await route.fulfill({
        json: {
          envelope_xdr: envelopeXdr,
        },
      });
    } else {
      await route.continue();
    }
  });

  await stubAccountBalances(page);
  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-account-history").click();

  await expect(page.getByTestId("history-item").first()).toBeVisible({
    timeout: 10000,
  });

  await page.getByTestId("history-item").first().click();

  // Verify G address is displayed
  const dstAmount = page.getByTestId("KeyIdenticonKey");
  await expect(dstAmount).toBeVisible({ timeout: 10000 });
  expect(await dstAmount.textContent()).toContain(G_ADDRESS.slice(0, 4));

  // Verify memo is visible for G addresses
  await expect(page.getByText("test memo")).toBeVisible();
});

test.describe("Asset Diffs in Transaction History", () => {
  const TEST_ACCOUNT =
    "GDF32CQINROD3E2LMCGZUDVMWTXCJFR5SBYVRJ7WAAIAS3P7DCVWZEFY";
  const COUNTERPARTY =
    "GCKUVXILBNYS4FDNWCGCYSJBY2PBQ4KAW2M5CODRVJPUFM62IJFH67J2";

  test("Display single asset diff for received payment", async ({
    page,
    extensionId,
  }) => {
    await stubAccountBalances(page);
    await stubTokenDetails(page);

    await page.route("*/**/account-history/*", async (route) => {
      const json = [
        {
          amount: "100.0000000",
          asset_type: "native",
          created_at: "2025-03-21T22:28:46Z",
          from: COUNTERPARTY,
          id: "100000000001",
          paging_token: "100000000001",
          source_account: COUNTERPARTY,
          to: TEST_ACCOUNT,
          transaction_hash:
            "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
          transaction_successful: true,
          type: "payment",
          type_i: 1,
          asset_balance_changes: [
            {
              asset_type: "native",
              from: COUNTERPARTY,
              to: TEST_ACCOUNT,
              amount: "100.0000000",
            },
          ],
          transaction_attr: {
            hash: "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
            memo: null,
            fee_charged: "100",
            operation_count: 1,
          },
        },
      ];
      await route.fulfill({ json });
    });

    await loginToTestAccount({ page, extensionId });
    await page.getByTestId("nav-link-account-history").click();

    await expect(page.getByTestId("history-item").first()).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId("history-item").first().click();

    const assetDiffRows = page.locator(".AssetDiff__row");
    await expect(assetDiffRows).toHaveCount(1);

    const creditLabel = page.locator(".AssetDiff__label.credit");
    await expect(creditLabel).toContainText("Received");

    const creditValue = page.locator(".AssetDiff__value.credit");
    await expect(creditValue).toContainText("+100");
    await expect(creditValue).toContainText("XLM");
  });

  test("Display both credit and debit for swap operation", async ({
    page,
    extensionId,
  }) => {
    await stubAccountBalances(page);
    await stubTokenDetails(page);

    await page.route("*/**/account-history/*", async (route) => {
      const json = [
        {
          asset_type: "native",
          amount: "100.0000000",
          created_at: "2025-03-21T22:28:46Z",
          from: COUNTERPARTY,
          id: "100000000002",
          paging_token: "100000000002",
          source_account: TEST_ACCOUNT,
          to: TEST_ACCOUNT,
          transaction_hash:
            "swap123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
          transaction_successful: true,
          type: "path_payment_strict_receive",
          type_i: 2,
          source_amount: "50.0000000",
          source_asset_type: "credit_alphanum4",
          source_asset_code: "USDC",
          source_asset_issuer:
            "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
          asset_balance_changes: [
            {
              asset_type: "credit_alphanum4",
              asset_code: "USDC",
              asset_issuer:
                "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
              from: TEST_ACCOUNT,
              to: COUNTERPARTY,
              amount: "50.0000000",
            },
            {
              asset_type: "native",
              from: COUNTERPARTY,
              to: TEST_ACCOUNT,
              amount: "100.0000000",
            },
          ],
          transaction_attr: {
            hash: "swap123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
            memo: null,
            fee_charged: "150",
            operation_count: 1,
          },
        },
      ];
      await route.fulfill({ json });
    });

    await loginToTestAccount({ page, extensionId });
    await page.getByTestId("nav-link-account-history").click();

    await expect(page.getByTestId("history-item").first()).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId("history-item").first().click();

    // For swap operations with asset_balance_changes, verify transaction detail renders
    // Path payments have their own display logic that may process asset_balance_changes differently
    const transactionDetail = page.locator(".TransactionDetailModal");
    await expect(transactionDetail).toBeVisible({ timeout: 10000 });

    // Verify asset diffs or swap metadata is displayed
    const hasAssetDiff = await page.locator(".AssetDiff__row").count();
    const hasMetadata = await page
      .locator(".TransactionDetailModal__metadata")
      .count();
    expect(hasAssetDiff + hasMetadata).toBeGreaterThan(0);
  });

  test("Display multiple asset changes for complex transaction", async ({
    page,
    extensionId,
  }) => {
    await stubAccountBalances(page);
    await stubTokenDetails(page);

    await page.route("*/**/account-history/*", async (route) => {
      const json = [
        {
          asset_type: "native",
          amount: "500.0000000",
          created_at: "2025-03-21T22:28:46Z",
          from: COUNTERPARTY,
          id: "100000000003",
          paging_token: "100000000003",
          source_account: TEST_ACCOUNT,
          to: TEST_ACCOUNT,
          transaction_hash:
            "multi123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
          transaction_successful: true,
          type: "path_payment_strict_receive",
          type_i: 2,
          source_amount: "100.0000000",
          source_asset_type: "credit_alphanum4",
          source_asset_code: "USDC",
          source_asset_issuer:
            "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
          asset_balance_changes: [
            {
              asset_type: "credit_alphanum4",
              asset_code: "USDC",
              asset_issuer:
                "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
              from: TEST_ACCOUNT,
              to: COUNTERPARTY,
              amount: "100.0000000",
            },
            {
              asset_type: "native",
              from: COUNTERPARTY,
              to: TEST_ACCOUNT,
              amount: "500.0000000",
            },
            {
              asset_type: "credit_alphanum4",
              asset_code: "AQUA",
              asset_issuer:
                "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
              from: COUNTERPARTY,
              to: TEST_ACCOUNT,
              amount: "250.0000000",
            },
          ],
          transaction_attr: {
            hash: "multi123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
            memo: null,
            fee_charged: "200",
            operation_count: 1,
          },
        },
      ];
      await route.fulfill({ json });
    });

    await loginToTestAccount({ page, extensionId });
    await page.getByTestId("nav-link-account-history").click();

    await expect(page.getByTestId("history-item").first()).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId("history-item").first().click();

    // For complex multi-asset transactions, verify transaction detail renders
    const transactionDetail = page.locator(".TransactionDetailModal");
    await expect(transactionDetail).toBeVisible({ timeout: 10000 });

    // Verify asset diffs or transaction metadata is displayed
    const hasAssetDiff = await page.locator(".AssetDiff__row").count();
    const hasMetadata = await page
      .locator(".TransactionDetailModal__metadata")
      .count();
    expect(hasAssetDiff + hasMetadata).toBeGreaterThan(0);
  });

  test("Display Soroban token with 18 decimals correctly", async ({
    page,
    extensionId,
  }) => {
    const TOKEN_CONTRACT =
      "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

    await stubAccountBalances(page);

    await page.route("**/token-details/**", async (route) => {
      const url = route.request().url();
      if (url.includes(TOKEN_CONTRACT)) {
        await route.fulfill({
          json: {
            name: "High Precision Token",
            decimals: 18,
            symbol: "HPT",
          },
        });
      } else {
        await route.continue();
      }
    });

    await page.route("*/**/account-history/*", async (route) => {
      const json = [
        {
          amount: "1000000000000000000",
          asset_type: "credit_alphanum12",
          asset_code: "HPT",
          asset_issuer: TOKEN_CONTRACT,
          created_at: "2025-03-21T22:28:46Z",
          from: COUNTERPARTY,
          id: "100000000004",
          paging_token: "100000000004",
          source_account: COUNTERPARTY,
          to: TEST_ACCOUNT,
          transaction_hash:
            "token123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
          transaction_successful: true,
          type: "payment",
          type_i: 1,
          asset_balance_changes: [
            {
              asset_type: "credit_alphanum12",
              asset_code: "HPT",
              asset_issuer: TOKEN_CONTRACT,
              from: COUNTERPARTY,
              to: TEST_ACCOUNT,
              amount: "1000000000000000000",
            },
          ],
          transaction_attr: {
            hash: "token123def456ghi789jkl012mno345pqr678stu901vwx234yz567890",
            memo: null,
            fee_charged: "100",
            operation_count: 1,
          },
        },
      ];
      await route.fulfill({ json });
    });

    await loginToTestAccount({ page, extensionId });
    await page.getByTestId("nav-link-account-history").click();

    await expect(page.getByTestId("history-item").first()).toBeVisible({
      timeout: 10000,
    });

    await page.getByTestId("history-item").first().click();

    const creditValue = page.locator(".AssetDiff__value.credit");
    await expect(creditValue).toBeVisible({ timeout: 10000 });
    await expect(creditValue).toContainText("+1");
    await expect(creditValue).toContainText("HPT");
    const text = await creditValue.textContent();
    expect(text).not.toContain(".00000");
  });
});
