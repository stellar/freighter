import { loginToTestAccount } from "./helpers/login";
import {
  stubAccountBalances,
  stubAccountHistory,
  stubScanDapp,
  stubScanTx,
  stubSimulateSendCollectible,
  stubTokenDetails,
  stubTokenPrices,
  stubSubmitTx,
  stubCollectiblesUnsuccessfulMetadata,
  stubFeeStats,
  stubAllExternalApis,
} from "./helpers/stubs";
import { test, expect } from "./test-fixtures";

test.beforeEach(async ({ page, context }) => {
  await stubAllExternalApis(page, context);
});

// Review screen navigation and collectible details display issues
test("Send collectible with metadata", async ({ page, extensionId }) => {
  await stubSimulateSendCollectible(page);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00001 XLM",
  );
  await page.getByTestId("send-amount-edit-dest-asset").click();
  await page.getByTestId("account-tab-collectibles").click();
  await page.getByText("Stellar Frog 1").click();

  await expect(page.getByTestId("SelectedCollectible")).toBeVisible();
  await expect(
    page.getByTestId("SelectedCollectible__base-info__row__name__value"),
  ).toHaveText("Stellar Frog 1");
  await expect(
    page.getByTestId(
      "SelectedCollectible__base-info__row__collectionName__value",
    ),
  ).toHaveText("Stellar Frogs");
  await expect(
    page.getByTestId("SelectedCollectible__base-info__row__tokenId__value"),
  ).toHaveText("1");
  await expect(
    page.getByTestId("SelectedCollectible__image").locator("img"),
  ).toHaveAttribute(
    "src",
    "https://nftcalendar.io/storage/uploads/events/2023/5/NeToOQbYtaJILHMnkigEAsA6ckKYe2GAA4ppAOSp.jpg",
  );

  await page.getByTestId("address-tile").click();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  await page.getByText("Review Send").scrollIntoViewIfNeeded();
  await page.getByText("Review Send").click({ force: true });

  // validate that fee is updated in the review screen
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00001 XLM",
  );

  await expect(
    page.getByTestId("review-tx-send-asset-collectible-name"),
  ).toHaveText("Stellar Frog 1");
  await expect(
    page.getByTestId("review-tx-send-asset-collectible-collection-name"),
  ).toHaveText("Stellar Frogs #1");
  await expect(
    page.getByTestId("review-tx-send-destination-address"),
  ).toHaveText("GBTY…JZOF");

  await page.getByTestId("SubmitAction").click();
  await expect(page.getByText("Sent!")).toBeVisible();
  await expect(
    page.getByTestId("sending-transaction-summary-description-label"),
  ).toHaveText("Stellar Frog 1");
  await expect(
    page.getByTestId(
      "sending-transaction-summary-description-label-destination-address",
    ),
  ).toHaveText("GBTY…JZOF");
});

test("Send collectible without metadata", async ({
  page,
  extensionId,
  context,
}) => {
  await stubTokenDetails(page);
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenPrices(page);
  await stubScanDapp(context);
  await stubCollectiblesUnsuccessfulMetadata(page);
  await stubSimulateSendCollectible(page);
  await stubScanTx(page);
  await stubSubmitTx(page);
  await stubFeeStats(page);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00001 XLM",
  );
  await page.getByTestId("send-amount-edit-dest-asset").click();
  await page.getByTestId("account-tab-collectibles").click();
  await page.getByText("Stellar Frogs").click();

  await expect(page.getByTestId("SelectedCollectible")).toBeVisible();
  await expect(
    page.getByTestId("SelectedCollectible__base-info__row__name__value"),
  ).toHaveText("Token #3");
  await expect(
    page.getByTestId(
      "SelectedCollectible__base-info__row__collectionName__value",
    ),
  ).toHaveText("Stellar Frogs");
  await expect(
    page.getByTestId("SelectedCollectible__base-info__row__tokenId__value"),
  ).toHaveText("3");
  await expect(
    page.getByTestId("account-collectible-placeholder"),
  ).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  await page.getByText("Review Send").scrollIntoViewIfNeeded();
  await page.getByText("Review Send").click();

  // validate that fee is updated in the review screen
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00001 XLM",
  );

  await expect(
    page.getByTestId("review-tx-send-asset-collectible-name"),
  ).toHaveText("Token #3");
  await expect(
    page.getByTestId("review-tx-send-asset-collectible-collection-name"),
  ).toHaveText("Stellar Frogs #3");
  await expect(
    page.getByTestId("review-tx-send-destination-address"),
  ).toHaveText("GBTY…JZOF");

  await page.getByTestId("SubmitAction").click();
  await expect(page.getByText("Sent!")).toBeVisible();
  await expect(
    page.getByTestId("sending-transaction-summary-description-label"),
  ).toHaveText("Token #3");
  await expect(
    page.getByTestId(
      "sending-transaction-summary-description-label-destination-address",
    ),
  ).toHaveText("GBTY…JZOF");
});
