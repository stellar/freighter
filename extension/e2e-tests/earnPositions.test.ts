/**
 * E2E spec: Home's Positions tab
 *
 * Covers:
 *  1. Empty state: the projection card, and Start Earning -> Earn, carrying
 *     `?source=positions_empty`. A dropped or wrong `source` fails silently
 *     (falls back to "home"), so the resulting URL is the cheapest guard.
 *  2. A pool card opens the pool's position screen, and its back arrow
 *     returns to the tab.
 *  3. The Deposit pill under the cards enters Earn with `?source=positions_pill`.
 *  4. A supplied token opens its position screen: deposits and earnings, the
 *     Activity list decoded from History's Blend calls, and the Overview tab's
 *     link to the pool's contract on Stellar Expert.
 *  5. Deposit from a token's position lands on the amount screen prefilled
 *     with that token.
 *
 * Paths: tab -> pool card -> pool screen -> a supplied token -> token screen.
 * Both screens are sheets over Home, so closing them needs no navigation.
 *
 * Stub URL shapes, all on the CONTEXT (see stubBlendEarn's own comment in
 * stubs.ts for the full rationale — these are backend-v2 endpoints the
 * background service worker fetches, not the popup):
 *  - positions:    "**\/accounts/positions**" — registered by stubBlendEarn
 *    with real figures below. A baseline, position-less version of this same
 *    route is registered for every suite by stubAllExternalApis (via
 *    stubAccountPositions), since Home requests positions on every load;
 *    stubBlendEarn registers the route again, later, so it wins the match
 *    wherever a test opts in through loginToTestAccount's stubOverrides.
 *  - earn options: "**\/protocols/blend/earn-options**" — prices the empty
 *    state's "Earn up to" projection.
 *  - pool catalog: "**\/protocols/blend/pools**" — the token screen's Deposit
 *    prefills the flow from it.
 *  - history:      "/account-history/" — stubAccountHistoryWith, with
 *    blendActivityHistory's Blend `submit` envelopes for the Activity list.
 *
 * Asset ids in positionsFixture are the REAL mainnet SACs, same discipline
 * stubBlendEarn documents: getCatalogAssetIdentity resolves a row's displayed
 * code by deriving its SAC, so a placeholder id would leave it blank.
 *
 * No switchToMainnet here: Testnet (where login lands) has its own
 * BLEND_FIXED_POOL_IDS entry, so the Positions tab and its screens are
 * reachable straight after login — see earnDeposit.test.ts's network-gating
 * test for the same reasoning, and @shared/constants/blend for the map
 * itself. The tab needs the `positions_enabled` flag and its deposit entry points
 * the `earn_deposit` flag; stubAmplitudeFlags pins them on before login.
 *
 * testid index:
 *  - account-tab-positions            AccountTabs/index.tsx
 *  - account-positions-empty          AccountPositions/EmptyState.tsx
 *  - account-positions-projection     AccountPositions/EmptyState.tsx
 *  - account-positions-start-earning  AccountPositions/EmptyState.tsx
 *  - pool-card-<POOL_ID>              AccountPositions/PoolCard.tsx
 *  - positions-deposit-btn            AccountPositions/index.tsx
 *  - pool-position-screen             AccountPositions/PoolPositionScreen.tsx
 *  - pool-position-total              AccountPositions/PoolPositionScreen.tsx
 *  - position-row-<CODE>              AccountPositions/PoolPositionScreen.tsx
 *  - token-position-screen            AccountPositions/TokenPositionScreen.tsx
 *  - token-position-deposit           AccountPositions/TokenPositionScreen.tsx
 *  - token-position-overview          AccountPositions/TokenPositionScreen.tsx
 *  - token-position-explorer-link     AccountPositions/TokenPositionScreen.tsx
 *  - earn-position-deposit-usd-<CODE> AccountPositions/TokenPositionScreen.tsx
 *  - position-tab-<TAB>               AccountPositions/PositionTabs.tsx
 *  - position-activity(-row)          earn/PositionActivity/index.tsx
 *  - BackButton                       basics/buttons/BackButton (both screens)
 *  - earn-pool-card                   EarnAmount/PoolCard.tsx
 *  - send-amount-edit-dest-asset      amount/AmountCard/index.tsx (shared with
 *    Send/Swap — earn-token-code does not exist on the amount screen; this is
 *    the established id those other specs already use to assert the selected
 *    token)
 *  - earn                             views/Earn/index.tsx (root)
 *
 * Execution: `yarn test:e2e earnPositions.test.ts` from repo root.
 */

import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { NETWORKS } from "@shared/constants/stellar";

