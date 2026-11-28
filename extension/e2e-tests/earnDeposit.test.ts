/**
 * E2E spec: Earn deposit flow (Blend)
 *
 * Covers:
 *  1. Entry point + first-run interstitial, then skipped on re-entry
 *  2. Token picker: held vs supported sections, APY badges
 *  3. "Not enough X" sheet — EURC (swap/receive, no Buy: not Coinbase-listed),
 *     and the Receive sheet it opens in place
 *  4. "Not enough X" sheet — USDC (buy + swap + transfer); Buy opens Add Funds
 *     on USDC, and its X returns to the picker
 *  5. Held-token happy path: a typed amount short of the fee is left to the
 *     user, Max is lowered by the fee -> review -> confirm -> Deposit complete
 *  5b. After Done, Positions show the deposit as soon as the indexer has it,
 *     well before the 30s poll, stop re-reading once they do, and keep it
 *     shown while the rest of Home's load lands
 *  6. Pool details sheet, including its Backstop row
 *  7. Earn tile hidden on a custom network with no allowlisted pool
 *
 * Stub URL shapes (all registered by stubBlendEarn), on the CONTEXT:
 *  - earn options:  "** /protocols/blend/earn-options**"
 *  - pool catalog:  "** /protocols/blend/pools**"
 *  - positions:     "** /accounts/positions**"
 *  These three are backend-v2 endpoints, which the background service worker
 *  fetches rather than the popup, so page.route never sees them — hence
 *  context.route for those three inside stubBlendEarn. The fourth route it
 *  registers, the `earn_deposit` Amplitude vardata stub, is PAGE-scoped in
 *  effect too: stubBlendEarn takes `page` and reloads once every route is in
 *  place, because loginToTestAccount's stubOverrides runs after page.goto has
 *  already navigated — by then the popup's one-shot flag fetch has typically
 *  already fired and failed against the real (unreachable) endpoint, so
 *  registering the route alone is too late without the reload.
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
 *  - earn-receive-sheet        EarnReceiveSheet/index.tsx
 *  - earn-receive-back         EarnReceiveSheet/index.tsx
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

import BigNumber from "bignumber.js";
import { test, expect } from "./test-fixtures";
import { BrowserContext, Page } from "@playwright/test";
import { loginToTestAccount, switchToMainnet } from "./helpers/login";
import { expectHomeReady, goToSettings } from "./helpers/network";
import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { NETWORKS } from "@shared/constants/stellar";
import {
  EARN_SIMULATED_RESOURCE_FEE_STROOPS,
  positionsFixture,
  TEST_ACCOUNT_PUBLIC_KEY,
  stubBlendEarn,
  stubEarnDepositFlag,
  stubEarnSimulateTx,
} from "./helpers/stubs";

const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;

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

  await stubEarnDepositFlag(context);
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(page, context),
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

  await stubEarnDepositFlag(context);
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(page, context),
  });
  await switchToMainnet(page);
  await openEarnFlow(page);

  // The test account holds only XLM, so XLM is the sole held row and the other
  // two reserves fall under "Supported tokens". Scoped to the picker: the Earn
  // view keeps every visited step mounted, so an unscoped getByText could match
  // another screen.
  const picker = page.getByTestId("earn-token-picker");
  await expect(picker.getByText("In your wallet")).toBeVisible();
  await expect(picker.getByText("Supported tokens")).toBeVisible();

  await expect(page.getByTestId("earn-token-row-XLM")).toBeVisible();
  await expect(page.getByTestId("earn-token-row-USDC")).toBeVisible();
  await expect(page.getByTestId("earn-token-row-EURC")).toBeVisible();

  await expect(page.getByTestId("earn-apy-USDC")).toContainText("16.94%");
  await expect(page.getByTestId("earn-apy-EURC")).toContainText("10.59%");

  await expect(
    picker.getByText("APY is variable and subject to change.", {
      exact: false,
    }),
  ).toBeVisible();

  // The XLM row shows the spendable XLM, the figure the deposit screen offers,
  // not the balance with the minimum balance in it.
  const xlmRow = page.getByTestId("earn-token-row-XLM");
  await expect(xlmRow).not.toContainText("10,000 XLM");
  const rowAmount = (await xlmRow.innerText()).match(/[\d,.]+ XLM/)![0];
  await xlmRow.click();
  await expect(
    page.getByTestId("earn-amount").locator(".AmountCard__available-balance"),
  ).toContainText(`${rowAmount} available`);
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

  await stubEarnDepositFlag(context);
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(page, context),
  });
  await switchToMainnet(page);
  await openEarnFlow(page);

  await page.getByTestId("earn-token-row-EURC").click();

  const sheet = page.getByTestId("earn-not-enough-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet).toContainText("Not enough EURC");
  await expect(sheet).toContainText("Swap or transfer EURC to continue.");
  await expect(page.getByTestId("earn-not-enough-swap")).toBeVisible();
  await expect(page.getByTestId("earn-not-enough-transfer")).toBeVisible();
  await expect(page.getByTestId("earn-not-enough-buy")).toBeHidden();

  // Receive takes over the sheet, and its back arrow returns to it.
  await page.getByTestId("earn-not-enough-transfer").click();
  await expect(page.getByTestId("earn-receive-sheet")).toBeVisible();
  await expect(page.getByTestId("earn-receive-sheet")).toContainText(
    "This address supports Stellar network.",
  );
  await page.getByTestId("earn-receive-back").click();
  await expect(page.getByTestId("earn-not-enough-sheet")).toBeVisible();
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

  await stubEarnDepositFlag(context);
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(page, context),
  });
  await switchToMainnet(page);
  await openEarnFlow(page);

  await page.getByTestId("earn-token-row-USDC").click();

  await expect(page.getByTestId("earn-not-enough-sheet")).toContainText(
    "Not enough USDC",
  );
  await expect(page.getByTestId("earn-not-enough-sheet")).toContainText(
    "Swap, buy or transfer USDC to continue.",
  );
  await expect(page.getByTestId("earn-not-enough-buy")).toBeVisible();
  await expect(page.getByTestId("earn-not-enough-swap")).toBeVisible();
  await expect(page.getByTestId("earn-not-enough-transfer")).toBeVisible();

  // Buy goes through Add Funds, as on mobile, and closing it comes back to
  // Earn's picker.
  await page.getByTestId("earn-not-enough-buy").click();
  await expect(page.getByTestId("add-coinbase-button")).toBeVisible();
  await expect(page).toHaveURL(/add-funds\?token=USDC/);
  await page.getByTestId("BackButton").click();
  await expect(page.getByTestId("earn-token-picker")).toBeVisible();
  await expect(page.getByTestId("earn-not-enough-sheet")).toBeHidden();
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

  await stubEarnDepositFlag(context);
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await stubBlendEarn(page, context);
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

  // Max offers the whole spendable balance: nothing is held back for the
  // Soroban resource fee, which is only known after simulation.
  const amountInput = page
    .getByTestId("earn-amount")
    .getByTestId("send-amount-amount-input");
  await page.getByTestId("SendAmountSetMax").click();
  const maxAmount = new BigNumber(
    (await amountInput.inputValue()).replace(/,/g, ""),
  );
  const resourceFee = new BigNumber(
    EARN_SIMULATED_RESOURCE_FEE_STROOPS,
  ).shiftedBy(-7);

  // A typed amount that leaves too little for the fee is the user's to lower.
  await amountInput.fill(maxAmount.minus("0.01").toFixed());
  await expect(page.getByTestId("earn-amount-btn-continue")).toBeEnabled();
  await page.getByTestId("earn-amount-btn-continue").click();

  await expect(
    page.getByText("Not enough XLM left for the network fee", { exact: false }),
  ).toBeVisible();
  await expect(page.getByTestId("earn-review")).toBeHidden();

  // Max is lowered by the measured fee instead, and Review opens on that.
  await page.getByTestId("SendAmountSetMax").click();
  await expect(page.getByTestId("earn-amount-btn-continue")).toBeEnabled();
  await page.getByTestId("earn-amount-btn-continue").click();

  const review = page.getByTestId("earn-review");
  await expect(review).toBeVisible();
  await expect(review).toContainText("You are depositing");
  const fittedAmount = maxAmount.minus(resourceFee).toFixed();
  const reviewedAmount =
    (await page.getByTestId("earn-review-amount").textContent()) ?? "";
  expect(reviewedAmount.replace(/,/g, "")).toContain(`${fittedAmount} XLM`);
  // The field says it too.
  expect((await amountInput.inputValue()).replace(/,/g, "")).toBe(fittedAmount);
  await expect(page.getByTestId("earn-review-position")).toBeVisible();

  await page.getByTestId("earn-review-confirm").click();

  await expect(page.getByTestId("earn-submit")).toBeVisible();
  await expect(page.getByTestId("earn-submit-done")).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText("Deposit complete")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 5b. Positions catch up with a deposit the indexer has not reached yet
// ---------------------------------------------------------------------------

/**
 * Deposits 100 XLM and returns to Home's Positions tab, with positions served
 * the way an indexer that trails the ledger serves them: the old state (no
 * position) for `lagReads` reads after the deposit lands, the XLM one after.
 * `scanDelayMs` holds back Home's Blockaid-scanned balances read, which lands
 * after its positions, by that much once the deposit is done.
 */
