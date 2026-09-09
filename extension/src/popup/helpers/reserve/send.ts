import BigNumber from "bignumber.js";
import { stroopsToAmount } from "@cavos/reserve";

import { isMuxedAccount } from "helpers/stellar";
import { isContractId } from "popup/helpers/soroban";
import { cleanAmount } from "popup/helpers/formatters";
import { computeDestMinWithSlippage } from "helpers/transaction";

import { Reserve, ReserveError, createReserveClient } from "./client";
import { maxSendStroopsForFee } from "./feeAssets";
import { isReserveNetwork } from "./network";
import { NATIVE_FEE_ASSET } from "./types";
import type { ReserveFeeDisplay, Quote } from "./types";
import type { ReserveOp } from "@cavos/reserve";

function formatFeeAmount(stroops: number | string): string {
  return new BigNumber(stroopsToAmount(stroops)).toFixed();
}

export class ReserveSendError extends Error {
  constructor(
    readonly i18nKey: string,
    readonly i18nParams?: Record<string, string>,
  ) {
    super(i18nKey);
    this.name = "ReserveSendError";
  }
}

export function shouldUseReserve({
  feeAsset,
  networkPassphrase,
  isPathPayment,
  isCollectible,
}: {
  feeAsset: string;
  networkPassphrase: string;
  isPathPayment: boolean;
  isCollectible: boolean;
}): boolean {
  if (!feeAsset || feeAsset === NATIVE_FEE_ASSET) return false;
  if (!isReserveNetwork(networkPassphrase)) return false;
  if (isPathPayment || isCollectible) return false;
  return true;
}

function feeCode(feeAsset: string): string {
  if (feeAsset === NATIVE_FEE_ASSET) return "XLM";
  return feeAsset.split(":")[0] || feeAsset;
}

export async function quoteAndBuildReservePayment({
  publicKey,
  destination,
  sendAsset,
  sendAmount,
  feeAsset,
  feeTokenAvailable,
  isDestinationFunded,
  memo,
  networkPassphrase,
  client,
}: {
  publicKey: string;
  destination: string;
  sendAsset: string;
  sendAmount: string;
  feeAsset: string;
  feeTokenAvailable: string;
  isDestinationFunded: boolean;
  memo?: string;
  networkPassphrase: string;
  client?: Reserve | null;
}): Promise<{
  xdr: string;
  quote: Quote;
  fee: ReserveFeeDisplay;
}> {
  const code = feeCode(feeAsset);

  if (memo) {
    throw new ReserveSendError(
      "Memo is not supported when paying the fee with a token.",
    );
  }
  if (isMuxedAccount(destination) || isContractId(destination)) {
    throw new ReserveSendError(
      "Paying the fee with a token is not supported for this destination.",
    );
  }
  if (!isDestinationFunded) {
    throw new ReserveSendError(
      "Paying the fee with a token to an unfunded account is not supported yet.",
    );
  }

  const amount = cleanAmount(sendAmount);
  const maxSendStroops = maxSendStroopsForFee({
    feeAsset,
    feeTokenAvailable,
    sendAsset,
    sendAmount: amount,
  });
  if (maxSendStroops <= BigInt(0)) {
    throw new ReserveSendError("Keep some {{asset}} to pay the network fee.", {
      asset: code,
    });
  }

  const reserve = client ?? createReserveClient(networkPassphrase);
  if (!reserve) {
    throw new ReserveSendError("Could not quote a fee in {{asset}}.", {
      asset: code,
    });
  }

  try {
    const quote = await reserve.quote({
      source: publicKey,
      feeToken: feeAsset,
      maxSendStroops: maxSendStroops.toString(),
      ops: [
        {
          type: "payment",
          destination,
          asset: sendAsset,
          amount,
        },
      ],
    });
    const { xdr } = await reserve.build(quote);
    return {
      xdr,
      quote,
      fee: {
        amount: formatFeeAmount(quote.sendMaxStroops),
        code,
        asset: feeAsset,
      },
    };
  } catch (error) {
    if (error instanceof ReserveSendError) throw error;
    if (error instanceof ReserveError) {
      throw new ReserveSendError("Could not quote a fee in {{asset}}.", {
        asset: code,
      });
    }
    throw new ReserveSendError("Could not quote a fee in {{asset}}.", {
      asset: code,
    });
  }
}

export async function quoteAndBuildReserveSwap({
  publicKey,
  sendAsset,
  sendAmount,
  destAsset,
  destinationAmount,
  allowedSlippage,
  path,
  requiresTrustline,
  feeAsset,
  feeTokenAvailable,
  memo,
  networkPassphrase,
  client,
}: {
  publicKey: string;
  sendAsset: string;
  sendAmount: string;
  destAsset: string;
  destinationAmount: string;
  allowedSlippage: string;
  path: string[];
  requiresTrustline: boolean;
  feeAsset: string;
  feeTokenAvailable: string;
  memo?: string;
  networkPassphrase: string;
  client?: Reserve | null;
}): Promise<{
  xdr: string;
  quote: Quote;
  fee: ReserveFeeDisplay;
}> {
  const code = feeCode(feeAsset);

  if (memo) {
    throw new ReserveSendError(
      "Memo is not supported when paying the fee with a token.",
    );
  }
  if (isContractId(sendAsset.split(":")[1] || "") || isContractId(destAsset.split(":")[1] || "")) {
    throw new ReserveSendError(
      "Paying the fee with a token is not supported for this destination.",
    );
  }

  const amount = cleanAmount(sendAmount);
  const maxSendStroops = maxSendStroopsForFee({
    feeAsset,
    feeTokenAvailable,
    sendAsset,
    sendAmount: amount,
  });
  if (maxSendStroops <= BigInt(0)) {
    throw new ReserveSendError("Keep some {{asset}} to pay the network fee.", {
      asset: code,
    });
  }

  const destMin = computeDestMinWithSlippage(
    allowedSlippage,
    destinationAmount,
  ).toFixed(7);

  const ops: ReserveOp[] = [];
  if (requiresTrustline) {
    ops.push({ type: "change_trust", asset: destAsset });
  }
  ops.push({
    type: "path_payment_strict_send",
    destination: publicKey,
    send_asset: sendAsset,
    send_amount: amount,
    dest_asset: destAsset,
    dest_min: destMin,
    path,
  });

  const reserve = client ?? createReserveClient(networkPassphrase);
  if (!reserve) {
    throw new ReserveSendError("Could not quote a fee in {{asset}}.", {
      asset: code,
    });
  }

  try {
    const quote = await reserve.quote({
      source: publicKey,
      feeToken: feeAsset,
      maxSendStroops: maxSendStroops.toString(),
      ops,
    });
    const { xdr } = await reserve.build(quote);
    return {
      xdr,
      quote,
      fee: {
        amount: formatFeeAmount(quote.sendMaxStroops),
        code,
        asset: feeAsset,
      },
    };
  } catch (error) {
    if (error instanceof ReserveSendError) throw error;
    if (error instanceof ReserveError) {
      throw new ReserveSendError(error.message);
    }
    throw new ReserveSendError("Could not quote a fee in {{asset}}.", {
      asset: code,
    });
  }
}
