import BigNumber from "bignumber.js";
import { Transaction, TransactionBuilder, xdr } from "stellar-sdk";

/**
 * Thrown when an assembled transaction does not match the transaction the wallet
 * built. Callers must treat this as "do not sign".
 */
export class PreparedTransactionMismatchError extends Error {
  constructor(reason: string) {
    super(`Prepared transaction failed verification: ${reason}`);
    this.name = "PreparedTransactionMismatchError";
  }
}

// Decode a transaction to its XDR body so individual fields can be compared
// without depending on SDK accessor shapes.
const txBody = (transactionXdr: string): xdr.Transaction =>
  xdr.TransactionEnvelope.fromXDR(transactionXdr, "base64").v1().tx();

/**
 * Verify that a backend-assembled `preparedTransactionXdr` still matches the flat
 * Soroban transfer the wallet built, before it is signed.
 *
 * When the wallet builds a transfer with no authorization entries and delegates
 * simulation and assembly to a backend, the authorization entries, resource fee,
 * and Soroban resource data are derived from simulating the target contract
 * rather than constructed by the wallet. The wallet is the only party that knows
 * the intended call, so it must confirm the assembled transaction still matches
 * that intent before signing.
 *
 * Assembly is only allowed to change three things: the transaction `fee` (raising
 * it by at most the simulated resource fee), the Soroban resource data
 * (`ext` / sorobanData), and the operation's authorization entries. Everything
 * else must be identical to what the wallet built. Concretely we refuse to sign
 * when:
 *  - the operation set is not the single invokeHostFunction we built, or its host
 *    function (contract, function, args) is not byte-identical, or
 *  - any other envelope field (source, sequence, memo, preconditions) differs, or
 *  - the fee exceeds the built fee plus the simulated resource fee, or
 *  - any auth entry is not source-account credentials, or authorizes
 *    sub-invocations below the root.
 *
 * A flat transfer never legitimately needs sub-invocations. Flows that do (e.g.
 * swaps) must not use this helper — they need effect-bounded verification.
 */
export const verifyFlatTransferPreparedTransaction = ({
  builtTransaction,
  preparedTransactionXdr,
  networkPassphrase,
  maxResourceFee,
}: {
  builtTransaction: Transaction;
  preparedTransactionXdr: string;
  networkPassphrase: string;
  // The resource fee reported by simulation and shown to the user, in stroops.
  maxResourceFee: string;
}): void => {
  const prepared = TransactionBuilder.fromXDR(
    preparedTransactionXdr,
    networkPassphrase,
  );

  if (!(prepared instanceof Transaction)) {
    throw new PreparedTransactionMismatchError(
      "prepared transaction is a fee-bump, not a plain transaction",
    );
  }

  if (prepared.operations.length !== 1) {
    throw new PreparedTransactionMismatchError(
      `expected exactly 1 operation, got ${prepared.operations.length}`,
    );
  }

  const builtOp = builtTransaction.operations[0];
  const preparedOp = prepared.operations[0];

  if (
    builtOp.type !== "invokeHostFunction" ||
    preparedOp.type !== "invokeHostFunction"
  ) {
    throw new PreparedTransactionMismatchError(
      "operation is not invokeHostFunction",
    );
  }

  // The invoked host function — contract, function name, and arguments — must be
  // exactly what the wallet constructed.
  if (builtOp.func.toXDR("base64") !== preparedOp.func.toXDR("base64")) {
    throw new PreparedTransactionMismatchError(
      "invoked host function does not match the transaction the wallet built",
    );
  }

  // The operation source determines the source-account credential identity, so it
  // is part of the wallet's intent and must not be changed during assembly. The
  // wallet builds the operation with no explicit source (it inherits the tx
  // source), so both must be undefined here.
  if (builtOp.source !== preparedOp.source) {
    throw new PreparedTransactionMismatchError(
      "operation source does not match the transaction the wallet built",
    );
  }

  // Every other envelope field must be identical to what the wallet built. Only
  // fee, sorobanData (ext), and the operation's auth are allowed to change during
  // assembly, and those are checked separately below.
  const builtBody = txBody(builtTransaction.toXDR());
  const preparedBody = txBody(preparedTransactionXdr);
  const envelopeFields: [
    string,
    (tx: xdr.Transaction) => { toXDR(format: "base64"): string },
  ][] = [
    ["source account", (tx) => tx.sourceAccount()],
    ["sequence number", (tx) => tx.seqNum()],
    ["memo", (tx) => tx.memo()],
    ["preconditions", (tx) => tx.cond()],
  ];
  envelopeFields.forEach(([label, get]) => {
    if (get(builtBody).toXDR("base64") !== get(preparedBody).toXDR("base64")) {
      throw new PreparedTransactionMismatchError(
        `${label} does not match the transaction the wallet built`,
      );
    }
  });

  // The fee may only be raised by the simulated resource fee that the user was
  // shown. A larger fee means the signed envelope authorizes spending more than
  // the review screen displayed. Validate the resource fee first: a non-finite
  // or negative value would otherwise make the ceiling non-finite and pass any
  // fee.
  const resourceFee = new BigNumber(maxResourceFee || "0");
  if (
    !resourceFee.isFinite() ||
    !resourceFee.isInteger() ||
    resourceFee.isNegative()
  ) {
    throw new PreparedTransactionMismatchError(
      "simulated resource fee is not a valid non-negative integer",
    );
  }
  const maxFee = new BigNumber(builtTransaction.fee).plus(resourceFee);
  if (new BigNumber(prepared.fee).isGreaterThan(maxFee)) {
    throw new PreparedTransactionMismatchError(
      "fee exceeds the built fee plus the simulated resource fee",
    );
  }

  // Every auth entry must be covered by the plain source-account signature, must
  // authorize exactly the transfer we invoked (not some other contract call), and
  // must not authorize anything beneath that root invocation.
  const intendedCall = builtOp.func.invokeContract().toXDR("base64");
  const auths = preparedOp.auth || [];
  for (const auth of auths) {
    if (
      auth.credentials().switch() !==
      xdr.SorobanCredentialsType.sorobanCredentialsSourceAccount()
    ) {
      throw new PreparedTransactionMismatchError(
        "authorization entry is not source-account credentials",
      );
    }

    const rootFunction = auth.rootInvocation().function();
    if (
      rootFunction.switch() !==
      xdr.SorobanAuthorizedFunctionType.sorobanAuthorizedFunctionTypeContractFn()
    ) {
      throw new PreparedTransactionMismatchError(
        "authorization root is not a contract-function call",
      );
    }
    if (rootFunction.contractFn().toXDR("base64") !== intendedCall) {
      throw new PreparedTransactionMismatchError(
        "authorization root does not match the invoked transfer",
      );
    }

    if (auth.rootInvocation().subInvocations().length > 0) {
      throw new PreparedTransactionMismatchError(
        "authorization entry authorizes sub-invocations",
      );
    }
  }
};
