import { NetworkDetails } from "@shared/constants/stellar";
import { TrendingAsset } from "@shared/api/types";
import { getApiStellarExpertUrl } from "popup/helpers/account";
import { isTestnet } from "helpers/stellar";

// Re-exported so existing `popup/helpers/trendingAssets` imports keep resolving.
export type { TrendingAsset };

export const TRENDING_LIMIT = 50;
// Mainnet-only floor. stellar.expert reports volume7d in USD scaled by 10^7
// (so 70_000_000_000 ≈ $7,000 USD/week); filters out dust-volume assets
// before they reach the Popular list.
export const MIN_TRENDING_VOLUME7D = 70_000_000_000;

interface TrendingRecord {
  asset: string; // "CODE-ISSUER" for classic, contract id otherwise
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
  const base = `${getApiStellarExpertUrl(networkDetails)}/asset`;
  const testnet = isTestnet(networkDetails);
  // On testnet volume7d is always 0, so sorting by it is meaningless — omit the
  // sort/order params and accept the API's default order.
  const sortParams = testnet
    ? `limit=${TRENDING_LIMIT}`
    : `sort=volume7d&order=desc&limit=${TRENDING_LIMIT}`;

  // No error swallowing: a backend outage (rejection or non-ok status) must
  // propagate so the swap picker can flip to held-only with a "discovery
  // unavailable" notice. A successful-but-empty response still returns [].
  const res = await fetch(`${base}?${sortParams}`, { signal });
  if (!res.ok) {
    throw new Error(res.statusText);
  }
  const json = await res.json();
  const records: TrendingRecord[] = json?._embedded?.records ?? [];

  const applyFloor = !testnet;

  return records
    .filter((record) => record.asset.includes("-")) // classic only; contract ids dropped here, SAC handled in the hook
    .map((record): TrendingAsset => {
      const [code, issuer] = record.asset.split("-");
      return {
        code,
        issuer,
        domain: record.domain ?? null,
        icon: record.tomlInfo?.image,
        volume7d: record.volume7d ?? 0,
      };
    })
    .filter((asset) =>
      applyFloor ? asset.volume7d >= MIN_TRENDING_VOLUME7D : true,
    );
};
