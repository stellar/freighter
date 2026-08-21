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
// host function verbatim (or tamper with it), set a fee, and attach auth entries.
const buildPreparedXdr = (
  built: Transaction,
  auth: xdr.SorobanAuthorizationEntry[],
  {
    tamperFunc = false,
    fee = BASE_FEE,
    opSource,
  }: { tamperFunc?: boolean; fee?: string; opSource?: string } = {},
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

  const op = Operation.invokeHostFunction({ func, auth, source: opSource });

  const builder = new TransactionBuilder(new Account(SOURCE, "0"), {
    fee,
    networkPassphrase: NETWORK,
  });
  return builder.addOperation(op).setTimeout(0).build().toXDR();
};

const rootTransferInvocation = (
  subInvocations: xdr.SorobanAuthorizedInvocation[] = [],
) =>
  authorizedInvocation(
    COLLECTION,
    "transfer",
    [
      new Address(SOURCE).toScVal(),
      new Address(DESTINATION).toScVal(),
      xdr.ScVal.scvU32(TOKEN_ID),
    ],
    subInvocations,
  );

const sourceAccountAuth = (subInvocations: xdr.SorobanAuthorizedInvocation[]) =>
  new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
    rootInvocation: rootTransferInvocation(subInvocations),
  });

const addressCredentialsAuth = () =>
  new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsAddress(
      new xdr.SorobanAddressCredentials({
        address: new Address(ATTACKER).toScAddress(),
        nonce: xdr.Int64.fromString("0"),
        signatureExpirationLedger: 0,
        signature: xdr.ScVal.scvVoid(),
      }),
    ),
    rootInvocation: rootTransferInvocation(),
  });

// A source-account auth entry whose root invocation is an unrelated contract
// call (a token transfer to the attacker) with no sub-invocations.
const unrelatedRootAuth = () =>
  new xdr.SorobanAuthorizationEntry({
    credentials: xdr.SorobanCredentials.sorobanCredentialsSourceAccount(),
    rootInvocation: authorizedInvocation(SAC, "transfer", [
      new Address(SOURCE).toScVal(),
      new Address(ATTACKER).toScVal(),
      xdr.ScVal.scvI128(
        new xdr.Int128Parts({
          hi: xdr.Int64.fromString("0"),
          lo: xdr.Uint64.fromString("99884944477"),
        }),
      ),
    ]),
  });

const verify = (
  built: Transaction,
  preparedXdr: string,
  maxResourceFee = "0",
) =>
  verifyFlatTransferPreparedTransaction({
    builtTransaction: built,
    preparedTransactionXdr: preparedXdr,
    networkPassphrase: NETWORK,
    maxResourceFee,
  });

describe("verifyFlatTransferPreparedTransaction", () => {
  it("accepts an honest flat transfer (source-account auth, no sub-invocations)", () => {
    const built = buildFlatTransfer();
    const preparedXdr = buildPreparedXdr(built, [sourceAccountAuth([])]);

    expect(() => verify(built, preparedXdr)).not.toThrow();
  });

  it("accepts a transfer with no auth entries at all", () => {
    const built = buildFlatTransfer();
    const preparedXdr = buildPreparedXdr(built, []);

    expect(() => verify(built, preparedXdr)).not.toThrow();
  });

  it("accepts a fee raised by up to the simulated resource fee", () => {
    const built = buildFlatTransfer(); // fee = BASE_FEE (100)
    const preparedXdr = buildPreparedXdr(built, [sourceAccountAuth([])], {
      fee: "600",
    });

    expect(() => verify(built, preparedXdr, "500")).not.toThrow();
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

    expect(() => verify(built, preparedXdr)).toThrow(
      PreparedTransactionMismatchError,
    );
  });

  it("rejects a tampered invoked host function (different arguments)", () => {
    const built = buildFlatTransfer();
    const preparedXdr = buildPreparedXdr(built, [sourceAccountAuth([])], {
      tamperFunc: true,
    });

    expect(() => verify(built, preparedXdr)).toThrow(/host function/);
  });

  it("rejects a fee larger than the built fee plus the simulated resource fee", () => {
    const built = buildFlatTransfer(); // fee = BASE_FEE (100)
    const preparedXdr = buildPreparedXdr(built, [sourceAccountAuth([])], {
      fee: "100000000",
    });

    expect(() => verify(built, preparedXdr, "500")).toThrow(/fee/);
  });

  it("rejects non-source-account (address) credentials", () => {
    const built = buildFlatTransfer();
    const preparedXdr = buildPreparedXdr(built, [addressCredentialsAuth()]);

    expect(() => verify(built, preparedXdr)).toThrow(/source-account/);
  });

  it("rejects a source-account auth entry whose root is an unrelated call", () => {
    const built = buildFlatTransfer();
    const preparedXdr = buildPreparedXdr(built, [unrelatedRootAuth()]);

    expect(() => verify(built, preparedXdr)).toThrow(/authorization root/);
  });

  it("rejects a changed operation source", () => {
    const built = buildFlatTransfer();
    const preparedXdr = buildPreparedXdr(built, [sourceAccountAuth([])], {
      opSource: ATTACKER,
    });

    expect(() => verify(built, preparedXdr)).toThrow(/operation source/);
  });

  it("rejects a non-finite simulated resource fee (fee ceiling cannot fail open)", () => {
    const built = buildFlatTransfer();
    const preparedXdr = buildPreparedXdr(built, [sourceAccountAuth([])], {
      fee: "100000000",
    });

    expect(() => verify(built, preparedXdr, "Infinity")).toThrow(
      /resource fee/,
    );
  });
});
