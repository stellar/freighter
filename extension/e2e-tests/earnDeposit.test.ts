/**
 * E2E spec: Earn deposit flow (Blend)
 *
 * Covers:
 *  1. Entry point + first-run interstitial, then skipped on re-entry
 *  2. Token picker: held vs supported sections, APY badges
 *  3. "Not enough X" sheet — EURC (swap/transfer, no Buy: not Coinbase-listed)
 *  4. "Not enough X" sheet — USDC (buy + swap + transfer)
 *  5. Held-token happy path: amount -> Max -> review -> confirm -> Deposited!
 *  6. Pool details sheet, including its Backstop row
 *  7. Earn tile hidden on an unsupported network
 *
 * Stub URL shapes (all registered by stubBlendEarn):
 *  - earn options:  "** /protocols/blend/earn-options**"
 *  - pool catalog:  "** /protocols/blend/pools**"
 *  - positions:     "** /accounts/positions**"
 *  Plus the shared "** /simulate-tx**" and "** /submit-tx**" stubs from
 *  stubAllExternalApis, which the deposit's build and broadcast go through.
 *
 * Asset ids in the stub are the REAL mainnet SACs, because getBalanceByKey
 * resolves an earn option to a held balance by deriving that SAC. Placeholder
 * contract ids would make every token look unheld.
 *
 * testid index:
 *  - nav-link-earn             AccountHeader/index.tsx (Home action row)
 *  - earn-intro                EarnIntro/index.tsx
 *  - earn-intro-start          EarnIntro/index.tsx
 *  - earn-token-picker         EarnTokenPicker/index.tsx
 *  - earn-token-row-<CODE>     EarnTokenPicker/index.tsx
 *  - earn-apy-<CODE>           EarnTokenPicker/index.tsx
 *  - earn-not-enough-sheet     NotEnoughTokenSheet.tsx
 *  - earn-not-enough-{buy,swap,transfer}
 *  - earn-amount               EarnAmount/index.tsx
 *  - earn-amount-btn-continue  EarnAmount/index.tsx
 *  - earn-pool-card            EarnAmount/PoolCard.tsx
 *  - earn-pool-details-sheet   PoolDetailsSheet/index.tsx
 *  - earn-pool-backstop        PoolDetailsSheet/index.tsx
 *  - earn-review               EarnReview/index.tsx
 *  - earn-review-confirm       EarnReview/index.tsx
 *  - earn-submit               EarnSubmit/index.tsx
 *  - earn-submit-done          EarnSubmit/index.tsx
 *
 * Execution: `yarn test:e2e e2e-tests/earnDeposit.test.ts` from repo root.
 */

import { test, expect } from "./test-fixtures";
import { Page } from "@playwright/test";
import { loginToTestAccount, switchToMainnet } from "./helpers/login";
import { stubBlendEarn } from "./helpers/stubs";

/** Home -> Earn, through the first-run interstitial. */
async function openEarnFlow(page: Page) {
  await page.getByTestId("nav-link-earn").click();
  await expect(page.getByTestId("earn-intro")).toBeVisible();
  await page.getByTestId("earn-intro-start").click();
  await expect(page.getByTestId("earn-token-picker")).toBeVisible();
}

// ---------------------------------------------------------------------------
// 1. Entry point and the one-time interstitial
// ---------------------------------------------------------------------------
test("Earn tile opens the interstitial once, then goes straight to the picker", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({ page, extensionId, context });
  await switchToMainnet(page);
  await stubBlendEarn(page);

  await openEarnFlow(page);

  // Leave and re-enter: the dismissal is persisted in the background store, so
  // the interstitial must not reappear.
  await page
    .getByTestId("earn-token-picker")
    .getByRole("button")
    .first()
    .click();
  await page.getByTestId("nav-link-earn").click();

  await expect(page.getByTestId("earn-token-picker")).toBeVisible();
  await expect(page.getByTestId("earn-intro")).toBeHidden();
});

