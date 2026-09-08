import BigNumber from "bignumber.js";
import { stroopsToAmount } from "@cavos/reserve";

import {
  Reserve,
  ReserveError,
  ReserveVerificationError,
  createReserveClient,
} from "./client";
import { amountToStroops } from "./feeAssets";
import { isReserveNetwork } from "./network";
import { ReserveSendError } from "./send";
import { NATIVE_FEE_ASSET } from "./types";
import type { ReserveFeeDisplay, ReserveOp, Quote } from "./types";

export interface HorizonClaimPredicate {
  unconditional?: boolean;
}

export interface HorizonClaimant {
  destination: string;
  predicate?: HorizonClaimPredicate;
}

export interface HorizonClaimableBalance {
  id: string;
  asset: string;
  amount: string;
  claimants?: HorizonClaimant[];
}

export interface BootstrapOption {
  asset: string;
  code: string;
  issuer: string;
  available: string;
  balanceId: string;
}

function formatFeeAmount(stroops: number | string): string {
  return new BigNumber(stroopsToAmount(stroops)).toFixed();
}

function feeCode(asset: string): string {
  if (asset === NATIVE_FEE_ASSET) return "XLM";
  return asset.split(":")[0] || asset;
}

export function horizonAssetToCanonical(asset: string): {
  asset: string;
  code: string;
  issuer: string;
} {
  if (asset === NATIVE_FEE_ASSET || asset === "XLM") {
    return { asset: NATIVE_FEE_ASSET, code: "XLM", issuer: "" };
  }
  const [code, issuer] = asset.split(":");
  return { asset, code: code || asset, issuer: issuer || "" };
}

export function canClaimBalance(
  record: HorizonClaimableBalance,
  claimant: string,
): boolean {
  return (record.claimants || []).some((entry) => {
    if (entry.destination !== claimant) return false;
    const predicate = entry.predicate;
    return predicate == null || predicate.unconditional === true;
  });
}

export function pickBootstrapOptions({
  records,
  acceptedTokens,
  claimant,
}: {
  records: HorizonClaimableBalance[];
  acceptedTokens: string[];
  claimant: string;
}): BootstrapOption[] {
  const allow = new Set(acceptedTokens);
  const best = new Map<string, BootstrapOption>();

  for (const record of records) {
    const meta = horizonAssetToCanonical(record.asset);
    if (!allow.has(meta.asset)) continue;
    if (!canClaimBalance(record, claimant)) continue;
    const amount = Number(record.amount);
    if (!(amount > 0) || !record.id) continue;

    const prev = best.get(meta.asset);
    if (!prev || Number(prev.available) < amount) {
      best.set(meta.asset, {
        ...meta,
        available: record.amount,
        balanceId: record.id,
      });
    }
  }

  return [...best.values()].sort((a, b) => {
    if (a.code === "USDC" && b.code !== "USDC") return -1;
    if (b.code === "USDC" && a.code !== "USDC") return 1;
    if (a.asset === NATIVE_FEE_ASSET) return -1;
    if (b.asset === NATIVE_FEE_ASSET) return 1;
    return a.code.localeCompare(b.code);
  });
}

export async function fetchClaimableBalances(
  horizonUrl: string,
  claimant: string,
): Promise<HorizonClaimableBalance[]> {
  const base = horizonUrl.replace(/\/$/, "");
  const res = await fetch(
    `${base}/claimable_balances?claimant=${encodeURIComponent(claimant)}&limit=20`,
  );
  if (!res.ok) return [];
  const body = (await res.json()) as {
    _embedded?: { records?: HorizonClaimableBalance[] };
  };
  return body._embedded?.records ?? [];
}

export function shouldOfferReserveActivate(networkPassphrase: string): boolean {
  return isReserveNetwork(networkPassphrase);
}

function bootstrapOps(publicKey: string, option: BootstrapOption): ReserveOp[] {
  const ops: ReserveOp[] = [{ type: "create_account", destination: publicKey }];
  if (option.asset !== NATIVE_FEE_ASSET) {
    ops.push({ type: "change_trust", asset: option.asset });
  }
  ops.push({ type: "claim_balance", balance_id: option.balanceId });
  return ops;
}

function quoteError(error: unknown, code: string): ReserveSendError {
  if (error instanceof ReserveSendError) return error;
  if (error instanceof ReserveError) {
    if (error.code === "bootstrap_busy") {
      return new ReserveSendError(
        "Another account is activating. Try again in a moment.",
      );
    }
    return new ReserveSendError(error.message);
  }
  if (error instanceof ReserveVerificationError) {
    return new ReserveSendError(error.message);
  }
  return new ReserveSendError(
    "Could not activate this wallet with {{asset}}.",
    {
      asset: code,
    },
  );
}

export async function quoteAndBuildBootstrap({
  publicKey,
  option,
  networkPassphrase,
  client,
}: {
  publicKey: string;
  option: BootstrapOption;
  networkPassphrase: string;
  client?: Reserve | null;
}): Promise<{
  xdr: string;
  quote: Quote;
  fee: ReserveFeeDisplay;
}> {
  const code = feeCode(option.asset);
  const maxSendStroops = amountToStroops(option.available);
  if (maxSendStroops <= BigInt(0)) {
    throw new ReserveSendError(
      "The waiting {{asset}} is not enough to open this account.",
      { asset: code },
    );
  }

  const reserve = client ?? createReserveClient(networkPassphrase);
  if (!reserve) {
    throw new ReserveSendError(
      "Could not activate this wallet with {{asset}}.",
      {
        asset: code,
      },
    );
  }

  try {
    const quote = await reserve.quote({
      source: publicKey,
      feeToken: option.asset,
      maxSendStroops: maxSendStroops.toString(),
      ops: bootstrapOps(publicKey, option),
    });
    const { xdr } = await reserve.build(quote);
    return {
      xdr,
      quote,
      fee: {
        amount: formatFeeAmount(quote.sendMaxStroops),
        code,
        asset: option.asset,
      },
    };
  } catch (error) {
    throw quoteError(error, code);
  }
}
