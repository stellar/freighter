import { BLEND_FIXED_POOL_IDS } from "@shared/constants/blend";
import { NETWORKS } from "@shared/constants/stellar";
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
 * Each entry is a thunk holding a literal `i18n.t` call, for two reasons. The
 * i18next scanner extracts keys by reading the literal argument of a `t()` call
 * (see `func.list` in webpack.extension.js), so passing a variable — a string
 * looked up out of this map — extracts nothing: the key never lands in
 * translation.json, i18next falls back to returning the key itself, and the copy
 * renders in English in every language while looking correct in en. And the
 * thunk keeps resolution lazy, where a bare `i18n.t` at module scope would run
 * before the language bundle has loaded.
 *
 * A pool with no entry renders no description rather than a wrong one.
 */
const POOL_DESCRIPTIONS: Record<string, () => string> = {
  // Fixed Pool v2 — mainnet
  [BLEND_FIXED_POOL_IDS[NETWORKS.PUBLIC]!]: () =>
    i18n.t(
      "Permissionless lending pool with no admin. Collateral factors, interest curves, and supported assets are locked at deployment.",
    ),
  // Fixed Pool v2 — testnet
  [BLEND_FIXED_POOL_IDS[NETWORKS.TESTNET]!]: () =>
    i18n.t(
      "Permissionless lending pool with no admin. Collateral factors, interest curves, and supported assets are locked at deployment.",
    ),
};

export const getPoolDescription = (poolId: string): string | null =>
  POOL_DESCRIPTIONS[poolId]?.() ?? null;
