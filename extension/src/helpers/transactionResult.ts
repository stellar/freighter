import BigNumber from "bignumber.js";
import { Transaction, FeeBumpTransaction, xdr } from "stellar-sdk";

import { stroopToXlm } from "helpers/stellar";

/**
 * Locates a `pathPaymentStrictSend` operation's position within a built
 * transaction. Operations and their per-operation results are always
 * positionally aligned, so this index is what selects the right entry out of
 * the decoded transaction result.
 */
export const findPathPaymentStrictSendIndex = (
  transaction: Transaction | FeeBumpTransaction,
): number => {
  const operations =
    "innerTransaction" in transaction
      ? transaction.innerTransaction.operations
      : transaction.operations;
  return operations.findIndex((op) => op.type === "pathPaymentStrictSend");
};

/**
 * Reads the *settled* destination amount of a `pathPaymentStrictSend`
 * operation from a transaction's Horizon result XDR — never the quote.
 * Returns whole units (classic/native assets are always 7 decimals, and
 * swap legs are always native or classic).
 *
 * Returns `null` for anything that isn't a clean success read: the
 * transaction/operation didn't succeed, the operation at `operationIndex`
 * wasn't a pathPaymentStrictSend, or the XDR couldn't be parsed. Callers
 * treat `null` as `to_amount_usd_status: "error"` — this never throws out
 * of a telemetry path.
 */
export const getSettledPathPaymentStrictSendAmount = (
  resultXdr: string,
  operationIndex: number,
): BigNumber | null => {
  if (operationIndex < 0) {
    return null;
  }
  try {
    const txResult = xdr.TransactionResult.fromXdr(resultXdr, "base64");
    const innerResult = txResult.result;

    // A fee-bump transaction's per-operation results live one level down, in
    // the inner transaction's own result.
    const innerTxResult =
      innerResult.type === "txFeeBumpInnerSuccess" ||
      innerResult.type === "txFeeBumpInnerFailed"
        ? innerResult.innerResultPair.result.result
        : innerResult;

    if (
      innerTxResult.type !== "txSuccess" &&
      innerTxResult.type !== "txFailed"
    ) {
      return null;
    }
    const opResults = innerTxResult.results;

    const opResult = opResults[operationIndex];
    if (!opResult || opResult.type !== "opInner") {
      return null;
    }
    if (opResult.tr.type !== "pathPaymentStrictSend") {
      return null;
    }

    const pathResult = opResult.tr.pathPaymentStrictSendResult;
    if (pathResult.type !== "pathPaymentStrictSendSuccess") {
      return null;
    }
    const success = pathResult.success;
    const stroops = success.last.amount;

    return stroopToXlm(new BigNumber(stroops.toString()));
  } catch {
    return null;
  }
};
