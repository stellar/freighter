import {
  Account,
  Address,
  Networks,
  Operation,
  StrKey,
  Transaction,
  TransactionBuilder,
  BASE_FEE,
  xdr,
} from "stellar-sdk";

import { transfer } from "@shared/helpers/soroban/token";
import {
  verifyFlatTransferPreparedTransaction,
  PreparedTransactionMismatchError,
} from "@shared/helpers/soroban/verifyPreparedTransaction";

const NETWORK = Networks.TESTNET;

// Deterministic, valid strkey addresses for the test.
const SOURCE = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
const DESTINATION = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 2));
const ATTACKER = StrKey.encodeEd25519PublicKey(Buffer.alloc(32, 9));
const COLLECTION = StrKey.encodeContract(Buffer.alloc(32, 1));
const SAC = StrKey.encodeContract(Buffer.alloc(32, 7));
const TOKEN_ID = 1;

const buildFlatTransfer = (): Transaction => {
  const builder = new TransactionBuilder(new Account(SOURCE, "0"), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  });
  const params = [
    new Address(SOURCE).toScVal(),
    new Address(DESTINATION).toScVal(),
    xdr.ScVal.scvU32(TOKEN_ID),
  ];
  return transfer(COLLECTION, params, undefined, builder);
};

const invokeContractArgs = (
  contractId: string,
  fn: string,
  args: xdr.ScVal[],
) =>
  new xdr.InvokeContractArgs({
    contractAddress: new Address(contractId).toScAddress(),
    functionName: fn,
    args,
  });

const authorizedInvocation = (
  contractId: string,
  fn: string,
  args: xdr.ScVal[],
  subInvocations: xdr.SorobanAuthorizedInvocation[] = [],
) =>
  new xdr.SorobanAuthorizedInvocation({
    function:
      xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
        invokeContractArgs(contractId, fn, args),
      ),
    subInvocations,
  });

// Rebuild the transaction the way an assembling backend does: reuse the invoked
// host function verbatim and attach the given auth entries.
const buildPreparedXdr = (
  built: Transaction,
  auth: xdr.SorobanAuthorizationEntry[],
  { tamperFunc = false }: { tamperFunc?: boolean } = {},
): string => {
  const originalOp = built.operations[0];
  if (originalOp.type !== "invokeHostFunction") {
    throw new Error("test setup: expected invokeHostFunction");
  }

  const func = tamperFunc
    ? xdr.HostFunction.hostFunctionTypeInvokeContract(
        // Same contract/function, but a different destination argument.
        invokeContractArgs(COLLECTION, "transfer", [
          new Address(SOURCE).toScVal(),
          new Address(ATTACKER).toScVal(),
          xdr.ScVal.scvU32(TOKEN_ID),
        ]),
      )
    : originalOp.func;

  const op = Operation.invokeHostFunction({ func, auth });

  const builder = new TransactionBuilder(new Account(SOURCE, "0"), {
    fee: BASE_FEE,
    networkPassphrase: NETWORK,
  });
  return builder.addOperation(op).setTimeout(0).build().toXDR();
};

const sourceAccountAuth = (subInvocations: xdr.SorobanAuthorizedInvocation[]) =>
  new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
    rootInvocation: authorizedInvocation(
      COLLECTION,
      "transfer",
      [
        new Address(SOURCE).toScVal(),
        new Address(DESTINATION).toScVal(),
        xdr.ScVal.scvU32(TOKEN_ID),
      ],
      subInvocations,
    ),
  });

describe("verifyFlatTransferPreparedTransaction", () => {
  it("accepts an honest flat transfer (source-account auth, no sub-invocations)", () => {
    const built = buildFlatTransfer();
    const preparedXdr = buildPreparedXdr(built, [sourceAccountAuth([])]);

    expect(() =>
      verifyFlatTransferPreparedTransaction({
        builtTransaction: built,
        preparedTransactionXdr: preparedXdr,
        networkPassphrase: NETWORK,
      }),
    ).not.toThrow();
  });

  it("accepts a transfer with no auth entries at all", () => {
    const built = buildFlatTransfer();
    const preparedXdr = buildPreparedXdr(built, []);

    expect(() =>
      verifyFlatTransferPreparedTransaction({
        builtTransaction: built,
        preparedTransactionXdr: preparedXdr,
        networkPassphrase: NETWORK,
      }),
    ).not.toThrow();
  });

  it("rejects sub-invocations injected under the source-account entry", () => {
    const built = buildFlatTransfer();
    // A token transfer recorded as a sub-invocation under the root entry.
    const drain = authorizedInvocation(SAC, "transfer", [
      new Address(SOURCE).toScVal(),
      new Address(ATTACKER).toScVal(),
      xdr.ScVal.scvI128(
        new xdr.Int128Parts({
          hi: xdr.Int64.fromString("0"),
          lo: xdr.Uint64.fromString("99884944477"),
        }),
      ),
    ]);
    const preparedXdr = buildPreparedXdr(built, [sourceAccountAuth([drain])]);

    expect(() =>
      verifyFlatTransferPreparedTransaction({
        builtTransaction: built,
        preparedTransactionXdr: preparedXdr,
        networkPassphrase: NETWORK,
      }),
    ).toThrow(PreparedTransactionMismatchError);
  });

  it("rejects a tampered invoked host function (different arguments)", () => {
    const built = buildFlatTransfer();
    const preparedXdr = buildPreparedXdr(built, [sourceAccountAuth([])], {
      tamperFunc: true,
    });

    expect(() =>
      verifyFlatTransferPreparedTransaction({
        builtTransaction: built,
        preparedTransactionXdr: preparedXdr,
        networkPassphrase: NETWORK,
      }),
    ).toThrow(/host function/);
  });
});
