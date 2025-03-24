import { test, expect, expectPageToHaveScreenshot } from "./test-fixtures";
import { loginAndFund } from "./helpers/login";

test("View Account History", async ({ page, extensionId }) => {
  test.slow();
  await loginAndFund({ page, extensionId });

  await page.getByTestId("BottomNav-link-account-history").click();
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
  await page.getByTestId("BottomNav-link-account-history").click();
  await expect(page.getByTestId("history-item-amount-component")).toHaveText(
    "N/A",
  );
  await expectPageToHaveScreenshot({
    page,
    screenshot: "failed-transaction-history-item.png",
  });
  await page.getByText("Transaction failed").click();
  await expect(page.getByTestId("AppHeaderPageTitle")).toHaveText(
    "Transaction failed",
  );
  await expectPageToHaveScreenshot({
    page,
    screenshot: "failed-transaction.png",
  });
});
