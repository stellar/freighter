import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { TEST_M_ADDRESS, TEST_TOKEN_ADDRESS } from "./helpers/test-token";
import {
  stubAccountBalances,
  stubAccountBalancesE2e,
  stubAccountHistory,
  stubContractSpec,
  stubMemoRequiredAccounts,
  stubSimulateTokenTransfer,
  stubTokenDetails,
  stubTokenPrices,
  stubAllExternalApis,
} from "./helpers/stubs";

const MEMO_REQUIRED_ADDRESS =
  "GA6SXIZIKLJHCZI2KEOBEUUOFMM4JUPPM2UTWX6STAWT25JWIEUFIMFF";

test.beforeEach(async ({ page, context }) => {
  await stubAllExternalApis(page, context);
});

test("Send payment shows memo required warning when destination requires memo", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Click Review Send to trigger memo validation
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open - this happens after simulation completes
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for the review transaction content to be ready (not in loading state)
  // Check that AddMemoAction is visible (validation complete)
  await expect(page.getByTestId("AddMemoAction")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("Add Memo")).toBeVisible();
});

test("Send payment allows submission after adding memo to memo-required address", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Add memo from SendPayment page
  await page.getByTestId("send-amount-btn-memo").click();
  await page.getByTestId("edit-memo-input").fill("test memo");
  await page.getByText("Save").click();

  // Verify memo was saved and review modal doesn't auto-open
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  expect(await page.getByText("You are sending").isVisible()).toBeFalsy();

  // Click Review Send - this triggers simulation and opens review sheet
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");

  // Wait for button to be enabled (simulation not in progress) before clicking
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });

  // Click the button to start simulation and open review sheet
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open - this happens after simulation completes
  // The simulation may take time, so we wait for the review sheet content
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for the review transaction content to be ready (not in loading state)
  // Check that either SubmitAction or AddMemoAction is visible (validation complete)
  await expect(
    page
      .getByTestId("SubmitAction")
      .or(page.getByTestId("AddMemoAction"))
      .first(),
  ).toBeVisible({
    timeout: 15000,
  });

  // Wait for validation to complete - submit button should be enabled when done
  // (memo already added, so no "Add Memo" button should appear)
  await expect(page.getByTestId("SubmitAction")).toBeEnabled({
    timeout: 5000,
  });

  // Verify review modal opens and "Add Memo" button is not visible (memo already added)
  await expect(page.getByTestId("AddMemoAction")).not.toBeVisible();
  await expect(page.getByTestId("review-tx-memo")).toHaveText("test memo");
});

test("Send payment returns to review modal after adding memo from review flow", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Click Review Send to open review modal
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for memo validation to complete - the "Add Memo" button appears when validation is done
  await expect(page.getByTestId("AddMemoAction")).toBeVisible({
    timeout: 10000,
  });

  // Click Add Memo from review modal
  await page.getByTestId("AddMemoAction").click();

  // Fill and save memo
  await expect(page.getByTestId("edit-memo-input")).toBeVisible();
  await page.getByTestId("edit-memo-input").fill("review memo");
  await page.getByText("Save").click();

  // Verify review modal is reopened after saving memo
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });
  await expect(page.getByTestId("AddMemoAction")).not.toBeVisible();
  await expect(page.getByTestId("review-tx-memo")).toHaveText("review memo");
});

test("Send payment returns to review modal after cancelling memo editor from review flow", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Click Review Send to open review modal
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for memo validation to complete - the "Add Memo" button appears when validation is done
  await expect(page.getByTestId("AddMemoAction")).toBeVisible({
    timeout: 10000,
  });

  // Click Add Memo from review modal
  await page.getByTestId("AddMemoAction").click();

  // Cancel memo editor
  await expect(page.getByTestId("edit-memo-input")).toBeVisible();
  await page.getByText("Cancel").click();

  // Verify review modal is reopened after cancelling and "Add Memo" button is still visible
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });
  await expect(page.getByTestId("AddMemoAction")).toBeVisible();
});

