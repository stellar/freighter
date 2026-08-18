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

/**
 * Verify that a backend-assembled `preparedTransaction` still matches the flat
 * Soroban transfer the wallet built, before it is signed.
 *
 * When the wallet builds a transfer with no authorization entries and delegates
 * simulation and assembly to a backend, the authorization entries are derived
 * from simulating the target contract rather than constructed by the wallet.
 * The wallet is the only party that knows the intended call, so it must confirm
 * the assembled transaction still matches that intent before signing.
 *
 * For a flat transfer we refuse to sign anything where:
 *  - the invoked host function is not byte-identical to what we built (simulation
 *    may only add fee / sorobanData / auth, never change the call), or
 *  - any auth entry is not source-account credentials, or
 *  - any auth entry authorizes sub-invocations below the root.
 *
 * A flat transfer never legitimately needs sub-invocations. Flows that do (e.g.
 * swaps) must not use this helper — they need effect-bounded verification.
 */
export const verifyFlatTransferPreparedTransaction = ({
  builtTransaction,
  preparedTransactionXdr,
  networkPassphrase,
}: {
  builtTransaction: Transaction;
  preparedTransactionXdr: string;
  networkPassphrase: string;
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
  // exactly what the wallet constructed. Simulation is only allowed to add
  // fee / sorobanData / auth, never to alter the call itself.
  if (builtOp.func.toXDR("base64") !== preparedOp.func.toXDR("base64")) {
    throw new PreparedTransactionMismatchError(
      "invoked host function does not match the transaction the wallet built",
    );
  }

  // Every auth entry must be covered by the plain source-account signature and
  // must not authorize anything beneath the root invocation.
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

    if (auth.rootInvocation().subInvocations().length > 0) {
      throw new PreparedTransactionMismatchError(
        "authorization entry authorizes sub-invocations",
      );
    }
  }
};
