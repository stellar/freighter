import { Transaction, TransactionBuilder } from "stellar-sdk";

export function tokenFeeCodeFromXdr(
  xdr: string,
  networkPassphrase: string,
): string | null {
  try {
    const parsed = TransactionBuilder.fromXdr(xdr, networkPassphrase);
    const inner =
      "innerTransaction" in parsed ? parsed.innerTransaction : parsed;
    if (!(inner instanceof Transaction)) return null;
    if (inner.operations.length < 2) return null;

    for (const op of inner.operations) {
      if (
        op.type === "pathPaymentStrictReceive" &&
        op.sendAsset &&
        !op.sendAsset.isNative() &&
        op.destAsset?.isNative()
      ) {
        return op.sendAsset.code;
      }
    }
    return null;
  } catch {
    return null;
  }
}
