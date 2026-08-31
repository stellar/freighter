import BigNumber from "bignumber.js";
import { Asset, Networks } from "stellar-sdk";

import { ErrorMessage } from "@shared/api/types";
import { BalanceMap } from "@shared/api/types/backend-api";
import { isContractId } from "@shared/api/helpers/soroban";
import { getAssetSacAddress } from "@shared/helpers/soroban/token";
import { getCanonicalFromAsset } from "helpers/stellar";

// ---------------------------------------------------------------------------
// Rounding
// ---------------------------------------------------------------------------

/**
 * Rounds to 2 decimal places, half-up, in decimal space before converting to
 * a number. Never `Math.round(x * 100) / 100` — that reintroduces binary
 * floating-point error at the half-cent boundary. Never the extension's
 * existing `roundUsdValue`, which floors instead of rounding.
 */
export const roundHalfUp2dp = (value: BigNumber.Value): number =>
  new BigNumber(value).decimalPlaces(2, BigNumber.ROUND_HALF_UP).toNumber();

// ---------------------------------------------------------------------------
// Per-leg USD derivation
// ---------------------------------------------------------------------------

export type LegUsdStatus = "ok" | "no_price" | "error";

export interface LegUsdResult {
  status: LegUsdStatus;
  /** Rounded to 2dp. Present only when status === "ok". */
  value?: number;
  /** Unrounded value, used for slippage math — never emitted directly. */
  unrounded?: BigNumber;
  /** Snapshot price per unit actually used. */
  rate?: number;
}

/**
 * Derives a leg's USD value from its token amount and the snapshot price for
 * its canonical id. A missing price is `no_price`; a price that produces a
 * non-finite result is `error`. Never emits 0 for a missing price — that
 * status is `no_price`/`error`, not a value of 0.
 */
export const deriveLegUsd = (
  tokenAmount: BigNumber.Value | undefined,
  pricePerUnit: string | undefined | null,
): LegUsdResult => {
  if (pricePerUnit === undefined || pricePerUnit === null) {
    return { status: "no_price" };
  }
  try {
    const amount = new BigNumber(tokenAmount ?? NaN);
    const price = new BigNumber(pricePerUnit);
    const unrounded = amount.multipliedBy(price);
    if (!unrounded.isFinite() || !price.isFinite()) {
      return { status: "error" };
    }
    return {
      status: "ok",
      value: roundHalfUp2dp(unrounded),
      unrounded,
      rate: price.toNumber(),
    };
  } catch {
    return { status: "error" };
  }
};

// ---------------------------------------------------------------------------
// Slippage
// ---------------------------------------------------------------------------

/**
 * `(destUsd - sourceUsd) / sourceUsd * 100`, from unrounded leg values,
 * rounded only at the end. Negative when the user received less USD value
 * than they gave up. `undefined` when the source value is zero (no ratio) —
 * callers additionally gate this on both legs pricing `ok`.
 */
export const computeUsdSlippagePct = (
  sourceUnrounded: BigNumber,
  destUnrounded: BigNumber,
): number | undefined => {
  if (sourceUnrounded.isZero() || !sourceUnrounded.isFinite()) {
    return undefined;
  }
  const pct = destUnrounded
    .minus(sourceUnrounded)
    .dividedBy(sourceUnrounded)
    .times(100);
  return pct.isFinite() ? roundHalfUp2dp(pct) : undefined;
};

/**
 * `(settled - quoted) / quoted * 100`, token-denominated and price-independent.
 * `undefined` when no quote amount was captured or it was zero.
 */
export const computeExecutionSlippagePct = (
  quotedAmount: BigNumber.Value | undefined,
  settledAmount: BigNumber.Value | undefined,
): number | undefined => {
  if (quotedAmount === undefined || settledAmount === undefined) {
    return undefined;
  }
  const quoted = new BigNumber(quotedAmount);
  if (quoted.isZero() || !quoted.isFinite()) {
    return undefined;
  }
  const settled = new BigNumber(settledAmount);
  if (!settled.isFinite()) {
    return undefined;
  }
  const pct = settled.minus(quoted).dividedBy(quoted).times(100);
  return pct.isFinite() ? roundHalfUp2dp(pct) : undefined;
};

// ---------------------------------------------------------------------------
// Asset identity + SAC collapse
// ---------------------------------------------------------------------------

export type AssetKind = "native" | "classic" | "soroban";

export interface AssetIdentity {
  code: string;
  /** `G…` classic issuer or `C…` Soroban-native contract. Omitted for native XLM. */
  issuer?: string;
  type: AssetKind;
}

/**
 * Classifies an asset for telemetry, collapsing a classic asset moved via its
 * SAC back to its classic identity. Classification is by derivation, not
 * heuristic: a `C…` address is only collapsed when it matches the SAC address
 * derived from a *known* classic asset with the same code — either native
 * XLM, or a classic balance the account itself holds (`balances`). A `C…`
 * address with no such match is genuinely Soroban-native.
 *
 * This means correctness depends on the caller only ever passing a `C…`
 * address for an asset the account actually holds (so its classic form is
 * findable in `balances`), or on `balances` being fresh. A SAC-wrapped
 * classic asset the account does NOT hold — passed as a raw `C…` issuer —
 * will be misreported as `soroban` rather than `classic`, with no signal
 * that anything went wrong. Today's callers satisfy this: the source leg is
 * always drawn from a held-balance picker, and the swap destination leg is
 * always pre-normalized to a classic `G…` issuer before it reaches this
 * function (the destination picker's classic-only filter, and the
 * hardcoded default). If a future caller can supply a `C…` destination for
 * an asset not in `balances` — e.g. a raw `destination_asset` query param —
 * this function will not catch the misclassification.
 */
