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

/**
 * XLM held back from a Max deposit to cover the transaction's resource fee.
 *
 * `getAvailableBalance` only subtracts the *inclusion* fee (~0.00001 XLM), but a
 * Blend `submit` is dominated by its resource fee — measured at 546,395 stroops
 * (~0.0546 XLM) against the live pool, roughly 5,000x the inclusion fee. Without
 * this buffer a Max deposit of XLM simulates into an insufficient-balance error.
 *
 * The buffer is deliberately generous; Review re-checks against the real
 * `minResourceFee` once simulation returns and clamps if it still does not fit.
 */
export const BLEND_DEPOSIT_XLM_FEE_BUFFER = "0.5";
