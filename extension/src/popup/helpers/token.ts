import { Asset } from "stellar-sdk";

import { isContractId } from "@shared/api/helpers/soroban";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

export enum TokenType {
  Native = "native",
  Classic = "classic",
  Soroban = "soroban",
}

/**
 * Local until the mirror catches up. stellar/freighter#3000 merged to PUBLIC
 * master on 2026-09-10 and adds `isNativeAssetId` / `isNativeContract` in
 * `@shared/helpers/assetIdentity`, `splitCanonical` in `@shared/helpers/stellar`,
 * plus the `asset-identity/no-asset-code-comparison` lint rule that rejects
 * this comparison — but none exists on `rebrand/varial` (the private mirror is
 * behind public master), so importing them here would not compile. Swap these
 * helpers for the shared ones in the same change that syncs the mirror.
 */
const isNativeCanonicalId = (token: string): boolean => token === "native";

/** Splits on the LAST colon: a contract token's symbol may contain one, an
 * issuer never does. Same contract as public master's `splitCanonical`. */
export const splitCanonical = (
  canonical: string,
): { code: string; issuer: string } => {
  const separator = canonical.lastIndexOf(":");
  if (separator === -1) {
    return { code: canonical, issuer: "" };
  }
  return {
    code: canonical.slice(0, separator),
    issuer: canonical.slice(separator + 1),
  };
};

/** True when a contract id IS the native lumen's SAC, derived from the
 * passphrase rather than compared to a literal. */
const isNativeContractId = (
  contractId: string,
  networkPassphrase?: string,
): boolean =>
  !!networkPassphrase &&
  contractId === Asset.native().contractId(networkPassphrase);

/**
 * Both contract forms are soroban EXCEPT XLM's own SAC, which is a contract id
 * by shape but IS the native asset.
 */
export const getTokenType = (
  token: string,
  networkPassphrase?: string,
): TokenType => {
  if (isNativeCanonicalId(token)) {
    return TokenType.Native;
  }
  const { issuer } = splitCanonical(token);
  const candidate = issuer || token;
  if (isContractId(candidate)) {
    if (isNativeContractId(candidate, networkPassphrase)) {
      return TokenType.Native;
    }
    return TokenType.Soroban;
  }
  return TokenType.Classic;
};

/**
 * Shared with mobile byte-for-byte. `asset_issuer` is the asset's issuer, not
 * the viewer's key. Absent halves are omitted rather than sent empty.
 */
export const getChartAssetIdentity = (
  token: string,
  networkPassphrase?: string,
): { asset_code?: string; asset_issuer?: string; token_type: TokenType } => {
  const token_type = getTokenType(token, networkPassphrase);

  // Branch on the resolved type, not the id's shape: XLM's SAC arrives as
  // `XLM:<contract id>` and must not emit an `asset_issuer` alongside
  // `token_type: "native"`. `Asset.native().code` so the code can't drift.
  if (token_type === TokenType.Native) {
    return { asset_code: Asset.native().code, token_type };
  }
  if (token.includes(":")) {
    const { code, issuer } = splitCanonical(token);
    return {
      ...(code ? { asset_code: code } : {}),
      ...(issuer ? { asset_issuer: issuer } : {}),
      token_type,
    };
  }
  return { asset_issuer: token, token_type };
};
