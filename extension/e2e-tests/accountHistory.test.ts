import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginAndFund, loginToTestAccount } from "./helpers/login";
import { TEST_M_ADDRESS } from "./helpers/test-token";
import { stubAccountBalances } from "./helpers/stubs";
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

  // Stub account history (returns base G address, not M address)
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
        to: BASE_G_ADDRESS, // Horizon returns base G address, not M address
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

  await expect(page.getByTestId("history-item")).toBeVisible({
    timeout: 10000,
  });

  await page.getByTestId("history-item").first().click();

  // Verify muxed address is displayed (extracted from XDR, not Horizon's base G address)
  const dstAmount = page.getByTestId("TransactionDetailModal__dst-amount");
  await expect(dstAmount).toBeVisible({ timeout: 10000 });
  expect(await dstAmount.textContent()).toContain(TEST_M_ADDRESS.slice(0, 4));

  // Verify memo row is hidden for M addresses
  await expect(page.getByText("Memo")).not.toBeVisible();
});

test("History row displays address extracted from XDR for createAccount", async ({
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
        },
        transaction_hash: TRANSACTION_HASH,
        transaction_successful: true,
        type: "createAccount",
        type_i: 0,
      },
    ];
    await route.fulfill({ json });
  });

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

  await expect(page.getByTestId("history-item")).toBeVisible({
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

  await expect(page.getByTestId("history-item")).toBeVisible({
    timeout: 10000,
  });

  await page.getByTestId("history-item").first().click();

  // Verify G address is displayed
  const dstAmount = page.getByTestId("TransactionDetailModal__dst-amount");
  await expect(dstAmount).toBeVisible({ timeout: 10000 });
  expect(await dstAmount.textContent()).toContain(G_ADDRESS.slice(0, 4));

  // Verify memo is visible for G addresses
  await expect(page.getByText("test memo")).toBeVisible();
});
