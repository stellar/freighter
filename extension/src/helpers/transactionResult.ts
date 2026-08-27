import BigNumber from "bignumber.js";
import { Transaction, FeeBumpTransaction, xdr } from "stellar-sdk";

/**
 * Locates a `pathPaymentStrictSend` operation's position within a built
 * transaction. Operations and their per-operation results are always
 * positionally aligned, so this index is what selects the right entry out of
 * the decoded transaction result (TR-26).
 */
export const findPathPaymentStrictSendIndex = (
  transaction: Transaction | FeeBumpTransaction,
): number => {
  if (!("operations" in transaction)) {
    return -1;
  }
  return transaction.operations.findIndex(
    (op) => op.type === "pathPaymentStrictSend",
  );
};

/**
 * Reads the *settled* destination amount of a `pathPaymentStrictSend`
 * operation from a transaction's Horizon result XDR (TR-26) — never the
 * quote. Returns whole units (classic/native assets are always 7 decimals,
 * and swap legs are always native or classic, TR-50).
 *
 * Returns `null` for anything that isn't a clean success read: the
 * transaction/operation didn't succeed, the operation at `operationIndex`
 * wasn't a pathPaymentStrictSend, or the XDR couldn't be parsed. Callers
 * treat `null` as `to_amount_usd_status: "error"` (TR-41) — this never
 * throws out of a telemetry path.
 */
export const getSettledPathPaymentStrictSendAmount = (
  resultXdr: string,
  operationIndex: number,
): BigNumber | null => {
  if (operationIndex < 0) {
    return null;
  }
  try {
    const txResult = xdr.TransactionResult.fromXDR(resultXdr, "base64");
    const innerResult = txResult.result();

    // A fee-bump transaction's per-operation results live one level down, in
    // the inner transaction's own result.
    const opResults =
      innerResult.switch().name === "txFeeBumpInnerSuccess" ||
      innerResult.switch().name === "txFeeBumpInnerFailed"
        ? innerResult.innerResultPair().result().result().results()
        : innerResult.results();

    const opResult = opResults[operationIndex];
    if (!opResult) {
      return null;
    }

    const pathResult = opResult.tr().pathPaymentStrictSendResult();
    const success = pathResult.success();
    const stroops = success.last().amount();

    return new BigNumber(stroops.toString()).dividedBy(1e7);
  } catch {
    return null;
  }
};