const depositAndOpenPositions = async ({
  page,
  extensionId,
  context,
  lagReads,
  scanDelayMs = 0,
}: {
  page: Page;
  extensionId: string;
  context: BrowserContext;
  lagReads: number;
  scanDelayMs?: number;
}) => {
  let isDeposited = false;
  let readsSinceDeposit = 0;

  await stubEarnDepositFlag(context);
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      await stubBlendEarn(page, context);
      await stubEarnSimulateTx(page);
      // Registered after stubBlendEarn's, so it wins the match.
      await context.route("**/accounts/positions**", async (route) => {
        if (isDeposited) {
          readsSinceDeposit += 1;
        }
        const hasIndexed = isDeposited && readsSinceDeposit > lagReads;
        await route.fulfill({
          json: {
            data: hasIndexed
              ? positionsFixture({ assets: ["XLM"] })
              : [
                  {
                    address: TEST_ACCOUNT_PUBLIC_KEY,
                    total_value_usd: null,
                    net_apy: null,
                    positions: [],
                    backstop: [],
                  },
                ],
          },
        });
      });
      // Registered after the shared balances stub, so it runs first and hands
      // the request on to it.
      await page.route("**/account-balances/**", async (route) => {
        const isScanned = !route
          .request()
          .url()
          .includes("should_skip_scan=true");
        if (isDeposited && isScanned && scanDelayMs) {
          await new Promise((resolve) => setTimeout(resolve, scanDelayMs));
        }
        await route.fallback();
      });
    },
  });
  await switchToMainnet(page);
  await openEarnFlow(page);

  await page.getByTestId("earn-token-row-XLM").click();
  await page
    .getByTestId("earn-amount")
    .getByTestId("send-amount-amount-input")
    .fill("100");
  await page.getByTestId("earn-amount-btn-continue").click();
  await expect(page.getByTestId("earn-review")).toBeVisible();
  await page.getByTestId("earn-review-confirm").click();
  await expect(page.getByTestId("earn-submit-done")).toBeVisible({
    timeout: 30000,
  });
  isDeposited = true;
  await page.getByTestId("earn-submit-done").click();
  await page.getByTestId("account-tab-positions").click();

  return { readsSinceDeposit: () => readsSinceDeposit };
};

