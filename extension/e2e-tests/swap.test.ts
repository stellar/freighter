/**
 * E2E spec: Swap-to-New-Token flow (Phase F, Task 11)
 *
 * Covers:
 *  1. Held-to-held regression (smoke that the existing swap still works)
 *  2. Swap-to-new-token happy path: trustline banner at review
 *  3. XLM-reserve pre-flight sheet (low-XLM account)
 *  4. Blockaid-flagged destination: malicious warning at review
 *  5. Search: Soroban contract address: empty Soroban state
 *  6. stellar.expert unreachable fallback: fallback-notice shown
 *  7. Testnet: blockaid badges absent
 *
 * Stub URL shapes (reconciled against source):
 *  - Asset search:  getApiStellarExpertUrl(networkDetails) + "/asset?search=" + term
 *                   pattern: "** /asset?search**" (already in stubAllExternalApis via stubAssetSearch)
 *  - Popular fetch: mainnet ".../asset?sort=volume7d&order=desc&limit=50"
 *                   testnet ".../asset?limit=50"
 *                   patterns: "** /asset?sort=volume7d**" or "** /asset?limit=50**"
 *  - scan-tx:       "** /scan-tx**" (registered by stubScanTx in stubAllExternalApis)
 *
 * testid notes (all verified against source as of this task):
 *  - swap-sell-card              SwapAmount/index.tsx:426
 *  - swap-receive-card           SwapAmount/index.tsx:535
 *  - send-amount-edit-dest-asset AmountCard/index.tsx:202 (shared asset-selector button)
 *  - swap-from-search            SwapAsset/index.tsx:218 (search input for both src/dst pickers)
 *  - swap-amount-btn-continue    SwapAmount/index.tsx:382
 *  - review-tx-trustline-banner  TrustlineBanner.tsx:18
 *  - trustline-info-sheet        TrustlineInfoSheet.tsx:16
 *  - XlmReserveSheet             XlmReserveSheet/index.tsx:27
 *  - swap-picker-fallback-notice SwapPickerSections/index.tsx:108
 *  - swap-picker-empty-soroban   SwapPickerSections/index.tsx:123
 *  - blockaid-malicious-label    WarningMessages/index.tsx:768,933
 *
 * testids NOT yet in source (follow-up: product code would need to add them):
 *  - "swap-receive-card-select-asset" (brief assumed this; real id is "send-amount-edit-dest-asset")
 *  - "swap-asset-search-input"        (real id is "swap-from-search")
 *  - "xlm-reserve-sheet"              (real id is "XlmReserveSheet")
 *
 * Execution: `yarn test:e2e e2e-tests/swap.test.ts` from repo root.
 * This spec was NOT executed locally (Playwright E2E requires a built
 * extension + browser binary not available in the sandbox). Verified
 * statically for type/import correctness and fixture alignment.
 */

import { test, expect } from "./test-fixtures";
import { Page } from "@playwright/test";
import { loginToTestAccount, switchToMainnet } from "./helpers/login";
import { stubScanTxMalicious } from "./helpers/stubs";
// Soroban contract address — searching for this should produce the Soroban empty state.
const SOROBAN_CONTRACT_ADDRESS =
  "CAZXRTOKNUQ2JQQF3NCRU7GYMDJNZ2NMQN6IGN4FCT5DWPODMPVEXSND";

/**
 * Helper: open the "Swap to" (destination) asset picker from the SwapAmount view.
 *
 * The receive card uses the same `send-amount-edit-dest-asset` button as the
 * AmountCard shared component. Because both the sell and receive cards render
 * that button, we target the one inside `swap-receive-card`.
 */
