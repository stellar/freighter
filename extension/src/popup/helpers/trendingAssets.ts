import { NetworkDetails } from "@shared/constants/stellar";
import { TrendingAsset } from "@shared/api/types";
import { getStellarExpertAssets } from "@shared/api/internal";
import { isTestnet, truncateString } from "helpers/stellar";
import { isContractId } from "popup/helpers/soroban";

// Re-exported so existing `popup/helpers/trendingAssets` imports keep resolving.
export type { TrendingAsset };

export const TRENDING_LIMIT = 50;
// Mainnet-only floor. stellar.expert reports volume7d in USD scaled by 10^7
// (so 70_000_000_000 ≈ $7,000 USD/week); filters out dust-volume assets
// before they reach the Popular list.
export const MIN_TRENDING_VOLUME7D = 70_000_000_000;

interface TrendingRecord {
  asset: string; // "CODE-ISSUER" for classic, contract id otherwise
  code?: string;
  decimals?: number;
  volume7d?: number;
  domain?: string;
  tomlInfo?: { image?: string; code?: string };
}

export const fetchTrendingAssets = async ({
  networkDetails,
  signal,
}: {
  networkDetails: NetworkDetails;
  signal?: AbortSignal;
}): Promise<TrendingAsset[]> => {
  const testnet = isTestnet(networkDetails);
  const limit = `${TRENDING_LIMIT}`;
  // On testnet volume7d is always 0, so sorting by it is meaningless — omit the
  // sort/order params and accept the API's default order.
  const query: Record<string, string> = testnet
    ? { limit }
    : { sort: "volume7d", order: "desc", limit };

  // No error swallowing: a backend outage (rejection or non-200 status) must
  // propagate so the swap picker can flip to held-only with a "discovery
  // unavailable" notice. A successful-but-empty response still returns [].
  const page = await getStellarExpertAssets<TrendingRecord>({
    networkDetails,
    query,
    signal,
  });
  const records = page._embedded.records;

  const applyFloor = !testnet;

  return records
    .map((record): TrendingAsset => {
      const common = {
        domain: record.domain ?? null,
        icon: record.tomlInfo?.image,
        volume7d: record.volume7d ?? 0,
      };
      if (isContractId(record.asset)) {
        return {
          ...common,
          code:
            record.code ||
            record.tomlInfo?.code ||
            truncateString(record.asset),
          issuer: record.asset,
          contract: record.asset,
          decimals: record.decimals,
        };
      }
      const [code, issuer] = record.asset.split("-");
      return { ...common, code, issuer };
    })
    .filter((asset) =>
      applyFloor ? asset.volume7d >= MIN_TRENDING_VOLUME7D : true,
    );
};
