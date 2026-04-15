import { loginToTestAccount } from "./helpers/login";
import {
  stubSimulateSendCollectible,
  stubCollectiblesUnsuccessfulMetadata,
  stubContractSpec,
} from "./helpers/stubs";
import { TEST_M_ADDRESS } from "./helpers/test-token";
import { test, expect } from "./test-fixtures";

// Review screen navigation and collectible details display issues
test("Send collectible with metadata", async ({
  page,
  extensionId,
  context,
}) => {
  const stubOverrides = async () => {
    await stubSimulateSendCollectible(page);
  };

  // Stub contract spec with muxed support = true
  await stubContractSpec(
    page,
    "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
    true,
  );

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await page.getByTestId("nav-link-send").click();

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
    "0.00002 XLM",
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
  const stubOverrides = async () => {
    await stubCollectiblesUnsuccessfulMetadata(page);
    await stubSimulateSendCollectible(page);
  };

  // Stub contract spec with muxed support = true
  await stubContractSpec(
    page,
    "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
    true,
  );

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
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
    "0.00002 XLM",
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

// Collectible without Soroban mux support to M -> Impossible/disabled
test("Send collectible to M address when contract doesn't support muxed is disabled", async ({
  page,
  extensionId,
  context,
}) => {
  const stubOverrides = async () => {
    await stubSimulateSendCollectible(page);
  };

  // Stub contract spec with muxed support = false
  await stubContractSpec(
    page,
    "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
    false,
  );

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("send-amount-edit-dest-asset").click();
  await page.getByTestId("account-tab-collectibles").click();
  await page.getByText("Stellar Frog 1").click();

  await expect(page.getByTestId("SelectedCollectible")).toBeVisible();

  // Try to send to M address (muxed address)
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(TEST_M_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  // Wait for contract check to complete - warning banner should appear
  await expect(
    page.getByText(
      "This token does not support muxed address (M-) as a target destination",
    ),
  ).toBeVisible({ timeout: 10000 });

  // Verify Review Send button is disabled when contract doesn't support muxed
  const reviewSendButton = page.getByTestId("send-collectible-btn-continue");
  await expect(reviewSendButton).toBeDisabled();
});

// Collectible with Soroban mux support to M -> Memo disabled (embedded)
test("Send collectible with Soroban mux support to M address disables memo", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const stubOverrides = async () => {
    await stubSimulateSendCollectible(page);
  };
  // Stub contract spec with muxed support = true
  await stubContractSpec(
    page,
    "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
    true,
  );

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("send-amount-edit-dest-asset").click();
  await page.getByTestId("account-tab-collectibles").click();
  await page.getByText("Stellar Frog 1").click();

  await expect(page.getByTestId("SelectedCollectible")).toBeVisible();

  // Send to M address (muxed address)
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(TEST_M_ADDRESS);
  await page.getByText("Continue").click({ force: true });

  // Verify NO warning banner is shown (contract supports muxed)
  await expect(
    page.getByText(
      "This token does not support muxed address (M-) as a target destination",
    ),
  ).not.toBeVisible();

  // Wait for the memo button to be enabled
  const memoButton = page.getByTestId("send-amount-btn-memo");
  await expect(memoButton).toBeEnabled({ timeout: 10000 });

  // Click memo button - memo should be disabled because destination is M address
  await memoButton.click();
  await expect(page.getByTestId("edit-memo-input")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("edit-memo-input")).toBeDisabled();
  await expect(
    page.getByText("Memo is disabled for this transaction"),
  ).toBeVisible({ timeout: 15000 });
  await page.getByText("Cancel").click();

  // Click Review Send
  const reviewSendButton = page.getByTestId("send-collectible-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible();

  // Verify memo row is NOT shown in review (memo is embedded in M address for collectibles with Soroban mux support)
  await expect(page.getByTestId("review-tx-memo")).not.toBeVisible();
});

// Collectible without Soroban mux support to G -> Memo NOT allowed
test("Send collectible without Soroban mux support to G address disables memo", async ({
  page,
  extensionId,
  context,
}) => {
  // Stub contract spec with muxed support = false
  await stubContractSpec(
    page,
    "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
    false,
  );

  await loginToTestAccount({ page, extensionId, context });
  await page.getByTestId("nav-link-send").click({ force: true });

  await page.getByTestId("send-amount-edit-dest-asset").click();
  await page.getByTestId("account-tab-collectibles").click();
  await page.getByText("Stellar Frog 1").click();

  await expect(page.getByTestId("SelectedCollectible")).toBeVisible();

  // Send to G address (regular address, not muxed)
  await page.getByTestId("address-tile").click();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  // Wait for the memo button
  const memoButton = page.getByTestId("send-amount-btn-memo");
  await expect(memoButton).toBeEnabled({ timeout: 10000 });

  // Click memo button - memo should be disabled because destination collectible doesn't support muxed
  await memoButton.click();
  await expect(page.getByTestId("edit-memo-input")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("edit-memo-input")).toBeDisabled();
  await expect(
    page.getByText("Memo is not supported for this operation"),
  ).toBeVisible({ timeout: 15000 });
  await page.getByText("Cancel").click();

  // Click Review Send
  const reviewSendButton = page.getByTestId("send-collectible-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible();

  // Verify memo row is NOT shown in review (collectibles without muxed support disable memo)
  await expect(page.getByTestId("review-tx-memo")).not.toBeVisible();
});

// Collectible with Soroban mux support to G -> Memo can be added
test("Send collectible with Soroban mux support to G address allows memo", async ({
  page,
  extensionId,
  context,
}) => {
  const stubOverrides = async () => {
    await stubSimulateSendCollectible(page);
  };
  // Stub contract spec with muxed support = true
  await stubContractSpec(
    page,
    "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
    true,
  );

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await page.getByTestId("nav-link-send").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("send-amount-edit-dest-asset").click();
  await page.getByTestId("account-tab-collectibles").click();
  await page.getByText("Stellar Frog 1").click();

  await expect(page.getByTestId("SelectedCollectible")).toBeVisible();

  // Send to G address (regular address, not muxed)
  await page.getByTestId("address-tile").click();
  await page
    .getByTestId("send-to-input")
    .fill("GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF");
  await page.getByText("Continue").click({ force: true });

  // Wait for the memo button
  const memoButton = page.getByTestId("send-amount-btn-memo");
  await expect(memoButton).toBeEnabled({ timeout: 10000 });

  // Click memo button - memo SHOULD BE ENABLED because destination is G address and contract supports muxed
  await memoButton.click();
  await expect(page.getByTestId("edit-memo-input")).toBeVisible({
    timeout: 10000,
  });
  // Memo input should be ENABLED (not disabled) for G address with muxed support
  await expect(page.getByTestId("edit-memo-input")).toBeEnabled();

  // Enter a memo
  await page.getByTestId("edit-memo-input").fill("Test memo for collectible");
  await page.getByText("Save").click();

  // Click Review Send
  const reviewSendButton = page.getByTestId("send-collectible-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible();

  // Verify memo row IS shown in review (collectibles with muxed support to G address allow memo)
  await expect(page.getByTestId("review-tx-memo")).toBeVisible();
  await expect(page.getByTestId("review-tx-memo")).toContainText(
    "Test memo for collectible",
  );
});