async function openSwapToPicker(page: Page) {
  await page
    .getByTestId("swap-receive-card")
    .getByTestId("send-amount-edit-dest-asset")
    .click({ force: true });
  await expect(page.getByText("Swap to")).toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// 1. Held-to-held regression
//    Verifies the existing swap flow (source + destination both already held)
//    still reaches the review screen. This mirrors the smoke tests that lived
//    inside sendPayment.test.ts before this dedicated file existed.
// ---------------------------------------------------------------------------
test("held-to-held swap reaches review screen", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-swap").click();
  // The new SwapAmount view uses swap-sell-card (not swap-src-asset-tile)
  await expect(page.getByTestId("swap-sell-card")).toBeVisible({
    timeout: 15000,
  });

  // Open the destination picker and pick a held token (XLM — always held)
  await openSwapToPicker(page);
  // "Your tokens" section in the destination picker lists held balances
  await page.getByTestId("XLM-balance").first().click();

  // Fill amount and proceed to review
  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByTestId("swap-amount-btn-continue").click({ force: true });

  // Review screen
  await expect(page.getByText("You are swapping")).toBeVisible({
    timeout: 30000,
  });
});

// ---------------------------------------------------------------------------
// 2. Swap-to-new-token happy path
//    User searches for AQUA (non-held, verified on Mainnet), picks it, and at
//    the review screen a trustline banner is shown because the account has no
//    AQUA trustline. Clicking the banner opens the trustline-info sheet.
// ---------------------------------------------------------------------------
test("swap to new token shows trustline banner at review", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  const stubOverrides = async () => {
    // Stub stellar.expert asset search to return AQUA.
    // Real URL: https://api.stellar.expert/explorer/public/asset?search=AQUA
    // Pattern from stubAssetSearch in stubs.ts: "**/asset?search**"
    // We unroute the default (returns USDC) and install our AQUA response.
    await page.unroute("**/asset?search**");
    await page.route("**/asset?search**", (route) =>
      route.fulfill({
        json: {
          _embedded: {
            records: [
              {
                asset: `AQUA-GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA`,
                num_accounts: 50000,
                num_trades: 100000,
                bidding_liabilities: "1000000",
                asking_liabilities: "2000000",
                volume7d: 1_000_000_000_000,
              },
            ],
          },
        },
      }),
    );
    // Also stub the popular-tokens fetch (mainnet: sort=volume7d) so the idle
    // picker state has data without hitting the real stellar.expert.
    await page.route("**/asset?sort=volume7d**", (route) =>
      route.fulfill({
        json: {
          _embedded: {
            records: [
              {
                asset:
                  "AQUA-GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
                volume7d: 1_000_000_000_000,
                domain: "aquarius.world",
              },
            ],
          },
        },
      }),
    );
  };

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await switchToMainnet(page);

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("swap-sell-card")).toBeVisible({
    timeout: 15000,
  });

  // Open "Swap to" picker and search for AQUA
  await openSwapToPicker(page);
  // The search input testid is "swap-from-search" (both src and dst pickers share it)
  await page.getByTestId("swap-from-search").fill("AQUA");

  // Pick AQUA from the search results (verified or unverified section)
  await page.getByText("AQUA").first().click({ force: true });

  // Fill amount and proceed
  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByTestId("swap-amount-btn-continue").click({ force: true });

  // Review screen should show trustline banner (AQUA not in account balances)
  await expect(page.getByTestId("review-tx-trustline-banner")).toBeVisible({
    timeout: 30000,
  });

  // Tapping the banner opens the trustline-info sheet
  await page.getByTestId("review-tx-trustline-banner").click();
  await expect(page.getByTestId("trustline-info-sheet")).toBeVisible({
    timeout: 10000,
  });
});

