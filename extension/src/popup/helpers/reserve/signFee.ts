import { Transaction, TransactionBuilder } from "stellar-sdk";

/** Non-native asset a sponsored/reserve tx is using to pay the network fee. */
export function tokenFeeCodeFromXdr(
  xdr: string,
  networkPassphrase: string,
): string | null {
  try {
    const parsed = TransactionBuilder.fromXdr(xdr, networkPassphrase);
    const inner =
      "innerTransaction" in parsed ? parsed.innerTransaction : parsed;
    if (!(inner instanceof Transaction)) return null;

    const codes: string[] = [];
    for (const op of inner.operations) {
      if (op.type === "payment" && op.asset && !op.asset.isNative()) {
        codes.push(op.asset.code);
      }
      if (
        (op.type === "pathPaymentStrictSend" ||
          op.type === "pathPaymentStrictReceive") &&
        "sendAsset" in op &&
        op.sendAsset &&
        !op.sendAsset.isNative()
      ) {
        codes.push(op.sendAsset.code);
      }
    }
    if (codes.includes("USDC")) return "USDC";
    return codes[codes.length - 1] ?? null;
  } catch {
    return null;
  }
}
