import { captureException } from "@sentry/browser";

import { INDEXER_URL } from "@shared/constants/mercury";
import { NETWORKS, NetworkDetails } from "@shared/constants/stellar";
import { isNativeAssetId } from "@shared/helpers/assetIdentity";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";
import { BlockAidScanAssetResult } from "../types";
import { AccountBalancesInterface, BalanceMap } from "../types/backend-api";

/**
 * Stamps `blockaidData` onto every mapped v2 balance entry so the v2 path
 * returns the same payload as v1, where the backend does this server-side
 * (`freighter-backend/src/service/blockaid/helpers/addScanResults.ts`):
 * every entry gets a benign default, then a PUBLIC-network bulk scan
 * overwrites the entries Blockaid returns verdicts for. The standalone path
 * (`makeDisplayableBalances` in `@shared/helpers/stellar.ts`) is the
 * client-side precedent: native and LP-share ids are not scannable assets, so
 * they are excluded from the request and keep the benign default.
 *
 * Scan failures never break balances — entries keep the benign default,
 * mirroring v1.
 */
export const addBlockaidScanResults = async (
  accountBalances: AccountBalancesInterface,
  networkDetails: NetworkDetails,
  shouldSkipScan?: boolean,
): Promise<AccountBalancesInterface> => {
  const balances = (accountBalances.balances || {}) as BalanceMap;
  const keys = Object.keys(balances);

  for (const key of keys) {
    (balances[key] as any).blockaidData = {
      ...defaultBlockaidScanAssetResult,
    };
  }

  // Balance-map keys are `CODE:ISSUER` / `SYMBOL:CONTRACT_ID`; Blockaid ids
  // swap the separator: `CODE-ISSUER` (same convention as v1 and the
  // standalone path).
  const scannableIds = keys.filter(
    (key) => !isNativeAssetId(key) && !key.includes(":lp"),
  );

  if (
    networkDetails.network !== NETWORKS.PUBLIC ||
    shouldSkipScan ||
    !scannableIds.length
  ) {
    // Blockaid only supports Stellar mainnet; on other networks (and when the
    // caller skips scanning) every entry keeps the benign default.
    return accountBalances;
  }

  try {
    const chunkSize = 10;
    for (let offset = 0; offset < scannableIds.length; offset += chunkSize) {
      const url = new URL(`${INDEXER_URL}/scan-asset-bulk`);
      // Record which balance key produced each Blockaid id so verdicts can be
      // matched back by lookup instead of re-parsing the id. Deriving the key
      // from the response is ambiguous once a symbol contains a hyphen
      // (`MY-TOKEN:C…` → `MY-TOKEN-C…` → splits back to `MY:TOKEN-C…`), which
      // silently dropped the verdict — and since every entry is pre-stamped
      // benign above, a dropped verdict reads as an affirmative "Benign".
      // Distinct keys can collapse onto one id (`A-B:C` and `A:B-C` both yield
      // `A-B-C`), so each id maps to a list rather than a single key.
      const idToBalanceKeys = new Map<string, string[]>();
      for (const key of scannableIds.slice(offset, offset + chunkSize)) {
        const assetId = key.replace(":", "-");
        url.searchParams.append("asset_ids", assetId);
        const existing = idToBalanceKeys.get(assetId);
        if (existing) {
          existing.push(key);
        } else {
          idToBalanceKeys.set(assetId, [key]);
        }
      }
      const response = await fetch(url.href);
      const data = await response.json();
      const results = (data?.data?.results || {}) as {
        [assetId: string]: BlockAidScanAssetResult;
      };

      Object.entries(results).forEach(([assetId, scanResult]) => {
        for (const balanceKey of idToBalanceKeys.get(assetId) || []) {
          (balances[balanceKey] as any).blockaidData = scanResult;
        }
      });
    }
  } catch (e) {
    captureException(`Failed to bulk scan v2 balances - ${e}`);
  }

  return accountBalances;
};