// ---------------------------------------------------------------------------
// 2. Picker sections and APY badges
// ---------------------------------------------------------------------------
test("token picker splits held from supported and shows each rate", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({ page, extensionId, context });
  await switchToMainnet(page);
  await stubBlendEarn(page);
  await openEarnFlow(page);

  // The test account holds only XLM, so XLM is the sole held row and the other
  // two reserves fall into "Supported tokens".
  await expect(page.getByText("In your account")).toBeVisible();
  await expect(page.getByText("Supported tokens")).toBeVisible();

  await expect(page.getByTestId("earn-token-row-XLM")).toBeVisible();
  await expect(page.getByTestId("earn-token-row-USDC")).toBeVisible();
  await expect(page.getByTestId("earn-token-row-EURC")).toBeVisible();

  await expect(page.getByTestId("earn-apy-USDC")).toContainText("16.94%");
  await expect(page.getByTestId("earn-apy-EURC")).toContainText("10.59%");

  await expect(
    page.getByText("APY is an estimate", { exact: false }),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// 3. "Not enough X" — EURC is not Coinbase-listed, so no Buy button
// ---------------------------------------------------------------------------
test("zero-balance EURC offers swap and transfer but not buy", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({ page, extensionId, context });
  await switchToMainnet(page);
  await stubBlendEarn(page);
  await openEarnFlow(page);

  await page.getByTestId("earn-token-row-EURC").click();

  const sheet = page.getByTestId("earn-not-enough-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("Not enough EURC");
  await expect(page.getByTestId("earn-not-enough-swap")).toBeVisible();
  await expect(page.getByTestId("earn-not-enough-transfer")).toBeVisible();
  await expect(page.getByTestId("earn-not-enough-buy")).toBeHidden();
});

// ---------------------------------------------------------------------------
// 4. "Not enough X" — USDC is onrampable and the account holds swappable XLM
// ---------------------------------------------------------------------------
test("zero-balance USDC offers buy, swap and transfer", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({ page, extensionId, context });
  await switchToMainnet(page);
  await stubBlendEarn(page);
  await openEarnFlow(page);

  await page.getByTestId("earn-token-row-USDC").click();

  await expect(page.getByTestId("earn-not-enough-sheet")).toContainText(
    "Not enough USDC",
  );
  await expect(page.getByTestId("earn-not-enough-buy")).toBeVisible();
  await expect(page.getByTestId("earn-not-enough-swap")).toBeVisible();
  await expect(page.getByTestId("earn-not-enough-transfer")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 5. Happy path on a held token
// ---------------------------------------------------------------------------
test("depositing a held token reaches the success screen", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({ page, extensionId, context });
  await switchToMainnet(page);
  await stubBlendEarn(page);
  await openEarnFlow(page);

  await page.getByTestId("earn-token-row-XLM").click();
  await expect(page.getByTestId("earn-amount")).toBeVisible();

  // The CTA stays disabled until there is an amount to review.
  await expect(page.getByTestId("earn-amount-btn-continue")).toBeDisabled();

  await page.getByTestId("SendAmountSetMax").click();
  await expect(page.getByTestId("earn-amount-btn-continue")).toBeEnabled();
  await page.getByTestId("earn-amount-btn-continue").click();

  const review = page.getByTestId("earn-review");
  await expect(review).toBeVisible();
  await expect(review).toContainText("You are depositing");
  await expect(page.getByTestId("earn-review-position")).toBeVisible();

  await page.getByTestId("earn-review-confirm").click();

  await expect(page.getByTestId("earn-submit")).toBeVisible();
  await expect(page.getByTestId("earn-submit-done")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText("Deposited!")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 6. Pool details sheet
// ---------------------------------------------------------------------------
test("pool details sheet shows market stats including Backstop", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({ page, extensionId, context });
  await switchToMainnet(page);
  await stubBlendEarn(page);
  await openEarnFlow(page);

  await page.getByTestId("earn-token-row-XLM").click();
  await page.getByTestId("earn-pool-card").click();

  const sheet = page.getByTestId("earn-pool-details-sheet");
  await expect(sheet).toBeVisible();
  await expect(page.getByTestId("earn-pool-interest-apy")).toContainText(
    "4.24%",
  );
  await expect(page.getByTestId("earn-pool-net-apy")).toContainText("16.94%");
  await expect(page.getByTestId("earn-pool-supplied")).toContainText("$50.05M");
  await expect(page.getByTestId("earn-pool-borrowed")).toContainText("$16.15M");

  // Rendered from backstop_usd when the catalog supplies it; "--" otherwise, so
  // the row never implies a pool has no insurance when the value is simply
  // unavailable.
  await expect(page.getByTestId("earn-pool-backstop")).toContainText("$1.53M");
});

// ---------------------------------------------------------------------------
// 7. Network gating
// ---------------------------------------------------------------------------
test("Earn tile is hidden on a network with no allowlisted pool", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  // The default test network is futurenet/testnet-style; the tile only renders
  // where BLEND_FIXED_POOL_IDS has an entry, so there is never a dead entry.
  await loginToTestAccount({ page, extensionId, context });
  await stubBlendEarn(page);

  await expect(page.getByTestId("nav-link-send")).toBeVisible();
  await expect(page.getByTestId("nav-link-earn")).toBeHidden();
});
