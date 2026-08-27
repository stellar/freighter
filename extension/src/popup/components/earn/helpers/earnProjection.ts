import BigNumber from "bignumber.js";

import { ApiTokenPrices } from "@shared/api/types";
import { AssetType } from "@shared/api/types/account-balance";
import { BlendEarnAssetOption } from "@shared/api/types/blend";
import { NetworkDetails } from "@shared/constants/stellar";
import { getBalanceByKey } from "popup/helpers/balance";

import { getCatalogAssetIdentity } from "./earnAssetIcons";
import { headlineApy } from "./formatPoolStats";

/**
 * The headline rate for one catalog option: the best pool's supply APY plus
 * its emissions (`headlineApy` in formatPoolStats.ts owns the null-is-not-zero
 * exception). A pool with no fresh price is skipped rather than folded in as
 * zero. Null when the option has no priced pool at all.
 */
const bestApyForOption = (option: BlendEarnAssetOption): number | null =>
  option.pools.reduce<number | null>((best, pool) => {
    const rate = headlineApy(pool.supplyApy, pool.emissionsSupplyApr);
    if (rate === null) {
      return best;
    }
    return best === null || rate > best ? rate : best;
  }, null);

/** The highest headline rate on offer across every option and pool. */
export const getBestEarnApy = (
  options: BlendEarnAssetOption[],
): number | null =>
  options.reduce<number | null>((best, option) => {
    const rate = bestApyForOption(option);
    if (rate === null) {
      return best;
    }
    return best === null || rate > best ? rate : best;
  }, null);

/**
 * What the account could earn in a year by depositing what it already holds.
 *
 * Each held, priced, pool-supported token is valued at ITS OWN best rate and the
 * results summed — a single blended rate over a mixed basket would credit a
 * low-APY token the wrong number. Tokens no pool accepts, and tokens with no
 * fresh price, are skipped rather than counted at zero.
 *
 * `usd` is null when there is nothing to total: no catalog, or nothing
 * depositable held. The empty state then shows `bestApy` alone — a ceiling rate
 * rather than a dollar promise it cannot make.
 */
export const projectAnnualEarnings = ({
  options,
  balances,
  tokenPrices,
  networkDetails,
}: {
  options: BlendEarnAssetOption[] | null;
  balances: AssetType[];
  tokenPrices: ApiTokenPrices | null | undefined;
  networkDetails: NetworkDetails;
}): { usd: string | null; bestApy: number | null } => {
  if (!options?.length) {
    return { usd: null, bestApy: null };
  }

  const bestApy = getBestEarnApy(options);
  let total = new BigNumber(0);
  let counted = 0;

  options.forEach((option) => {
    const apy = bestApyForOption(option);
    if (apy === null) {
      return;
    }

    const balance = getBalanceByKey(option.assetId, balances, networkDetails);
    if (!balance || new BigNumber(balance.total).lte(0)) {
      return;
    }

    // Prices are keyed by canonical ("CODE:ISSUER", or "native" for XLM), which
    // is exactly what getCatalogAssetIdentity resolves.
    const { canonical } = getCatalogAssetIdentity({
      symbol: option.symbol,
      name: option.name,
      assetId: option.assetId,
      networkDetails,
    });
    const price = canonical
      ? tokenPrices?.[canonical]?.currentPrice
      : undefined;
    if (!price) {
      return;
    }

    counted += 1;
    total = total.plus(
      new BigNumber(balance.total).multipliedBy(price).multipliedBy(apy),
    );
  });

  return { usd: counted ? total.toFixed(2) : null, bestApy };
};