export const classifyAssetIdentity = (
  code: string,
  issuer: string | undefined,
  networkPassphrase: string,
  balances?: BalanceMap | null,
): AssetIdentity => {
  if (!issuer) {
    return { code, type: "native" };
  }

  if (!isContractId(issuer)) {
    return { code, issuer, type: "classic" };
  }

  try {
    if (Asset.native().contractId(networkPassphrase) === issuer) {
      return { code, type: "native" };
    }

    const classicMatch = Object.values(balances ?? {}).find(
      (balance): boolean => {
        if (!balance.token || !("issuer" in balance.token)) {
          return false;
        }
        const classicIssuer = balance.token.issuer.key;
        if (isContractId(classicIssuer) || balance.token.code !== code) {
          return false;
        }
        const canonical = getCanonicalFromAsset(
          balance.token.code,
          classicIssuer,
        );
        return (
          getAssetSacAddress(canonical, networkPassphrase as Networks) ===
          issuer
        );
      },
    );

    if (classicMatch && "issuer" in classicMatch.token) {
      return { code, issuer: classicMatch.token.issuer.key, type: "classic" };
    }
  } catch {
    // Derivation failed (e.g. an invalid code) — fall through and report the
    // contract as Soroban-native rather than throwing out of a telemetry path.
  }

  return { code, issuer, type: "soroban" };
};

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

export type FailureCategory =
  | "slippage"
  | "fee"
  | "balance"
  | "trustline"
  | "destination"
  | "sequence"
  | "auth"
  | "transport"
  | "protocol_other"
  | "unknown";

const REASON_CODE_TO_FAILURE_CATEGORY: Record<string, FailureCategory> = {
  op_under_dest_min: "slippage",
  op_too_few_offers: "slippage",
  tx_insufficient_fee: "fee",
  op_underfunded: "balance",
  tx_insufficient_balance: "balance",
  op_low_reserve: "balance",
  op_no_trust: "trustline",
  op_src_no_trust: "trustline",
  op_line_full: "trustline",
  op_not_authorized: "trustline",
  op_src_not_authorized: "trustline",
  op_no_issuer: "trustline",
  op_invalid_limit: "trustline",
  op_no_destination: "destination",
  tx_bad_seq: "sequence",
  tx_too_late: "sequence",
  tx_too_early: "sequence",
  tx_bad_auth: "auth",
  tx_bad_auth_extra: "auth",
  tx_no_source_account: "auth",
};

/**
 * True when `error.response` looks like an actual protocol answer (a Horizon
 * problem+json body, carrying `extras`/`status`/`title`) rather than a raw
 * network/fetch exception. Distinguishes `transport` (no definitive outcome
 * at all) from every other category, which all require Horizon to have
 * actually answered.
 */
const isDefiniteProtocolAnswer = (error: ErrorMessage | undefined): boolean => {
  const response = error?.response as unknown;
  if (!response || typeof response !== "object") {
    return false;
  }
  return "extras" in response || "status" in response || "title" in response;
};

/**
 * True when the HTTP status is one that never judges the transaction itself:
 * the outcome is undetermined (5xx — the submission may still have been
 * ingested; 408 — timed out) or the request was turned away before Horizon
 * evaluated it (429 rate limit, 403 proxy rejection). These are `transport`,
 * not `unknown`: a body arrived, but no verdict did.
 */
const isNoVerdictHttpStatus = (status: number): boolean =>
  status >= 500 || status === 408 || status === 429 || status === 403;

/**
 * Maps a Horizon `reason_code` to a bounded `failure_category`. Bucket
 * assignment prioritizes `transport` (submission never got a verdict on the
 * transaction) over the reason-code table, since a `reason_code` of
 * `"unknown"` is ambiguous between "Horizon rejected it with something we
 * don't recognize" and "we never got a verdict at all". `transport` covers
 * both no-answer (network/fetch exception) and answered-without-a-verdict
 * (5xx/408/429/403 with no `result_codes`); `unknown` is reserved for a
 * definitive 4xx rejection that carried no result codes.
 */
export const getFailureCategory = (
  error: ErrorMessage | undefined,
  reasonCode: string,
): FailureCategory => {
  if (!isDefiniteProtocolAnswer(error)) {
    return "transport";
  }
  if (reasonCode === "unknown") {
    const status = (error?.response as { status?: unknown } | undefined)
      ?.status;
    if (typeof status === "number" && isNoVerdictHttpStatus(status)) {
      return "transport";
    }
    return "unknown";
  }
  return REASON_CODE_TO_FAILURE_CATEGORY[reasonCode] ?? "protocol_other";
};
