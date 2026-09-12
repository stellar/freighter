/** Local annotation of the exact route used by a successful Freighter send. */
export interface SoranPaymentReference {
  networkPassphrase: string;
  transactionHash: string;
  destination: string;
  memo: string;
  memoType: string;
}

export interface SoranPaymentName extends SoranPaymentReference {
  name: string;
}

export const soranPaymentKey = (
  publicKey: string,
  payment: SoranPaymentReference,
) =>
  JSON.stringify([
    publicKey,
    payment.networkPassphrase,
    payment.transactionHash,
    payment.destination,
    payment.memoType || "none",
    payment.memo || "",
  ]);
