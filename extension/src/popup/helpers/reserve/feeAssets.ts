import BigNumber from "bignumber.js";

import { AssetType } from "@shared/api/types/account-balance";
import { getCanonicalFromAsset } from "helpers/stellar";
import { isClassicBalance, isNativeBalance } from "popup/helpers/balance";

import { NATIVE_FEE_ASSET, type FeeAssetOption } from "./types";

export const DEFAULT_MAX_FEE_STROOPS = BigInt(10000000);

export function canPayFeeInXlm({
  nativeAvailable,
  requiredFeeXlm,
}: {
  nativeAvailable: string;
  requiredFeeXlm: string;
}): boolean {
  try {
    return new BigNumber(nativeAvailable || "0").gte(
      new BigNumber(requiredFeeXlm || "0"),
    );
  } catch {
    return false;
  }
}

export function nativeAvailableFromBalances(balances: AssetType[]): string {
  const native = balances.find(isNativeBalance);
  if (!native) return "0";
  // `available` is total minus selling liabilities. The reserve is still
  // locked, so spendable for a fee is available minus minimumBalance.
  const spendable = new BigNumber(native.available || 0).minus(
    native.minimumBalance || 0,
  );
  return spendable.gt(0) ? spendable.toString() : "0";
}

export function listFeeAssetOptions({
  acceptedTokens,
  balances,
  nativeAvailable,
  requiredFeeXlm,
}: {
  acceptedTokens: string[];
  balances: AssetType[];
  nativeAvailable: string;
  requiredFeeXlm: string;
}): FeeAssetOption[] {
  const options: FeeAssetOption[] = [];

  if (canPayFeeInXlm({ nativeAvailable, requiredFeeXlm })) {
    options.push({
      asset: NATIVE_FEE_ASSET,
      code: "XLM",
      issuer: "",
      available: nativeAvailable,
    });
  }

  const accepted = new Set(
    acceptedTokens.filter((token) => token !== "native"),
  );

  for (const balance of balances) {
    if (!isClassicBalance(balance)) continue;
    const canonical = getCanonicalFromAsset(
      balance.token.code,
      balance.token.issuer.key,
    );
    if (!accepted.has(canonical)) continue;
    if (balance.available.lte(0)) continue;
    options.push({
      asset: canonical,
      code: balance.token.code,
      issuer: balance.token.issuer.key,
      available: balance.available.toString(),
    });
  }

  return options.sort((a, b) => {
    if (a.asset === NATIVE_FEE_ASSET) return -1;
    if (b.asset === NATIVE_FEE_ASSET) return 1;
    if (a.code === "USDC" && b.code !== "USDC") return -1;
    if (b.code === "USDC" && a.code !== "USDC") return 1;
    return a.code.localeCompare(b.code);
  });
}

export function resolveFeeAsset({
  options,
  current,
}: {
  options: FeeAssetOption[];
  current: string;
}): string {
  if (options.some((option) => option.asset === current)) {
    return current;
  }
  const native = options.find((option) => option.asset === NATIVE_FEE_ASSET);
  if (native) return native.asset;
  return options[0]?.asset ?? NATIVE_FEE_ASSET;
}

export function amountToStroops(amount: string): bigint {
  const value = new BigNumber(amount || "0");
  if (value.isNaN() || value.lt(0)) return BigInt(0);
  return BigInt(
    value.shiftedBy(7).integerValue(BigNumber.ROUND_DOWN).toFixed(0),
  );
}

export function maxSendStroopsForFee({
  feeAsset,
  feeTokenAvailable,
  sendAsset,
  sendAmount,
  capStroops = DEFAULT_MAX_FEE_STROOPS,
}: {
  feeAsset: string;
  feeTokenAvailable: string;
  sendAsset: string;
  sendAmount: string;
  capStroops?: bigint;
}): bigint {
  let leftover = amountToStroops(feeTokenAvailable);
  if (feeAsset === sendAsset) {
    const sending = amountToStroops(sendAmount);
    leftover = leftover > sending ? leftover - sending : BigInt(0);
  }
  return leftover < capStroops ? leftover : capStroops;
}

/**
 * Max / percentage buttons must leave something in the fee token so Reserve
 * can quote. When the user is selling that same token, withhold the fee cap
 * (or 1 stroop if the balance is smaller than the cap).
 */
export function withholdFeeFromSend({
  spendable,
  feeAsset,
  sendAsset,
}: {
  spendable: string;
  feeAsset: string;
  sendAsset: string;
}): string {
  if (!feeAsset || feeAsset === NATIVE_FEE_ASSET || feeAsset !== sendAsset) {
    return spendable;
  }
  const spendableStroops = amountToStroops(spendable);
  if (spendableStroops <= BigInt(0)) return "0";
  const withhold =
    spendableStroops > DEFAULT_MAX_FEE_STROOPS
      ? DEFAULT_MAX_FEE_STROOPS
      : BigInt(1);
  if (spendableStroops <= withhold) return "0";
  return new BigNumber((spendableStroops - withhold).toString())
    .shiftedBy(-7)
    .toFixed();
}

export function shouldOfferFeeAssetPicker({
  isClassicPayment,
  isClassicSwap,
  isReserveReady,
}: {
  isClassicPayment: boolean;
  isClassicSwap?: boolean;
  isReserveReady: boolean;
}): boolean {
  return isReserveReady && (isClassicPayment || Boolean(isClassicSwap));
}

/** Amount shown next to "Fee:". The picker already names the asset. */
export function feeRowAmount({
  reserveFee,
  showPicker,
  nativeFee,
  nativeCode = "XLM",
}: {
  reserveFee?: { amount: string; code: string } | null;
  showPicker: boolean;
  nativeFee: string;
  nativeCode?: string;
}): string | null {
  if (reserveFee) {
    return showPicker
      ? reserveFee.amount
      : `${reserveFee.amount} ${reserveFee.code}`;
  }
  if (showPicker) return null;
  return `${nativeFee} ${nativeCode}`;
}
