import { Asset } from "stellar-sdk";

import { AssetType, NativeAsset } from "@shared/api/types/account-balance";

/**
 * Shared asset-identity predicates.
 *
 * An asset's identity is the pair (code, issuer) — or, for a contract token,
 * its contract id. Asset codes are not unique, so a code alone establishes
 * neither that two assets are the same asset nor that an asset is the native
 * lumen. Nativeness is a property of an asset's type, or in contract space of
 * the contract id. Every native check in the extension goes through one of the
 * predicates below.
 */

/**
 * The identifier the codebase uses for the native lumen. It is simultaneously
 * the canonical asset id, a Horizon record's `asset_type`, and a balance's
 * `token.type`.
 */
const NATIVE_ASSET_ID = "native";

/** The native lumen's display code. Not unique — other assets may use it. */
const NATIVE_ASSET_CODE = "XLM";

/**
 * True if `id` is the native identifier. Use it for canonical asset ids,
 * Horizon `asset_type` values, and balance `token.type` values.
 */
export const isNativeAssetId = (id: string | undefined | null): boolean =>
  id === NATIVE_ASSET_ID;

/**
 * Native test for a raw code and issuer. Use it only where neither a token
 * type nor a contract id is available — the native asset carries the native
 * code and no issuer, so both halves are required.
 */
export const isNativeAssetPair = (
  code: string | undefined | null,
  issuer: string | undefined | null,
): boolean => code === NATIVE_ASSET_CODE && !issuer;

/** True only for a balance whose token declares the native type. */
export const isNativeBalance = (balance: AssetType): balance is NativeAsset =>
  "token" in balance &&
  "type" in balance.token &&
  isNativeAssetId(balance.token.type as unknown as string);

/**
 * True only for the native asset.
 *
 * `getAssetFromCanonical` returns an SDK `Asset` for classic assets and a plain
 * `{ code, issuer }` for Soroban issuers, so both shapes arrive here. The SDK's
 * own `isNative()` is authoritative when present; the plain shape only ever
 * carries a `C…` issuer, which the pair test correctly rejects.
 *
 * Narrowing on the method rather than `instanceof` keeps this correct across
 * the `stellar-sdk` / `stellar-sdk-next` dual-package split.
 */
export const isNativeAsset = (
  asset: Asset | { code: string; issuer?: string },
): boolean =>
  typeof (asset as Asset).isNative === "function"
    ? (asset as Asset).isNative()
    : isNativeAssetPair(asset.code, asset.issuer);

/**
 * The native lumen's Stellar Asset Contract id, derived from the network
 * passphrase so it is correct by construction on every network.
 */
export const getNativeContractId = (networkPassphrase: string): string =>
  Asset.native().contractId(networkPassphrase);

/** True only when `contractId` is the native SAC for the given network. */
export const isNativeContract = (
  contractId: string | undefined | null,
  networkPassphrase: string,
): boolean =>
  !!contractId && contractId === getNativeContractId(networkPassphrase);