// ---------------------------------------------------------------------------
// 3. XLM-reserve pre-flight sheet
//    Account has barely any XLM (0.6 total, 0.5 minimum → only 0.1 spendable).
//    Picking a non-held token and attempting to swap should surface the
//    XlmReserveSheet before or instead of the review screen.
// ---------------------------------------------------------------------------
test("shows XLM-reserve sheet when balance cannot cover the reserve", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  const stubOverrides = async () => {
    // Override default balances with a near-empty XLM account
    await page.unroute("**/account-balances/**");
    await page.route("*/**/account-balances/*", (route) =>
      route.fulfill({
        json: {
          balances: {
            native: {
              token: { type: "native", code: "XLM" },
              total: "0.6",
              available: "0.1",
              minimumBalance: "0.5",
              sellingLiabilities: "0",
              buyingLiabilities: "0",
              blockaidData: {
                result_type: "Benign",
                malicious_score: "0.0",
                attack_types: {},
                chain: "stellar",
                address: "",
                metadata: { type: "" },
                fees: {},
                features: [],
                trading_limits: {},
                financial_stats: {},
              },
            },
          },
          isFunded: true,
          subentryCount: 0,
          error: { horizon: null, soroban: null },
        },
      }),
    );
    // Stub search so AQUA appears in results
    await page.unroute("**/asset?search**");
    await page.route("**/asset?search**", (route) =>
      route.fulfill({
        json: {
          _embedded: {
            records: [
              {
                asset:
                  "AQUA-GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
                volume7d: 1_000_000_000_000,
              },
            ],
          },
        },
      }),
    );
    await page.route("**/asset?sort=volume7d**", (route) =>
      route.fulfill({
        json: { _embedded: { records: [] } },
      }),
    );
  };

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await switchToMainnet(page);

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("swap-sell-card")).toBeVisible({
    timeout: 15000,
  });

  await openSwapToPicker(page);
  await page.getByTestId("swap-from-search").fill("AQUA");
  await page.getByText("AQUA").first().click({ force: true });

  await page.getByTestId("send-amount-amount-input").fill("0.05");
  await page.getByTestId("swap-amount-btn-continue").click({ force: true });

  // The XlmReserveSheet should appear because spendable XLM < required reserve
  // Real testid: "XlmReserveSheet" (XlmReserveSheet/index.tsx:27)
  await expect(page.getByTestId("XlmReserveSheet")).toBeVisible({
    timeout: 30000,
  });
});

// ---------------------------------------------------------------------------
// 4. Blockaid-flagged destination → malicious warning at review
//    Stub scan-tx to return Malicious; the review screen must display the
//    blockaid-malicious-label warning.
// ---------------------------------------------------------------------------
test("flagged destination surfaces blockaid malicious warning at review", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  const stubOverrides = async () => {
    // Override asset search to return a "scam" token
    await page.unroute("**/asset?search**");
    await page.route("**/asset?search**", (route) =>
      route.fulfill({
        json: {
          _embedded: {
            records: [
              {
                asset:
                  "SCAM-GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA",
              },
            ],
          },
        },
      }),
    );
    await page.route("**/asset?sort=volume7d**", (route) =>
      route.fulfill({ json: { _embedded: { records: [] } } }),
    );
    // Override scan-tx to return Malicious
    // Real URL: POST to the Freighter backend /scan-tx endpoint
    // Existing helper: stubScanTxMalicious matches "**/scan-tx**"
    await stubScanTxMalicious(page);
  };

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await switchToMainnet(page);

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("swap-sell-card")).toBeVisible({
    timeout: 15000,
  });

  await openSwapToPicker(page);
  await page.getByTestId("swap-from-search").fill("SCAM");
  await page.getByText("SCAM").first().click({ force: true });

  await page.getByTestId("send-amount-amount-input").fill("1");
  await page.getByTestId("swap-amount-btn-continue").click({ force: true });

  // Review screen: blockaid malicious label must be visible
  // Real testid: "blockaid-malicious-label" (WarningMessages/index.tsx:768,933)
  await expect(page.getByTestId("blockaid-malicious-label")).toBeVisible({
    timeout: 30000,
  });
});

