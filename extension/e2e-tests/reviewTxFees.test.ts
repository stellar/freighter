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

// ── Comprehensive scenario 1: custom token only (no destination) ─────────────
// Full fee lifecycle: open settings → open FeesPane (no simulation data) →
// go back → change draft → open FeesPane again (draft reflected) → Save →
// all places updated → reopen settings shows saved → reopen FeesPane shows saved.
test("Custom token without destination — full fee lifecycle in EditSettings and FeesPane", async ({
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

  // Navigate to token send (no destination set yet)
  await page.getByText("E2E").click();
  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Without a destination, no auto-simulation fires — fee display stays at base fee
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00001 XLM",
  );

  // ── Open Edit Settings ──────────────────────────────────────────────────────
  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();
  // No auto-simulation yet — shows recommended base fee
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00001",
  );

  // ── Open FeesPane — no destination so simulation does NOT fire ───────────
  // FeesPane shows the base fee as inclusion/total and "None" for resource,
  // matching mobile behaviour (no error, no simulated amounts).
  await page.getByTestId("edit-settings-fees-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();
  await expect(page.getByTestId("review-tx-inclusion-fee")).toHaveText(
    "0.00001 XLM",
  );
  await expect(page.getByTestId("review-tx-resource-fee")).toHaveText("None");
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText(
    "0.00001 XLM",
  );
  await expect(page.getByTestId("review-tx-fees-description")).toContainText(
    "Soroban",
  );

  // ── Close FeesPane → back to Edit Settings ────────────────────────────────
  await page.getByTestId("review-tx-fees-close-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).not.toBeVisible();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();

  // ── Change draft fee ──────────────────────────────────────────────────────
  await page.getByTestId("edit-tx-settings-fee-input").fill("0.00005");
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00005",
  );

  // ── Open FeesPane again — draft fee reflected, resource still "None" ──────
  await page.getByTestId("edit-settings-fees-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();
  // No simulation data: total = draft inclusion fee only
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText(
    "0.00005 XLM",
  );
  await expect(page.getByTestId("review-tx-resource-fee")).toHaveText("None");

  // ── Close FeesPane → draft still in the input ─────────────────────────────
  await page.getByTestId("review-tx-fees-close-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).not.toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00005",
  );

  // ── Save the custom fee ───────────────────────────────────────────────────
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Inclusion Fee")).not.toBeVisible();
  // No destination → no simulation → fee display shows the saved inclusion fee
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00005 XLM",
  );

  // ── Reopen Edit Settings — must show saved fee, not the base default ───────
  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00005",
  );

  // ── Open FeesPane from re-opened settings — saved fee reflected ────────────
  // Still no destination, so resource stays "None" and total = inclusion fee only.
  await page.getByTestId("edit-settings-fees-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();
  await expect(page.getByTestId("review-tx-inclusion-fee")).toHaveText(
    "0.00005 XLM",
  );
  await expect(page.getByTestId("review-tx-resource-fee")).toHaveText("None");
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText(
    "0.00005 XLM",
  );
  await expect(page.getByTestId("review-tx-fees-description")).toContainText(
    "Soroban",
  );
});

// ── Comprehensive scenario 2: custom token + recipient (Soroban) ──────────────
// Same lifecycle as scenario 1, but with destination set so simulation data is
// available: full inclusion + resource breakdown, draft total = inclusion + resource,
// Save triggers re-simulation, re-opened settings shows saved fee, FeesPane updated.
test("Custom token with recipient — full fee lifecycle in EditSettings and FeesPane", async ({
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

  // Navigate to token send and set destination
  await page.getByText("E2E").click();
  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("0.1");

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click();

  // Wait for auto-simulation: total = baseFee(0.00001) + resource(0.0093238)
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.0093338 XLM",
    { timeout: 10000 },
  );

  // ── Open Edit Settings ──────────────────────────────────────────────────────
  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();
  // Shows the inclusion fee from simulation (base fee only, not the total)
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00001",
  );

  // ── Open FeesPane (full simulation data) ─────────────────────────────────
  await page.getByTestId("edit-settings-fees-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();
  await expect(page.getByTestId("review-tx-inclusion-fee")).toHaveText(
    "0.00001 XLM",
  );
  await expect(page.getByTestId("review-tx-resource-fee")).toHaveText(
    "0.0093238 XLM",
  );
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText(
    "0.0093338 XLM",
  );
  await expect(page.getByTestId("review-tx-fees-description")).toContainText(
    "Soroban",
  );

  // ── Close FeesPane → back to Edit Settings ────────────────────────────────
  await page.getByTestId("review-tx-fees-close-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).not.toBeVisible();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();

  // ── Change draft fee ──────────────────────────────────────────────────────
  await page.getByTestId("edit-tx-settings-fee-input").fill("0.00005");
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00005",
  );

  // ── Open FeesPane again — total reflects simulation, not unsaved draft ───────
  await page.getByTestId("edit-settings-fees-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();
  // FeesPane shows the simulated total (inclusion 0.00001 + resource 0.0093238);
  // the draft 0.00005 is not yet saved so it does not affect the displayed total.
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText(
    "0.0093338 XLM",
  );

  // ── Close FeesPane → draft still in the input ─────────────────────────────
  await page.getByTestId("review-tx-fees-close-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).not.toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00005",
  );

  // ── Save the custom fee ───────────────────────────────────────────────────
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Inclusion Fee")).not.toBeVisible();

  // Re-simulation runs with new baseFee = 0.00005 → total = 0.0093738
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.0093738 XLM",
    { timeout: 10000 },
  );

  // ── Reopen Edit Settings — saved fee must survive re-simulation ────────────
  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00005",
  );

  // ── Open FeesPane from re-opened settings ─────────────────────────────────
  // Re-simulation used baseFee=0.00005 → inclusionFee=0.00005, resource unchanged
  await page.getByTestId("edit-settings-fees-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();
  await expect(page.getByTestId("review-tx-inclusion-fee")).toHaveText(
    "0.00005 XLM",
  );
  await expect(page.getByTestId("review-tx-resource-fee")).toHaveText(
    "0.0093238 XLM",
  );
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText(
    "0.0093738 XLM",
  );
  await expect(page.getByTestId("review-tx-fees-description")).toContainText(
    "Soroban",
  );
});

