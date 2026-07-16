import * as StellarSdk from "stellar-sdk";

/**
 * Build the minimal, JSON-serializable representation of a transaction that we
 * embed in the signing popup URL blob (see `freighterApiMessageListener`).
 *
 * We intentionally do NOT serialize the live stellar-sdk `Transaction` object.
 * As of stellar-sdk v16 (Protocol 27), a parsed transaction can carry native
 * `BigInt` fields — most notably the V2 precondition `minSeqAge`, which surfaces
 * as `transaction._minAccountSequenceAge` (e.g. `0n`). `JSON.stringify` throws
 * `TypeError: Do not know how to serialize a BigInt` on those, which broke
 * signing for ANY V2-precondition transaction (common for Soroban dApp txs
 * assembled via soroban-rpc) — the signing popup never opened.
 *
 * The popup rebuilds the full transaction from `transactionXdr`; the only fields
 * read off this serialized object are `_fee`, `_networkPassphrase`, and the
 * operation `type`s (used for metrics and the network-mismatch guard).
 */
const getOperations = (
  transaction: StellarSdk.Transaction | StellarSdk.FeeBumpTransaction,
) => {
  if ("innerTransaction" in transaction) {
    return transaction.innerTransaction.operations;
  }
  if ("operations" in transaction) {
    return transaction.operations;
  }
  return [];
};

export const getSerializableTransaction = (
  transaction: StellarSdk.Transaction | StellarSdk.FeeBumpTransaction,
) => ({
  _networkPassphrase: transaction.networkPassphrase,
  _fee: transaction.fee,
  _operations: getOperations(transaction).map((operation) => ({
    type: operation.type,
  })),
});
