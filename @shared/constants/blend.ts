import { NETWORKS, NetworkDetails } from "@shared/constants/stellar";

/**
 * The Blend v2 "Fixed Pool" contract per network. These mirror the allowlist in
 * freighter-backend-v2 `configs/earn-pools.json`, which is what filters the
 * `/protocols/blend/earn-options` response. Keep the two in sync.
 *
 * Networks absent from this map do not support Earn — see `isEarnSupportedNetwork`.
 */
export const BLEND_FIXED_POOL_IDS: Partial<Record<NETWORKS, string>> = {
  [NETWORKS.PUBLIC]: "CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD",
  [NETWORKS.TESTNET]:
    "CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF",
};

export const getBlendPoolId = (networkDetails: NetworkDetails) =>
  BLEND_FIXED_POOL_IDS[networkDetails.network as NETWORKS];

/**
 * Earn is only available where we have an allowlisted pool. The backend's Blend
 * routes also reject any `?network=` outside PUBLIC/TESTNET, so gating here keeps
 * the flow to a single code path with no custom-network fallback.
 */
export const isEarnSupportedNetwork = (networkDetails: NetworkDetails) =>
  Boolean(getBlendPoolId(networkDetails));
