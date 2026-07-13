import { captureException } from "@sentry/browser";

import { INDEXER_URL } from "@shared/constants/mercury";
import { NETWORKS, NetworkDetails } from "@shared/constants/stellar";
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
    (key) => key !== "native" && !key.includes(":lp"),
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
    const url = new URL(`${INDEXER_URL}/scan-asset-bulk`);
    for (const id of scannableIds) {
      url.searchParams.append("asset_ids", id.replace(":", "-"));
    }
    const response = await fetch(url.href);
    const data = await response.json();
    const results = (data?.data?.results || {}) as {
      [assetId: string]: BlockAidScanAssetResult;
    };

    Object.entries(results).forEach(([assetId, scanResult]) => {
      const balanceKey = assetId.replace("-", ":");
      if (balances[balanceKey]) {
        (balances[balanceKey] as any).blockaidData = scanResult;
      }
    });
  } catch (e) {
    captureException(`Failed to bulk scan v2 balances - ${e}`);
  }

  return accountBalances;
};
