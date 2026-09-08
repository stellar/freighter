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

    let began = false;
    let ended = false;
    let feeCode: string | null = null;

    for (const op of inner.operations) {
      if (op.type === "beginSponsoringFutureReserves") began = true;
      if (op.type === "endSponsoringFutureReserves") ended = true;
      if (
        op.type === "pathPaymentStrictReceive" &&
        op.sendAsset &&
        !op.sendAsset.isNative() &&
        op.destAsset?.isNative()
      ) {
        feeCode = op.sendAsset.code;
      }
    }

    return began && ended && feeCode ? feeCode : null;
  } catch {
    return null;
  }
}
