import { loginToTestAccount } from "./helpers/login";
import {
  stubAccountBalancesE2e,
  stubContractSpec,
  stubSimulateSendCollectible,
} from "./helpers/stubs";
import { TEST_TOKEN_ADDRESS } from "./helpers/test-token";
import { test, expect } from "./test-fixtures";

const FUNDED_DESTINATION =
  "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";
// Second funded destination used for destination-change re-simulation tests
const FUNDED_DESTINATION_2 =
  "GDMDFPJPFH4Z2LLUCNNQT3HVQ2XU2TMZBA6OL37C752WCKU7JZO2S52R";

// Token send (Soroban): stubSimulateTokenTransfer returns minResourceFee "93238" stroops
// = 0.0093238 XLM. baseFee = 0.00001 XLM. Total = 0.0093338 XLM.
test("Fee breakdown pane shows Soroban fees for token send", async ({
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

  // Navigate to token send via Asset Detail
  await page.getByText("E2E").click();
  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("0.1");

  // Set destination (address tile in SendAmount opens the SendTo step)
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click();

  // Wait for simulation to finish, then click Review Send
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  await expect(page.getByText("You are sending").first()).toBeVisible();

  // Open fees breakdown pane
  await page.getByTestId("review-tx-fee-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();

  // Inclusion fee = baseFee = 0.00001 XLM
  await expect(page.getByTestId("review-tx-inclusion-fee")).toHaveText(
    "0.00001 XLM",
  );

  // Resource fee = 0.0093238 XLM (93238 stroops / 1e7)
  await expect(page.getByTestId("review-tx-resource-fee")).toHaveText(
    "0.0093238 XLM",
  );

  // Total fee = inclusion + resource
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText(
    "0.0093338 XLM",
  );

  // Description explains Soroban simulation adjustments
  await expect(page.getByTestId("review-tx-fees-description")).toContainText(
    "Soroban",
  );

  // Closing the pane returns to the review screen
  await page.getByTestId("review-tx-fees-close-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).not.toBeVisible();
  await expect(page.getByText("You are sending").first()).toBeVisible();
});

// Classic XLM send: no resource fee, only total fee shown
test("Fee breakdown pane shows only total fee for classic XLM send", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Navigate to Send To screen
  await page.getByTestId("address-tile").click();
  await expect(page.getByTestId("send-to-input")).toBeVisible();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

  // Back on Send Amount: enter amount
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  await page.getByText("Review Send").click({ force: true });
  await expect(page.getByText("You are sending").first()).toBeVisible();

  // Open fees breakdown pane
  await page.getByTestId("review-tx-fee-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();

  // No inclusion/resource fee rows for classic transactions
  await expect(page.getByTestId("review-tx-inclusion-fee")).not.toBeVisible();
  await expect(page.getByTestId("review-tx-resource-fee")).not.toBeVisible();

  // Total fee = base fee = 0.00001 XLM
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText(
    "0.00001 XLM",
  );

  // Description is the classic variant (no mention of Soroban simulation)
  await expect(
    page.getByTestId("review-tx-fees-description"),
  ).not.toContainText("Soroban");
  await expect(page.getByTestId("review-tx-fees-description")).toContainText(
    "These fees go to the network",
  );

  // Closing the pane returns to the review screen
  await page.getByTestId("review-tx-fees-close-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).not.toBeVisible();
  await expect(page.getByText("You are sending").first()).toBeVisible();
});

// Collectible send (Soroban): stubSimulateSendCollectible returns minResourceFee "100" stroops
// = 0.00001 XLM. baseFee = 0.00001 XLM. Total = 0.00002 XLM.
test("Fee breakdown pane shows Soroban fees for collectible send", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  const stubOverrides = async () => {
    await stubSimulateSendCollectible(page);
  };
  await stubContractSpec(
    page,
    "CCTYMI5ME6NFJC675P2CHNVG467YQJQ5E4TWP5RAPYYNKWK7DIUUDENN",
    true,
  );

  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Select a collectible
  await page.getByTestId("send-amount-edit-dest-asset").click();
  await page.getByTestId("account-tab-collectibles").click();
  await page.getByText("Stellar Frog 1").click();
  await expect(page.getByTestId("SelectedCollectible")).toBeVisible();

  // Set destination
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

  // Wait for simulation to finish, then click Review Send
  const reviewSendButton = page.getByTestId("send-collectible-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  await expect(page.getByText("You are sending").first()).toBeVisible();

  // Open fees breakdown pane
  await page.getByTestId("review-tx-fee-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();

  // Inclusion fee = baseFee = 0.00001 XLM
  await expect(page.getByTestId("review-tx-inclusion-fee")).toHaveText(
    "0.00001 XLM",
  );

  // Resource fee = 0.00001 XLM (100 stroops / 1e7)
  await expect(page.getByTestId("review-tx-resource-fee")).toHaveText(
    "0.00001 XLM",
  );

  // Total fee = 0.00001 + 0.00001
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText(
    "0.00002 XLM",
  );

  // Description explains Soroban simulation adjustments
  await expect(page.getByTestId("review-tx-fees-description")).toContainText(
    "Soroban",
  );

  // Closing the pane returns to the review screen
  await page.getByTestId("review-tx-fees-close-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).not.toBeVisible();
  await expect(page.getByText("You are sending").first()).toBeVisible();
});

// Soroban token send: opening fees pane from EditSettings shows "Inclusion Fee" label + fee breakdown
test("Fee breakdown pane shows Soroban fees from Edit Settings", async ({
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

  // Navigate to token send via Asset Detail
  await page.getByText("E2E").click();
  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("0.1");

  // Set destination
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click();

  // Wait for simulation to finish
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });

  // Open Edit Settings
  await page.getByTestId("send-amount-btn-fee").click();

  // EditSettings should show "Inclusion Fee" label for Soroban
  await expect(page.getByText("Inclusion Fee")).toBeVisible();

  // Open fees breakdown pane from EditSettings
  await page.getByTestId("edit-settings-fees-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();

  // Inclusion fee = baseFee = 0.00001 XLM
  await expect(page.getByTestId("review-tx-inclusion-fee")).toHaveText(
    "0.00001 XLM",
  );

  // Resource fee = 0.0093238 XLM (93238 stroops / 1e7)
  await expect(page.getByTestId("review-tx-resource-fee")).toHaveText(
    "0.0093238 XLM",
  );

  // Total fee = inclusion + resource
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText(
    "0.0093338 XLM",
  );

  // Description explains Soroban simulation adjustments
  await expect(page.getByTestId("review-tx-fees-description")).toContainText(
    "Soroban",
  );

  // Closing the fees pane returns to Edit Settings
  await page.getByTestId("review-tx-fees-close-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).not.toBeVisible();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();
});

// Auto-simulation: after setting destination for a Soroban token send the fee
// display on the SendAmount screen updates to the simulated total WITHOUT the
// user needing to click "Review Send" first.
test("Auto-simulation updates fee display on SendAmount before Review Send", async ({
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

  // Navigate to token send via Asset Detail
  await page.getByText("E2E").click();
  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("0.1");

  // Set destination — auto-simulation fires automatically after returning to SendAmount
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click();

  // Without clicking "Review Send", the fee display should update to the
  // simulated total (inclusion + resource).
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.0093338 XLM",
    { timeout: 10000 },
  );
});

// Re-simulation: changing the destination triggers a new simulation.  The
// baseFee reset ensures the second simulation still uses the original inclusion
// fee (0.00001) as its base — EditSettings must show that value, not the inflated total.
test("Re-simulation on destination change shows correct inclusion fee in EditSettings", async ({
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

  // Navigate to token send
  await page.getByText("E2E").click();
  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("0.1");

  // Set first destination — auto-simulation fires
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click();

  // Wait for first simulation to finish
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.0093338 XLM",
    { timeout: 10000 },
  );

  // Change to a different destination — re-simulation should fire
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION_2);
  await page.getByText("Continue").click();

  // Wait for re-simulation to complete
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.0093338 XLM",
    { timeout: 10000 },
  );

  // Open EditSettings — inclusion fee must be the base fee (0.00001 XLM),
  // not the inflated total that was briefly stored in Redux after the first simulation.
  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00001",
  );
});