// ── Comprehensive scenario 3: fee override is session-scoped ──────────────────
// After saving a custom fee, navigating back to the home screen and re-entering
// the send flow must reset to the default simulated fee.  The manual override
// is intentionally not persisted across navigation sessions.
test("Custom fee resets to default when re-entering send flow from home screen", async ({
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

  // ── First session: set custom fee ─────────────────────────────────────────
  await page.getByText("E2E").click();
  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("0.1");

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click();

  // Wait for simulation
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.0093338 XLM",
    { timeout: 10000 },
  );

  // Save a custom fee
  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();
  await page.getByTestId("edit-tx-settings-fee-input").fill("0.00005");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Inclusion Fee")).not.toBeVisible();

  // Confirm the override is active: re-simulation total = 0.0093738
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.0093738 XLM",
    { timeout: 10000 },
  );

  // ── Navigate back to home screen ──────────────────────────────────────────
  await page.getByTestId("BackButton").click();
  // goBack() dispatches resetSubmission() (clears destination / fees / state)
  // and navigates to ROUTES.account (the main AccountView)
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 10000,
  });

  // ── Second session: re-enter the same send flow ───────────────────────────
  await page.getByText("E2E").click();
  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // resetSubmission cleared destination → no auto-simulation fires on mount.
  // Fee display shows the base fee, NOT the previous override total (0.0093738).
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00001 XLM",
  );

  // ── EditSettings must show the default inclusion fee, not the saved "0.00005" ─
  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00001",
  );

  // ── FeesPane shows base fee — no destination means no simulation ─────────
  await page.getByTestId("edit-settings-fees-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText(
    "0.00001 XLM",
  );
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

test("Soroban token — manually set fee is preserved when recipient is selected after saving", async ({
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
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("0.1");

  // Set custom fee before picking a recipient
  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00001",
  );
  await page.getByTestId("edit-tx-settings-fee-input").fill("0.00005");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Inclusion Fee")).not.toBeVisible();

  // Select recipient — SendAmount remounts; fee must survive via Redux persistence
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click();

  // Re-simulation uses saved baseFee=0.00005 → total = 0.00005 + 0.0093238
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.0093738 XLM",
    { timeout: 10000 },
  );

  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00005",
  );
});

test("Classic send — manually set fee is applied and shown in settings", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00001 XLM",
  );

  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Transaction Fee")).toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00001",
  );

  await page.getByTestId("edit-tx-settings-fee-input").fill("0.00005");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Transaction Fee")).not.toBeVisible();
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00005 XLM",
  );

  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Transaction Fee")).toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00005",
  );
});

test("Classic send — manually set fee carries through to Review Send", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await expect(page.getByTestId("send-to-input")).toBeVisible();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00001 XLM",
  );

  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Transaction Fee")).toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00001",
  );
  await page.getByTestId("edit-tx-settings-fee-input").fill("0.00005");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Transaction Fee")).not.toBeVisible();
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00005 XLM",
  );

  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Transaction Fee")).toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00005",
  );
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Transaction Fee")).not.toBeVisible();

  await page.getByText("Review Send").click({ force: true });
  await expect(page.getByText("You are sending").first()).toBeVisible();
  await expect(page.getByTestId("review-tx-fee")).toHaveText("0.00005 XLM");
});

