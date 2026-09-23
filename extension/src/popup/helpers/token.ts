import { Asset } from "stellar-sdk";

import { isContractId } from "@shared/api/helpers/soroban";
import {
  isNativeAssetId,
  isNativeContract,
} from "@shared/helpers/assetIdentity";
import { splitCanonical } from "@shared/helpers/stellar";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

export enum TokenType {
  Native = "native",
  Classic = "classic",
  Soroban = "soroban",
}

/**
 * Both contract forms are soroban EXCEPT XLM's own SAC, which is a contract id
 * by shape but IS the native asset.
 */
export const getTokenType = (
  token: string,
  networkPassphrase?: string,
): TokenType => {
  if (isNativeAssetId(token)) {
    return TokenType.Native;
  }
  const { issuer } = splitCanonical(token);
  const candidate = issuer || token;
  if (isContractId(candidate)) {
    if (networkPassphrase && isNativeContract(candidate, networkPassphrase)) {
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
