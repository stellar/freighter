import { NETWORKS } from "@shared/constants/stellar";

interface SacAddresses {
  XLM: string;
  USDC?: string;
  EURC?: string;
}

/**
 * Well-known Stellar Asset Contract addresses, by network, for tests.
 *
 * A SAC address is a deterministic function of the classic asset and the
 * network passphrase, so production code derives them (`getNativeContractId`,
 * `getAssetSacAddress`). Tests spell them out because every fixture of a
 * Soroban asset needs the real address: a placeholder contract id fails
 * `getBalanceByKey`'s SAC derivation and silently makes a held asset look
 * unheld. `sacFixtures.test.ts` checks them against the derivation.
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