test("Send payment shows memo value directly when memo is added before review", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Add memo before going to review
  await page.getByTestId("send-amount-btn-memo").click();
  await page.getByTestId("edit-memo-input").fill("pre-review memo");
  await page.getByText("Save").click();

  // After saving memo, a simulation is triggered to regenerate XDR with the new memo
  // Wait for the memo editor to close
  await expect(page.getByTestId("edit-memo-input")).not.toBeVisible({
    timeout: 5000,
  });

  // Wait for any loading overlays to disappear
  await page.waitForTimeout(500);

  // Wait for the simulation to complete before clicking Review Send
  // Verify we're still on the send amount page
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Wait for the simulation to complete before clicking Review Send
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 30000 });

  // Click the button to start simulation and open review sheet
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open - this happens after simulation completes
  // The simulation runs, then setIsReviewingTx(true) is called
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for the review transaction content to be ready (not in loading state)
  // Check that SubmitAction is visible (validation complete)
  await expect(page.getByTestId("SubmitAction")).toBeVisible({
    timeout: 15000,
  });

  // Wait for validation to complete - submit button should be enabled when done
  await expect(page.getByTestId("SubmitAction")).toBeEnabled({
    timeout: 5000,
  });

  // Verify review modal opens and shows memo directly, "Add Memo" button is not visible
  await expect(page.getByTestId("AddMemoAction")).not.toBeVisible();
  await expect(page.getByTestId("review-tx-memo")).toHaveText(
    "pre-review memo",
  );
  // Verify the "Send to" button is visible (not "Add Memo")
  await expect(page.getByTestId("SubmitAction")).toBeVisible();
});