import { test, expect } from "./test-fixtures";
import { loginToTestAccount, switchToMainnet } from "./helpers/login";
import {
  blendActivityHistory,
  positionsFixture,
  stubAccountHistoryWith,
  stubHorizonTransactionsFor,
  stubBlendEarn,
  stubAmplitudeFlags,
} from "./helpers/stubs";

const POOL_ID = BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!;

// ---------------------------------------------------------------------------
// 1. Empty state -> Start Earning -> Earn, carrying its analytics source
// ---------------------------------------------------------------------------
test("Positions tab shows the empty state and enters Earn", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await stubAmplitudeFlags(context, {
    positions_enabled: true,
    earn_deposit: true,
  });
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () => stubBlendEarn(page, context),
  });

  await page.getByTestId("account-tab-positions").click();
  await expect(page.getByTestId("account-positions-empty")).toBeVisible();
  await expect(page.getByTestId("account-positions-projection")).toBeVisible();

  await page.getByTestId("account-positions-start-earning").click();
  await expect(page.getByTestId("earn")).toBeVisible();

  // The one thing this test exists to pin down: the empty state's CTA must
  // carry EARN_SOURCE.POSITIONS_EMPTY, not silently drop to the "home"
  // fallback getEarnSourceFromSearch uses for an absent or unrecognised value.
  await expect(page).toHaveURL(/source=positions_empty/);
});

// ---------------------------------------------------------------------------
// 2. A pool card opens the pool's screen; back returns to the tab
// ---------------------------------------------------------------------------
test("a pool card opens its position screen", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  // Deposit off: the tab's deposit entries must stay hidden.
  await stubAmplitudeFlags(context, {
    positions_enabled: true,
    earn_deposit: false,
  });

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () =>
      stubBlendEarn(page, context, { positions: positionsFixture() }),
  });

  await page.getByTestId("account-tab-positions").click();
  await expect(page.getByTestId(`pool-card-${POOL_ID}`)).toBeVisible();
  await expect(page.getByTestId("positions-deposit-btn")).toHaveCount(0);
  await page.getByTestId(`pool-card-${POOL_ID}`).click();

  const screen = page.getByTestId("pool-position-screen");
  await expect(screen).toBeVisible();
  await expect(page.getByTestId("pool-position-total")).toHaveText("$500.12");
  await expect(page.getByTestId("position-row-USDC")).toBeVisible();

  await page.getByTestId("BackButton").click();
  await expect(screen).toBeHidden();
  await expect(page.getByTestId(`pool-card-${POOL_ID}`)).toBeVisible();
});

// ---------------------------------------------------------------------------
// 3. The Deposit pill under the cards enters Earn with its own source
// ---------------------------------------------------------------------------
test("the Deposit pill enters Earn with its source", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await stubAmplitudeFlags(context, {
    positions_enabled: true,
    earn_deposit: true,
  });
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () =>
      stubBlendEarn(page, context, { positions: positionsFixture() }),
  });

  await page.getByTestId("account-tab-positions").click();
  await page.getByTestId("positions-deposit-btn").click();

  await expect(page.getByTestId("earn")).toBeVisible();
  await expect(page).toHaveURL(/source=positions_pill/);
});

