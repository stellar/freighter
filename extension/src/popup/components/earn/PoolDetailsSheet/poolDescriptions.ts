import i18n from "popup/helpers/localizationConfig";

/**
 * Prose descriptions for the pools we surface, keyed by pool contract address.
 *
 * Hardcoded because the backend's pool catalog carries no description field.
 * Keyed by contract ID rather than shown generically because the copy makes
 * claims that are only true of a specific deployment: the mainnet Fixed pool's
 * admin account is burned (master weight 0, no signers, all thresholds 0), so
 * "no admin" is a fact about that pool, not about Blend pools in general.
 *
 * A pool with no entry renders no description rather than a wrong one.
 */
const POOL_DESCRIPTION_KEYS: Record<string, string> = {
  // Fixed Pool v2 — mainnet
  CAJJZSGMMM3PD7N33TAPHGBUGTB43OC73HVIK2L2G6BNGGGYOSSYBXBD:
    "Permissionless lending pool with no admin. Collateral factors, interest curves, and supported assets are locked at deployment.",
  // Fixed Pool v2 — testnet
  CCEBVDYM32YNYCVNRXQKDFFPISJJCV557CDZEIRBEE4NCV4KHPQ44HGF:
    "Permissionless lending pool with no admin. Collateral factors, interest curves, and supported assets are locked at deployment.",
};

export const getPoolDescription = (poolId: string): string | null => {
  const description = POOL_DESCRIPTION_KEYS[poolId];
  return description ? i18n.t(description) : null;
};