test("Send payment shows Add Memo when switching from non-memo-required to memo-required address", async ({
  page,
  extensionId,
}) => {
  test.slow();
  const NON_MEMO_REQUIRED_ADDRESS =
    "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // First, set a non-memo-required address
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(NON_MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Go to review with non-memo-required address
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for validation to complete - submit button should be enabled when done
  await expect(page.getByTestId("SubmitAction")).toBeEnabled({
    timeout: 10000,
  });

  // Verify "Add Memo" button is not visible for non-memo-required address
  await expect(page.getByTestId("AddMemoAction")).not.toBeVisible();

  // Go back to change address
  await page.getByText("Cancel").click();

  // Change to memo-required address
  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").clear();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  // Make sure amount is still 1 XLM after switching addresses
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Go to review again with memo-required address
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for memo validation to complete - the "Add Memo" button appears when validation is done
  await expect(page.getByTestId("AddMemoAction")).toBeVisible({
    timeout: 10000,
  });
});

test("Send payment shows Add Memo after cancelling review and returning to memo-required address", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubMemoRequiredAccounts(page, MEMO_REQUIRED_ADDRESS);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(MEMO_REQUIRED_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Go to review - should show "Add Memo" button
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for memo validation to complete - the "Add Memo" button appears when validation is done
  await expect(page.getByTestId("AddMemoAction")).toBeVisible({
    timeout: 10000,
  });

  // Cancel review
  await page.getByText("Cancel").click();

  // Wait for review sheet to close completely
  await expect(page.getByText("You are sending")).not.toBeVisible({
    timeout: 5000,
  });

  // Verify we're back on the send amount page
  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Ensure amount is still set after cancelling
  await expect(page.getByTestId("send-amount-amount-input")).toHaveValue("1");

  // Wait a moment for UI to stabilize after modal closes
  await page.waitForTimeout(300);

  // Re-query the button after cancelling (button reference might be stale)
  // Wait for button to be visible and enabled
  await expect(page.getByTestId("send-amount-btn-continue")).toBeVisible({
    timeout: 5000,
  });
  await expect(page.getByTestId("send-amount-btn-continue")).toBeEnabled({
    timeout: 10000,
  });

  // Click the button to open review again
  await page.getByTestId("send-amount-btn-continue").click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Wait for memo validation to complete - the "Add Memo" button appears when validation is done
  await expect(page.getByTestId("AddMemoAction")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByText("Add Memo")).toBeVisible();
});

// Classic token to G address -> Normal (regression test)
test("Send classic token to G address allows memo", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  const G_ADDRESS = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(G_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Add memo - should be enabled for classic token to G address
  await page.getByTestId("send-amount-btn-memo").click();
  await expect(page.getByTestId("edit-memo-input")).toBeVisible();
  await page.getByTestId("edit-memo-input").fill("classic G memo");
  await page.getByText("Save").click();

  // Click Review Send
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Verify memo is shown in review
  await expect(page.getByTestId("review-tx-memo")).toHaveText("classic G memo");
});

// Classic token to M address -> Memo disabled (this is supported, but an antipattern)
test("Send classic token to M address doesn't allow memo", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalances(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(TEST_M_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill("1");

  // Add memo - should be enabled for classic token to M address
  await page.getByTestId("send-amount-btn-memo").click();
  await expect(page.getByTestId("edit-memo-input")).toBeVisible();
  // Memo input should be disabled
  await expect(page.getByTestId("edit-memo-input")).toBeDisabled();
});

// Custom token without Soroban mux support to G -> Memo NOT allowed
test("Send custom token without Soroban mux support to G address disables memo", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalancesE2e(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubSimulateTokenTransfer(page);
  // Stub contract spec before login to ensure it's ready when needed
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, false);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible({
    timeout: 30000,
  });

  const G_ADDRESS = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(G_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible({
    timeout: 30000,
  });

  // Select custom token
  await page.locator(".SendAmount__EditDestAsset").click();
  await page
    .getByTestId(`SendRow-E2E:${TEST_TOKEN_ADDRESS}`)
    .click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible({
    timeout: 30000,
  });
  await page.getByTestId("send-amount-amount-input").fill(".001");

  // Wait for contract check to complete
  // The memo button should be visible and enabled (user can click it)
  const memoButton = page.getByTestId("send-amount-btn-memo");
  await expect(memoButton).toBeVisible({ timeout: 10000 });
  await expect(memoButton).toBeEnabled({ timeout: 10000 });

  // Click memo button to open EditMemo
  await memoButton.click();

  // Verify EditMemo dialog is open and memo input field is visible
  await expect(page.getByTestId("edit-memo-input")).toBeVisible({
    timeout: 10000,
  });

  // Verify memo input field is disabled (not editable)
  await expect(page.getByTestId("edit-memo-input")).toBeDisabled();

  // Verify the warning message is shown explaining why memo is disabled
  await expect(
    page.getByText("Memo is not supported for this operation"),
  ).toBeVisible({ timeout: 10000 });

  // Verify Save button is also disabled (since memo field is disabled)
  const saveButton = page.getByRole("button", { name: /save/i });
  await expect(saveButton).toBeDisabled();

  // Close the EditMemo dialog
  await page.getByText("Cancel").click();

  // Wait for EditMemo to close
  await expect(page.getByTestId("edit-memo-input")).not.toBeVisible();

  // Click Review Send - should be enabled (transaction is allowed, just no memo)
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 15000 });

  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Verify memo row is NOT shown in review (tokens without Soroban mux support don't support memo)
  // The memo row should be completely hidden, not showing "Memo None"
  await expect(page.getByTestId("review-tx-memo")).not.toBeVisible();
});

// Custom token without Soroban mux support to M -> Impossible/disabled
test("Send custom token without Soroban mux support to M address is disabled", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalancesE2e(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubSimulateTokenTransfer(page);
  // Stub contract spec before login to ensure it's ready when needed
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, false);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(TEST_M_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Select custom token
  await page.locator(".SendAmount__EditDestAsset").click();
  await page
    .getByTestId(`SendRow-E2E:${TEST_TOKEN_ADDRESS}`)
    .click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");

  // Wait for contract check to complete - wait for warning banner to appear
  await expect(
    page.getByText(
      "This token does not support muxed address (M-) as a target destination",
    ),
  ).toBeVisible({ timeout: 10000 });

  // Memo button should be enabled, but memo input should be disabled
  const memoButton = page.getByTestId("send-amount-btn-memo");
  await expect(memoButton).toBeEnabled();

  // Verify Review Send button is disabled
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeDisabled();
});

// Custom token with Soroban mux support to G -> Memo can be added
test("Send custom token with Soroban mux support to G address allows memo", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalancesE2e(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubSimulateTokenTransfer(page);
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, true);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  const G_ADDRESS = "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(G_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Select custom token
  await page.locator(".SendAmount__EditDestAsset").click();
  await page
    .getByTestId(`SendRow-E2E:${TEST_TOKEN_ADDRESS}`)
    .click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");

  // Wait for contract check to complete - wait for memo button to be enabled
  // (it might be disabled initially while contract check is in progress)
  const memoButton = page.getByTestId("send-amount-btn-memo");
  await expect(memoButton).toBeEnabled({ timeout: 10000 });

  // Add memo - should be enabled for custom token with Soroban mux support to G address
  await memoButton.click();
  await expect(page.getByTestId("edit-memo-input")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("edit-memo-input")).toBeEnabled({
    timeout: 10000,
  });
  await page.getByTestId("edit-memo-input").fill("soroban mux G memo");
  await page.getByText("Save").click();

  // Click Review Send
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Verify memo is shown in review
  await expect(page.getByTestId("review-tx-memo")).toHaveText(
    "soroban mux G memo",
  );
});

