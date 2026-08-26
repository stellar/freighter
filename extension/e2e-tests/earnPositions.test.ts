/**
 * E2E spec: Home's Positions tab
 *
 * Covers:
 *  1. Empty state: the projection card, and Start Earning -> Earn, carrying
 *     `?source=positions_empty` — the analytics attribution a previous task
 *     added for this entry point. It has no other coverage anywhere, and a
 *     dropped or wrong `source` fails silently (falls back to "home"), so the
 *     resulting URL is the cheapest guard against that regression.
 *  2. A pool card: opens the "My position" sheet, showing the pool's total.
 *  3. About pool: opens the pool-details sheet with the tab strip hidden.
 *  4. Deposit from a supplied-asset row: lands on the amount screen
 *     prefilled with the tapped token.
 *
 * The redesign added a pool-first "My position" sheet between the Positions
 * tab and the pool-details sheet — every path below is one click deeper than
 * it used to be: tab -> pool card -> My position -> (About pool | a supplied
 * asset) -> pool-details sheet.
 *
 * Stub URL shapes, all on the CONTEXT (see stubBlendEarn's own comment in
 * stubs.ts for the full rationale — these are backend-v2 endpoints the
 * background service worker fetches, not the popup):
 *  - positions:    "**\/accounts/positions**" — registered by stubBlendEarn
 *    with real figures below. A baseline, position-less version of this same
 *    route is registered for every suite by stubAllExternalApis (via
 *    stubAccountPositions), since Home now requests positions on every load;
 *    stubBlendEarn registers the route again, later, so it wins the match
 *    wherever a test opts in through loginToTestAccount's stubOverrides.
 *  - earn options: "**\/protocols/blend/earn-options**" — prices the empty
 *    state's "you could earn up to" projection.
 *  - pool catalog: "**\/protocols/blend/pools**" — backs the pool-details
 *    sheet a supplied-asset row opens.
 *
 * Asset ids in positionsFixture are the REAL mainnet SACs, same discipline
 * stubBlendEarn documents: getCatalogAssetIdentity resolves a row's displayed
 * code by deriving its SAC, so a placeholder id would leave it blank.
 *
 * No switchToMainnet here: Testnet (where login lands) has its own
 * BLEND_FIXED_POOL_IDS entry, so the Positions tab and its sheets are
 * reachable straight after login — see earnDeposit.test.ts's network-gating
 * test for the same reasoning, and @shared/constants/blend for the map
 * itself.
 *
 * testid index:
 *  - account-tab-positions            AccountTabs/index.tsx
 *  - account-positions-empty          AccountPositions/EmptyState.tsx
 *  - account-positions-projection     AccountPositions/EmptyState.tsx
 *  - account-positions-start-earning  AccountPositions/EmptyState.tsx
 *  - pool-card-<POOL_ID>              AccountPositions/PoolCard.tsx
 *  - my-position-sheet                AccountPositions/MyPosition.tsx
 *  - my-position-total                AccountPositions/MyPosition.tsx
 *  - my-position-close                AccountPositions/MyPosition.tsx
 *  - my-position-about-pool           AccountPositions/MyPosition.tsx
 *  - position-row-<CODE>              AccountPositions/PositionRow.tsx
 *  - earn-pool-details-sheet          PoolDetailsSheet/index.tsx
 *  - earn-pool-details-tabs           PoolDetailsSheet/Tabs.tsx
 *  - earn-pool-card                   EarnAmount/PoolCard.tsx
 *  - send-amount-edit-dest-asset      amount/AmountCard/index.tsx (shared with
 *    Send/Swap — earn-token-code does not exist on the amount screen; this is
 *    the established id those other specs already use to assert the selected
 *    token)
 *  - earn                             views/Earn/index.tsx (root)
 *
 * Execution: `yarn test:e2e earnPositions.test.ts` from repo root.
 */

import { test, expect } from "./test-fixtures";
import { loginToTestAccount } from "./helpers/login";
import { stubBlendEarn, positionsFixture } from "./helpers/stubs";

// ---------------------------------------------------------------------------
// 1. Empty state -> Start Earning -> Earn, carrying its analytics source
// ---------------------------------------------------------------------------
test("Positions tab shows the empty state and enters Earn", async ({
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
// 2. A pool card opens My position
// ---------------------------------------------------------------------------
test("a pool card opens My position", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () =>
      stubBlendEarn(context, { positions: positionsFixture() }),
  });

  await page.getByTestId("account-tab-positions").click();
  await page
    .getByTestId(/^pool-card-/)
    .first()
    .click();

  await expect(page.getByTestId("my-position-sheet")).toBeVisible();
  await expect(page.getByTestId("my-position-total")).toBeVisible();
});

// ---------------------------------------------------------------------------
// 3. About pool opens the pool-details sheet with the tab strip hidden
// ---------------------------------------------------------------------------
test("About pool opens the sheet with no tabs", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () =>
      stubBlendEarn(context, { positions: positionsFixture() }),
  });

  await page.getByTestId("account-tab-positions").click();
  await page
    .getByTestId(/^pool-card-/)
    .first()
    .click();
  await page.getByTestId("my-position-about-pool").click();

  await expect(page.getByTestId("earn-pool-details-sheet")).toBeVisible();
  await expect(page.getByTestId("earn-pool-details-tabs")).toBeHidden();
});

// ---------------------------------------------------------------------------
// 4. Deposit from a supplied asset lands on the amount screen
// ---------------------------------------------------------------------------
test("Deposit from a supplied asset lands on the amount screen prefilled", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  await loginToTestAccount({
    page,
    extensionId,
    context,
    stubOverrides: () =>
      stubBlendEarn(context, { positions: positionsFixture() }),
  });

  await page.getByTestId("account-tab-positions").click();
  await page
    .getByTestId(/^pool-card-/)
    .first()
    .click();
  await page.getByTestId("position-row-USDC").click();

  // Scoped to the sheet and to the button role: "Your deposits" is also on
  // screen (the sheet opens on "Your position" by default), and the Home
  // action row's floating "Deposit" add-button is on screen too — a plain
  // getByText("Deposit") resolves to all three and violates strict mode.
  await page
    .getByTestId("earn-pool-details-sheet")
    .getByRole("button", { name: "Deposit" })
    .click();

  await expect(page.getByTestId("earn-pool-card")).toBeVisible();
  await expect(page.getByTestId("send-amount-edit-dest-asset")).toContainText(
    "USDC",
  );
});
