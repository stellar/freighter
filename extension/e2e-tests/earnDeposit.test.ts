/**
 * E2E spec: Earn deposit flow (Blend)
 *
 * Covers:
 *  1. Entry point + first-run interstitial, then skipped on re-entry
 *  2. Token picker: held vs supported sections, APY badges
 *  3. "Not enough X" sheet — EURC (swap/transfer, no Buy: not Coinbase-listed)
 *  4. "Not enough X" sheet — USDC (buy + swap + transfer)
 *  5. Held-token happy path: Max bounces off the fee guard, then a smaller
 *     amount -> review -> confirm -> Deposited!
 *  6. Pool details sheet, including its Backstop row
 *  7. Earn tile hidden on a custom network with no allowlisted pool
 *
 * Stub URL shapes (all registered by stubBlendEarn), on the CONTEXT:
 *  - earn options:  "** /protocols/blend/earn-options**"
 *  - pool catalog:  "** /protocols/blend/pools**"
 *  - positions:     "** /accounts/positions**"
 *  These three are backend-v2 endpoints, which the background service worker
 *  fetches rather than the popup, so page.route never sees them — hence
 *  stubBlendEarn(context), and hence passing it through loginToTestAccount's
 *  stubOverrides so it is registered before the popup navigates.
 *
 *  The deposit's build and broadcast go through "** /simulate-tx**" and
 *  "** /submit-tx**" instead. Those stay PAGE-scoped: they are backend-v1
 *  endpoints the popup fetches directly. Test 5 overrides the shared simulate
 *  stub with stubEarnSimulateTx, whose prepared XDR actually decodes — the
 *  shared one's placeholder does not, and signing rejects it.
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
 *  - earn-token-picker-close   EarnTokenPicker/index.tsx
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
import { stubBlendEarn, stubEarnSimulateTx } from "./helpers/stubs";

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

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(context),
  });
  await switchToMainnet(page);

  await openEarnFlow(page);

  // Leave and re-enter: the dismissal is persisted in the background store, so
  // the interstitial must not reappear. Close via the header's X by its own
  // testid rather than the first button in the subtree — the picker's rows are
  // buttons too, so `.first()` is only incidentally the close control. The
  // picker owns that X directly; it no longer goes through SubviewHeader, so
  // there is no BackButton to reach for.
  await page
    .getByTestId("earn-token-picker")
    .getByTestId("earn-token-picker-close")
    .click();
  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

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

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(context),
  });
  await switchToMainnet(page);
  await openEarnFlow(page);

  // The test account holds only XLM, so XLM is the sole held row and the other
  // two reserves fall into "Other supported assets" — the heading only reads
  // "Supported tokens" when nothing is held, where there is no "other" to be
  // other than. Scoped to the picker: the Earn view keeps every visited step
  // mounted, and the intro and the picker now share a subtitle, so an unscoped
  // getByText would match both screens.
  const picker = page.getByTestId("earn-token-picker");
  await expect(picker.getByText("In your wallet")).toBeVisible();
  await expect(picker.getByText("Other supported assets")).toBeVisible();

  await expect(page.getByTestId("earn-token-row-XLM")).toBeVisible();
  await expect(page.getByTestId("earn-token-row-USDC")).toBeVisible();
  await expect(page.getByTestId("earn-token-row-EURC")).toBeVisible();

  await expect(page.getByTestId("earn-apy-USDC")).toContainText("16.94%");
  await expect(page.getByTestId("earn-apy-EURC")).toContainText("10.59%");

  await expect(
    picker.getByText("APY may change based on protocol conditions.", {
      exact: false,
    }),
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

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(context),
  });
  await switchToMainnet(page);
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

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(context),
  });
  await switchToMainnet(page);
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

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await stubBlendEarn(context);
      // Only this test signs and broadcasts, so it is the only one that needs a
      // decodable prepared XDR out of /simulate-tx.
      await stubEarnSimulateTx(page);
    },
  });
  await switchToMainnet(page);
  await openEarnFlow(page);

  await page.getByTestId("earn-token-row-XLM").click();
  await expect(page.getByTestId("earn-amount")).toBeVisible();

  // The CTA stays disabled until there is an amount to review.
  await expect(page.getByTestId("earn-amount-btn-continue")).toBeDisabled();

  // Max deliberately offers the whole spendable balance — nothing is held back
  // for the Soroban resource fee, which is only knowable after simulation. So
  // Max on XLM is expected to bounce off the post-simulation guard rather than
  // open Review, and the CTA handler is where that check runs.
  await page.getByTestId("SendAmountSetMax").click();
  await expect(page.getByTestId("earn-amount-btn-continue")).toBeEnabled();
  await page.getByTestId("earn-amount-btn-continue").click();

  await expect(
    page.getByText("Not enough XLM left for the network fee", { exact: false }),
  ).toBeVisible();
  await expect(page.getByTestId("earn-review")).toBeHidden();

  // Reduce to an amount that leaves room for the fee and the deposit proceeds.
  await page
    .getByTestId("earn-amount")
    .getByTestId("send-amount-amount-input")
    .fill("100");
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

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(context),
  });
  await switchToMainnet(page);
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

  await expect(page.getByTestId("earn-pool-docs-link")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 7. Network gating
// ---------------------------------------------------------------------------
test("Earn tile is hidden on a custom network with no allowlisted pool", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  // Both stock networks the selector offers — Testnet (where login lands) and
  // Mainnet — have a BLEND_FIXED_POOL_IDS entry, so neither exercises the gate.
  // A custom network is the only reachable one without an allowlisted pool.
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(context),
  });

  await expect(page.getByTestId("nav-link-earn")).toBeVisible();

  await page.getByTestId("account-options-dropdown").click();
  await page.getByText("Settings").click();
  await page.getByText("Network").click();
  await page.getByText("Add custom network").click();
  await page.getByTestId("NetworkForm__networkName").fill("test standalone");
  await page
    .getByTestId("NetworkForm__networkUrl")
    .fill("https://horizon-testnet.stellar.org");
  await page
    .getByTestId("NetworkForm__sorobanRpcUrl")
    .fill("https://soroban-testnet.stellar.org/");
  await page
    .getByTestId("NetworkForm__networkPassphrase")
    .fill("Test SDF Network ; September 2015");
  await page.getByTestId("NetworkForm__add").click();
  await page.getByTestId("BackButton").click();
  await page.getByTestId("BackButton").click();

  await expect(page.getByTestId("account-view")).toBeVisible({
    timeout: 30000,
  });

  // Adding a network does not select it, so switch to it explicitly — the tile
  // is gated on the ACTIVE network, and without this the account is still on
  // Testnet, which does have an allowlisted pool.
  await page.getByTestId("network-selector-open").click();
  await page.getByText("test standalone").click();
  await expect(page.getByTestId("network-selector-open")).toContainText(
    "test standalone",
    { timeout: 30000 },
  );

  // Send stays available everywhere, so it pins that the action row rendered at
  // all — otherwise a blank row would satisfy the Earn assertion on its own.
  await expect(page.getByTestId("nav-link-send")).toBeVisible();
  await expect(page.getByTestId("nav-link-earn")).toBeHidden();
});
