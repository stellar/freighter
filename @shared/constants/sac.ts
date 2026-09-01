import { NETWORKS } from "@shared/constants/stellar";

interface SacAddresses {
  XLM: string;
  USDC?: string;
  EURC?: string;
}

/**
 * Well-known Stellar Asset Contract addresses, by network.
 *
 * A SAC address is a deterministic function of the classic asset and the network
 * passphrase, so these are network facts rather than configuration — they can be
 * re-derived with `new Asset(code, issuer).contractId(passphrase)`. They are
 * spelled out here because several call sites need them without an issuer in
 * hand (the Blend catalog addresses reserves by contract id, and the asset
 * search needs the native contract before any asset is resolved), and because
 * every test that fixtures a Soroban asset needs the real address: a placeholder
 * contract id fails `getBalanceByKey`'s SAC derivation and silently makes a
 * held asset look unheld.
 */
export const SACS: Record<NETWORKS.PUBLIC | NETWORKS.TESTNET, SacAddresses> = {
  [NETWORKS.PUBLIC]: {
    XLM: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
    USDC: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75",
    EURC: "CDTKPWPLOURQA2SGTKTUQOWRCBZEORB4BWBOMJ3D3ZTQQSGE5F6JBQLV",
  },
  [NETWORKS.TESTNET]: {
    XLM: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  },
};

/** Shorthand for the mainnet addresses, which is what most callers want. */
export const PUBLIC_SACS = SACS[NETWORKS.PUBLIC];