// Custom token with Soroban mux support to M -> Memo disabled (embedded)
test("Send custom token with Soroban mux support to M address disables memo", async ({
  page,
  extensionId,
}) => {
  test.slow();
  await stubAccountBalancesE2e(page);
  await stubAccountHistory(page);
  await stubTokenDetails(page);
  await stubTokenPrices(page);
  await stubSimulateTokenTransfer(page);
  await stubContractSpec(page, TEST_TOKEN_ADDRESS, true);

  await loginToTestAccount({ page, extensionId });
  await page.getByTestId("nav-link-send").click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  await page.getByTestId("address-tile").click();
  await page.getByTestId("send-to-input").fill(TEST_M_ADDRESS);
  await page.getByText("Continue").click();

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();

  // Select custom token
  await page.locator(".SendAmount__EditDestAsset").click();
  await page
    .getByTestId(`SendRow-E2E:${TEST_TOKEN_ADDRESS}`)
    .click({ force: true });

  await expect(page.getByTestId("send-amount-amount-input")).toBeVisible();
  await page.getByTestId("send-amount-amount-input").fill(".001");

  // Wait for contract check to complete
  // Since contract supports muxed (true), there should be NO warning banner
  // (warning banner only shows when contractSupportsMuxed === false)
  await page.waitForTimeout(2000); // Wait for contract check to complete

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
  // (memo is encoded in M address, so it's disabled)
  await memoButton.click();
  await expect(page.getByTestId("edit-memo-input")).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByTestId("edit-memo-input")).toBeDisabled();
  // Wait for the disabled message to appear
  // The message should appear once the contract check completes
  await expect(
    page.getByText("Memo is disabled for this transaction"),
  ).toBeVisible({ timeout: 15000 });
  await page.getByText("Cancel").click();

  // Click Review Send
  const reviewSendButton = page.getByTestId("send-amount-btn-continue");
  await expect(reviewSendButton).toBeEnabled({ timeout: 10000 });
  await reviewSendButton.click({ force: true });

  // Wait for review sheet to open
  await expect(page.getByText("You are sending")).toBeVisible({
    timeout: 200000,
  });

  // Verify memo row is NOT shown in review (memo is embedded in M address for tokens with Soroban mux support)
  await expect(page.getByTestId("review-tx-memo")).not.toBeVisible();
});