// ---------------------------------------------------------------------------
// 5. Search: Soroban contract address → Soroban empty state
//    Entering a contract address in the "Swap to" search should surface the
//    Soroban-unsupported empty state copy.
// ---------------------------------------------------------------------------
test("search with Soroban contract address shows Soroban empty state", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  const stubOverrides = async () => {
    // Return empty results — the Soroban detection happens in the picker via
    // hadSorobanMatches logic in SwapPickerSections based on the search term
    // being a contract-shaped address; no search result records needed.
    await page.unroute("**/asset?search**");
    await page.route("**/asset?search**", (route) =>
      route.fulfill({ json: { _embedded: { records: [] } } }),
    );
    await page.route("**/asset?sort=volume7d**", (route) =>
      route.fulfill({ json: { _embedded: { records: [] } } }),
    );
  };

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await switchToMainnet(page);

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("swap-sell-card")).toBeVisible({
    timeout: 15000,
  });

  await openSwapToPicker(page);
  // Type a Soroban contract address — SwapPickerSections.hadSorobanMatches
  // triggers when the search term looks like a contract ID (56-char Stellar G/C address)
  await page.getByTestId("swap-from-search").fill(SOROBAN_CONTRACT_ADDRESS);

  // The Soroban empty state message (swap-picker-empty-soroban)
  // Text: "Soroban contract tokens aren't supported for swaps yet."
  await expect(page.getByTestId("swap-picker-empty-soroban")).toBeVisible({
    timeout: 15000,
  });
  await expect(
    page.getByText(/Soroban contract tokens aren't supported/),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// 6. stellar.expert unreachable → fallback notice + held-only tokens
//    When the asset search AND popular-tokens fetch both fail (network abort),
//    the picker falls back to showing only held tokens and displays the
//    "Token discovery is temporarily unavailable" soft notice.
// ---------------------------------------------------------------------------
test("stellar.expert unreachable falls back to held-only with fallback notice", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();

  const stubOverrides = async () => {
    // Abort both the popular-tokens fetch (mainnet and testnet shapes) and any
    // asset search so the lookup lands in the isFallback=true branch.
    await page.unroute("**/asset?search**");
    await page.route("**/asset?search**", (route) => route.abort("failed"));
    await page.route("**/asset?sort=volume7d**", (route) =>
      route.abort("failed"),
    );
    // Testnet popular uses limit=50 without sort params
    await page.route("**/asset?limit=50**", (route) => route.abort("failed"));
  };

  await loginToTestAccount({ page, extensionId, context, stubOverrides });
  await switchToMainnet(page);

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("swap-sell-card")).toBeVisible({
    timeout: 15000,
  });

  await openSwapToPicker(page);

  // The fallback notice should appear automatically once popular-token fetch fails
  // Real testid: "swap-picker-fallback-notice" (SwapPickerSections/index.tsx:108)
  await expect(page.getByTestId("swap-picker-fallback-notice")).toBeVisible({
    timeout: 20000,
  });
  await expect(
    page.getByText(/Token discovery is temporarily unavailable/),
  ).toBeVisible();
});

// ---------------------------------------------------------------------------
// 7. Testnet: blockaid badges absent
//    On Testnet (the default network after loginToTestAccount) the picker
//    should not show any ScamAssetIcon / blockaid warning labels.
// ---------------------------------------------------------------------------
test("testnet swap picker shows no blockaid scam icons", async ({
  page,
  extensionId,
  context,
}) => {
  test.slow();
  // Default network from loginToTestAccount is Testnet — no switchToMainnet call
  await loginToTestAccount({ page, extensionId, context });

  await page.getByTestId("nav-link-swap").click();
  await expect(page.getByTestId("swap-sell-card")).toBeVisible({
    timeout: 15000,
  });

  await openSwapToPicker(page);

  // On Testnet there should be no Blockaid ScamAssetIcon rendered in the picker
  await expect(page.locator('[data-testid="ScamAssetIcon"]')).toHaveCount(0, {
    timeout: 10000,
  });
  // No malicious label either
  await expect(
    page.locator('[data-testid="blockaid-malicious-label"]'),
  ).toHaveCount(0);
});