// ---------------------------------------------------------------------------
// 4. A supplied token's screen: figures, Activity, and the Overview links
// ---------------------------------------------------------------------------
test("a supplied token shows its position, activity and pool links", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  // Deposit off: the tab's deposit entries must stay hidden.
  await stubAmplitudeFlags(context, {
    positions_enabled: true,
    earn_deposit: false,
  });

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      const history = blendActivityHistory({
        events: [
          {
            id: "2",
            type: "withdraw",
            assetCode: "USDC",
            amount: "120",
            createdAt: "2026-10-02T09:12:00Z",
          },
          {
            id: "1",
            type: "deposit",
            assetCode: "USDC",
            amount: "620",
            createdAt: "2026-08-28T14:33:00Z",
          },
        ],
      });
      await stubAccountHistoryWith(page, context, history);
      // A row's details sheet reads its transaction from Horizon by hash.
      await stubHorizonTransactionsFor(page, history);
      // Last, as it reloads the popup once every route is in place.
      await stubBlendEarn(page, context, { positions: positionsFixture() });
    },
  });

  await page.getByTestId("account-tab-positions").click();
  await page.getByTestId(`pool-card-${POOL_ID}`).click();
  // The pool's screen sums every token; a token's screen is named for it.
  const headerTitle = (text: string) =>
    page.getByTestId("AppHeaderPageTitle").filter({ hasText: text });
  await expect(headerTitle("Position details")).toBeVisible();
  await page.getByTestId("position-row-USDC").click();

  await expect(page.getByTestId("token-position-screen")).toBeVisible();
  await expect(page.getByTestId("token-position-deposit")).toHaveCount(0);
  await expect(headerTitle("USDC position")).toBeVisible();
  // Principal: the balance less the interest it earned ($500.12 - $0.12).
  await expect(page.getByTestId("earn-position-deposit-usd-USDC")).toHaveText(
    "$500.00",
  );

  // Newest first, as History is.
  const rows = page.getByTestId("position-activity-row");
  await expect(rows).toHaveCount(2);
  await expect(rows.nth(0)).toContainText("Withdraw");
  await expect(rows.nth(0)).toContainText("-120.00 USDC");
  await expect(rows.nth(1)).toContainText("Deposit");
  await expect(rows.nth(1)).toContainText("+620.00 USDC");

  // A withdrawal opens its details, unsigned: the title says which way.
  await rows.nth(0).click();
  const withdrawal = page.getByTestId("earn-withdraw-details");
  await expect(withdrawal).toContainText("Withdrew USDC");
  await expect(page.getByTestId("earn-withdraw-details-amount")).toHaveText(
    "120.00 USDC",
  );
  await expect(page.getByTestId("earn-withdraw-details-fee")).toHaveText(
    "0.00001 XLM",
  );
  // Its full breakdown comes from the envelope Horizon returned.
  await page.getByTestId("earn-withdraw-details-btn").click();
  await expect(page.getByTestId("earn-withdraw-details-pane")).toBeVisible();
  await page.getByTestId("earn-withdraw-details-close").click();
  await page.getByTestId("earn-withdraw-details-close").click();
  await expect(withdrawal).toBeHidden();

  await rows.nth(1).click();
  await expect(page.getByTestId("earn-deposit-details")).toContainText(
    "Deposited USDC",
  );
  await expect(page.getByTestId("earn-deposit-details-amount")).toHaveText(
    "620.00 USDC",
  );
  await page.getByTestId("earn-deposit-details-close").click();
  await expect(page.getByTestId("earn-deposit-details")).toBeHidden();

  await page.getByTestId("position-tab-overview").click();
  await expect(page.getByTestId("token-position-overview")).toBeVisible();

  const explorerPromise = page.context().waitForEvent("page");
  await page.getByTestId("token-position-explorer-link").click();
  const explorer = await explorerPromise;
  await expect(explorer).toHaveURL(
    new RegExp(`stellar\\.expert/explorer/testnet/contract/${POOL_ID}`),
  );
});

// ---------------------------------------------------------------------------
// 5. Deposit from a token's position lands on the amount screen
// ---------------------------------------------------------------------------
test("Deposit from a token's position lands on the amount screen prefilled", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await stubAmplitudeFlags(context, {
    positions_enabled: true,
    earn_deposit: true,
  });
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () =>
      stubBlendEarn(page, context, { positions: positionsFixture() }),
  });
  // Deposit is offered only on the pool Earn offers, the network's own Fixed
  // pool; the fixture's position is in Mainnet's.
  await switchToMainnet(page);

  await page.getByTestId("account-tab-positions").click();
  await page.getByTestId(`pool-card-${POOL_ID}`).click();
  await page.getByTestId("position-row-USDC").click();
  await page.getByTestId("token-position-deposit").click();

  await expect(page.getByTestId("earn-pool-card")).toBeVisible();
  await expect(page.getByTestId("send-amount-edit-dest-asset")).toContainText(
    "USDC",
  );
  await expect(page).toHaveURL(/source=position_row/);
});

// ---------------------------------------------------------------------------
// 6. The tab waits on its flag
// ---------------------------------------------------------------------------
test("the Positions tab stays hidden while positions_enabled is off", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  // Deposit on, Positions off: Home keeps its Earn tile but not the tab.
  await stubAmplitudeFlags(context, {
    positions_enabled: false,
    earn_deposit: true,
  });
  let positionsRequests = 0;
  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: async () => {
      // The background fetches positions, so only a context route sees it.
      // Registered after stubAllExternalApis' positions route, it counts and
      // then hands the request on to it.
      await context.route("**/accounts/positions**", (route) => {
        positionsRequests += 1;
        return route.fallback();
      });
      // Home loaded before this route existed; load it again through it.
      await page.reload();
    },
  });

  // Balances land after the positions request would have gone out: both wait
  // on the flags, and positions starts first.
  await expect(page.getByTestId("account-assets")).toBeVisible();
  await expect(page.getByTestId("account-tab-tokens")).toBeVisible();
  await expect(page.getByTestId("account-tab-positions")).toHaveCount(0);
  expect(positionsRequests).toBe(0);
});