test("a deposit shows in Positions once the indexer has it", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const lagReads = 2;
  const { readsSinceDeposit } = await depositAndOpenPositions({
    page,
    extensionId,
    context,
    lagReads,
  });

  // Home loads the cached, pre-deposit positions, then keeps re-reading until
  // the deposit shows. Well inside the 30s poll, which this must not rely on.
  await expect(page.getByTestId(`pool-card-${POOL_ID}`)).toBeVisible({
    timeout: 12000,
  });
  expect(readsSinceDeposit()).toBe(lagReads + 1);

  // Once it shows, the re-reading stops.
  await page.waitForTimeout(7000);
  expect(readsSinceDeposit()).toBe(lagReads + 1);
});

// Home's load goes on writing after its positions land: the scanned balances
// read takes seconds. That write must not put back the positions it loaded
// from the cache once a newer read has shown the deposit.
test("a deposit that shows in Positions stays shown", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  const scanDelayMs = 4000;
  await depositAndOpenPositions({
    page,
    extensionId,
    context,
    lagReads: 0,
    scanDelayMs,
  });

  const poolCard = page.getByTestId(`pool-card-${POOL_ID}`);
  await expect(poolCard).toBeVisible({ timeout: 12000 });

  // Past the scanned balances landing, the card is still there.
  await page.waitForTimeout(scanDelayMs + 3000);
  await expect(poolCard).toBeVisible();
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

  await stubEarnDepositFlag(context);
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(page, context),
  });
  await switchToMainnet(page);
  await openEarnFlow(page);

  await page.getByTestId("earn-token-row-XLM").click();
  await page.getByTestId("earn-pool-card").click();

  const sheet = page.getByTestId("earn-pool-details-sheet");
  await expect(sheet).toBeVisible();
  // The rate the deposited token earns: XLM's, picked above.
  await expect(page.getByTestId("earn-pool-deposit-apy")).toContainText(
    "0.02%",
  );
  await expect(page.getByTestId("earn-pool-supplied")).toContainText("$50.05M");
  await expect(page.getByTestId("earn-pool-borrowed")).toContainText("$16.15M");

  // Rendered from backstop_usd when the catalog supplies it; "--" otherwise, so
  // the row never implies a pool has no insurance when the value is simply
  // unavailable.
  await expect(page.getByTestId("earn-pool-backstop")).toContainText("$1.53M");

  await expect(page.getByTestId("earn-pool-app-link")).toBeVisible();
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
  await stubEarnDepositFlag(context);
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(page, context),
  });

  await expect(page.getByTestId("nav-link-earn")).toBeVisible();

  await goToSettings(page);
  await page.getByTestId("settings-network-link").click();
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

  // Adding a network does not select it, so switch to it explicitly — the tile
  // is gated on the ACTIVE network, and without this the account is still on
  // Testnet, which does have an allowlisted pool. The form returns to Network
  // settings, whose select is the only place that names the active network.
  const networkSelect = page.getByTestId("network-settings-select");
  await networkSelect.selectOption("test standalone");
  await expect(networkSelect).toHaveValue("test standalone");

  // Back out to Home: Network -> Settings -> Home.
  await page.getByTestId("BackButton").click();
  await expect(page.getByTestId("settings-network-link")).toBeVisible();
  await page.getByTestId("BackButton").click();
  await expectHomeReady(page);

  // Send stays available everywhere, so it pins that the action row rendered at
  // all — otherwise a blank row would satisfy the Earn assertion on its own.
  await expect(page.getByTestId("nav-link-send")).toBeVisible();
  await expect(page.getByTestId("nav-link-earn")).toBeHidden();
});