test("Classic send — manually set fee resets when re-entering send flow from home", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Transaction Fee")).toBeVisible();
  await page.getByTestId("edit-tx-settings-fee-input").fill("0.00005");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Transaction Fee")).not.toBeVisible();
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00005 XLM",
  );

  await page.getByTestId("BackButton").click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 10000,
  });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00001 XLM",
  );

  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Transaction Fee")).toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00001",
  );
});

test("Classic send — manually set fee is preserved across change of recipient", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-send").click({ force: true });
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Set custom fee before picking a recipient
  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Transaction Fee")).toBeVisible();
  await page.getByTestId("edit-tx-settings-fee-input").fill("0.00005");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Transaction Fee")).not.toBeVisible();
  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00005 XLM",
  );

  // Select recipient — SendAmount remounts; no simulation runs for classic
  await page.getByTestId("address-tile").click();
  await expect(page.getByTestId("send-to-input")).toBeVisible();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click({ force: true });

  await expect(page.getByTestId("send-amount-fee-display")).toHaveText(
    "0.00005 XLM",
  );

  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Transaction Fee")).toBeVisible();
  await expect(page.getByTestId("edit-tx-settings-fee-input")).toHaveValue(
    "0.00005",
  );
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Transaction Fee")).not.toBeVisible();

  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByText("Review Send").click({ force: true });
  await expect(page.getByText("You are sending").first()).toBeVisible();
  await expect(page.getByTestId("review-tx-fee")).toHaveText("0.00005 XLM");
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

// FeesPane pre-simulation state: Soroban rows are always present; resource shows
// "-" before simulation data arrives, total shows base fee (not "Calculating...").
// Uses a delayed simulation stub so the test can observe the initial state.
test("FeesPane shows inclusion/resource rows immediately for Soroban — resource is '-' before simulation completes", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  let resolveSimulation!: () => void;
  const simulationBlocked = new Promise<void>((resolve) => {
    resolveSimulation = resolve;
  });

  const stubOverrides = async () => {
    await stubAccountBalancesE2e(page);
    // Override the token-transfer simulation to block until we explicitly resolve
    await page.route("**/simulate-token-transfer", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      // Wait until the test gives the signal to respond
      await simulationBlocked;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ error: "blocked" }),
      });
    });
  };
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, true);

  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  // Navigate to token send (no destination set)
  await page.getByText("E2E").click();
  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Open EditSettings — this triggers simulation (which is blocked)
  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();

  // Open FeesPane — simulation has not yet completed
  await page.getByTestId("edit-settings-fees-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();

  // Both Soroban rows must be present immediately (always-show behavior)
  await expect(page.getByTestId("review-tx-inclusion-fee")).toBeVisible();
  await expect(page.getByTestId("review-tx-resource-fee")).toBeVisible();

  // Before simulation: inclusion = base fee, resource = "None", total = base fee
  await expect(page.getByTestId("review-tx-inclusion-fee")).toHaveText(
    "0.00001 XLM",
  );
  await expect(page.getByTestId("review-tx-resource-fee")).toHaveText("None");
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText(
    "0.00001 XLM",
  );

  // Unblock simulation (returns an error — state stays as-is, no update)
  resolveSimulation();
});

// Simulation failure: when the backend returns a non-2xx response the FeesPane
// must show "—" for all three Soroban fee rows and the Continue button must be
// disabled so the user cannot proceed with stale fee data.
test("FeesPane shows — for all fee rows when simulation fails", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  const stubOverrides = async () => {
    await stubAccountBalancesE2e(page);
    // Override token-transfer simulation to return a server error
    await page.route("**/simulate-token-transfer", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({ status: 500 });
    });
  };
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, true);

  await loginToTestAccount({ page, extensionId, context, stubOverrides });

  // Navigate to token send and set a destination to trigger auto-simulation
  await page.getByText("E2E").click();
  await page.getByTestId("asset-detail-send-button").click();
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("0.1");

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(FUNDED_DESTINATION);
  await page.getByText("Continue").click();

  // Wait for the simulation to fail — the Continue button becomes disabled
  const continueButton = page.getByTestId("send-amount-btn-continue");
  await expect(continueButton).toBeDisabled({ timeout: 10000 });

  // Open EditSettings → FeesPane to inspect the error state
  await page.getByTestId("send-amount-btn-fee").click();
  await expect(page.getByText("Inclusion Fee")).toBeVisible();
  await page.getByTestId("edit-settings-fees-info-btn").click();
  await expect(page.getByTestId("review-tx-fees-pane")).toBeVisible();

  // All three fee rows must show "—" on simulation error
  await expect(page.getByTestId("review-tx-inclusion-fee")).toHaveText("—", {
    timeout: 10000,
  });
  await expect(page.getByTestId("review-tx-resource-fee")).toHaveText("—");
  await expect(page.getByTestId("review-tx-total-fee")).toHaveText("—");
});
