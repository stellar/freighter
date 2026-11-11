import {
  Account,
  Address,
  Asset,
  Keypair,
  nativeToScVal,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";

import { decodeSwapTx } from "../decodeSwapTx";
import lifi from "./fixtures/lifiSwapTx.json";

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC = `USDC:${USDC_ISSUER}`;
const ACCOUNT = Keypair.random().publicKey();
const OTHER = Keypair.random().publicKey();
const OTHER_CONTRACT = StrKey.encodeContract(Buffer.alloc(32, 7));
const usdc = new Asset("USDC", USDC_ISSUER);

const pathPayment = (destination = ACCOUNT, destAsset = usdc) =>
  Operation.pathPaymentStrictSend({
    sendAsset: Asset.native(),
    sendAmount: "10",
    destination,
    destAsset,
    destMin: "1.7150000",
    path: [],
  });

const txOf = (ops: xdr.Operation[], source = ACCOUNT) => {
  const builder = new TransactionBuilder(new Account(source, "1"), {
    fee: "150",
    networkPassphrase: Networks.PUBLIC,
  });
  ops.forEach((op) => builder.addOperation(op));
  return builder.setTimeout(180).build().toXDR();
};

const classicTx = ({
  source = ACCOUNT,
  destination = ACCOUNT,
  destAsset = usdc,
  withTrustline = false,
} = {}) =>
  txOf(
    [
      ...(withTrustline ? [Operation.changeTrust({ asset: destAsset })] : []),
      pathPayment(destination, destAsset),
    ],
    source,
  );

const decode = (transactionXdr: string, account = ACCOUNT, minOut = "1.715") =>
  decodeSwapTx({
    transactionXdr,
    networkPassphrase: Networks.PUBLIC,
    account,
    sourceAsset: "native",
    destAsset: USDC,
    minOut,
  });

// Rewrites one field of the LI.FI fixture's swap(params, …) call.
const lifiWith = (edit: (params: any) => void) => {
  const env = xdr.TransactionEnvelope.fromXDR(lifi.withTrust.xdr, "base64");
  const call = (env as any).v1.tx.operations[0].body.invokeHostFunctionOp
    .hostFunction.invokeContract;
  edit(call.args[0]);
  return env.toXDR("base64");
};
const field = (params: any, name: string) =>
  params.map.find((e: any) => String(e.key.sym) === name);
const i128 = (n: bigint) => nativeToScVal(n, { type: "i128" });

describe("decodeSwapTx", () => {
  it("reads a classic path payment", () => {
    expect(decode(classicTx())).toEqual({
      sendAmount: "10",
      minReceived: "1.715",
      fee: "0.000015",
      addsTrustline: false,
    });
  });

  it("reads the trustline and the whole fee of a classic swap", () => {
    expect(decode(classicTx({ withTrustline: true }))).toMatchObject({
      addsTrustline: true,
      fee: "0.00003",
    });
  });

  it("reads a LI.FI swap call and its trustline", () => {
    expect(
      decode(lifi.withTrust.xdr, lifi.withTrust.account, "1.8340983"),
    ).toEqual({
      sendAmount: "10",
      fee: "0.0858659",
      resourceFee: "0.0858459",
      addsTrustline: true,
    });
  });

  it("reads a LI.FI swap call without a trustline", () => {
    expect(decode(lifi.noTrust.xdr, lifi.noTrust.account)).toMatchObject({
      sendAmount: "100000",
      addsTrustline: false,
    });
  });

  it("reads the LI.FI amount sold from the transfers the auth tree allows", () => {
    const xdrString = lifiWith((params) => {
      field(params, "args").val.vec[2] = i128(BigInt(5));
    });

    expect(decode(xdrString, lifi.withTrust.account).sendAmount).toBe("10");
  });

  it("decodes a Soroban swap through any contract from its auth tree", () => {
    const env = xdr.TransactionEnvelope.fromXDR(
      lifi.withTrust.xdr,
      "base64",
    ) as any;
    const op = env.v1.tx.operations[0].body.invokeHostFunctionOp;
    const call = op.hostFunction.invokeContract;
    call.contractAddress = new Address(OTHER_CONTRACT).toScAddress();
    call.functionName = "exchange";
    call.args = [nativeToScVal(1), nativeToScVal(2), nativeToScVal(3)];
    op.auth[0].rootInvocation.function.contractFn = call;

    const decoded = decode(env.toXDR("base64"), lifi.withTrust.account, "1000");

    expect(decoded).toEqual({
      sendAmount: "10",
      fee: "0.0858659",
      resourceFee: "0.0858459",
      addsTrustline: true,
    });
    expect(decoded.minReceived).toBeUndefined();
  });

  it("accepts a zero LI.FI fee transfer, as the backend does", () => {
    const env = xdr.TransactionEnvelope.fromXDR(
      lifi.withTrust.xdr,
      "base64",
    ) as any;
    const feeTransfer =
      env.v1.tx.operations[0].body.invokeHostFunctionOp.auth[0].rootInvocation
        .subInvocations[0].function.contractFn;
    feeTransfer.args[2] = i128(BigInt(0));

    expect(
      decode(env.toXDR("base64"), lifi.withTrust.account, "1.8340983")
        .sendAmount,
    ).toBe("9.975");
  });

  it("refuses a LI.FI auth tree that transfers a negative amount", () => {
    const env = xdr.TransactionEnvelope.fromXDR(
      lifi.withTrust.xdr,
      "base64",
    ) as any;
    const feeTransfer =
      env.v1.tx.operations[0].body.invokeHostFunctionOp.auth[0].rootInvocation
        .subInvocations[0].function.contractFn;
    feeTransfer.args[2] = i128(BigInt(-1));

    expect(() =>
      decode(env.toXDR("base64"), lifi.withTrust.account, "1.8340983"),
    ).toThrow(/transfer/);
  });

  // Adds a call the account authorizes to the LI.FI fixture's auth tree.
  const lifiWithAuthorizedCall = (
    contract: string,
    functionName: string,
    args: xdr.ScVal[],
  ) => {
    const env = xdr.TransactionEnvelope.fromXDR(
      lifi.withTrust.xdr,
      "base64",
    ) as any;
    env.v1.tx.operations[0].body.invokeHostFunctionOp.auth[0].rootInvocation.subInvocations.push(
      new xdr.SorobanAuthorizedInvocation({
        function:
          xdr.SorobanAuthorizedFunction.sorobanAuthorizedFunctionTypeContractFn(
            new xdr.InvokeContractArgs({
              contractAddress: new Address(contract).toScAddress(),
              functionName,
              args: [new Address(lifi.withTrust.account).toScVal(), ...args],
            }),
          ),
        subInvocations: [],
      }),
    );
    return env.toXDR("base64");
  };

  it("refuses an allowance the account would grant alongside the swap", () => {
    const xdrString = lifiWithAuthorizedCall(
      usdc.contractId(Networks.PUBLIC),
      "approve",
      [
        new Address(OTHER).toScVal(),
        i128(BigInt("170141183460469231731687303715884105727")),
        nativeToScVal(1000000, { type: "u32" }),
      ],
    );

    expect(() =>
      decode(xdrString, lifi.withTrust.account, "1.8340983"),
    ).toThrow(/approve/);
  });

  it("refuses a trustline for an asset other than the one bought", () => {
    const xdrString = lifiWithAuthorizedCall(OTHER_CONTRACT, "trust", []);

    expect(() =>
      decode(xdrString, lifi.withTrust.account, "1.8340983"),
    ).toThrow(/trustline/);
  });

  describe("minimum received", () => {
    it("refuses a classic destMin below the minOut sent", () => {
      expect(() => decode(classicTx(), ACCOUNT, "1.7150001")).toThrow(
        /minimum/,
      );
    });
  });

  describe("operations", () => {
    it.each([
      [
        "an extra payment",
        () =>
          txOf([
            pathPayment(),
            Operation.payment({
              destination: OTHER,
              asset: Asset.native(),
              amount: "1",
            }),
          ]),
      ],
      [
        "an extra setOptions",
        () => txOf([Operation.setOptions({ homeDomain: "x" }), pathPayment()]),
      ],
      [
        "more than two operations",
        () =>
          txOf([
            Operation.changeTrust({ asset: usdc }),
            Operation.changeTrust({ asset: usdc }),
            pathPayment(),
          ]),
      ],
      [
        "a changeTrust for another asset",
        () =>
          txOf([
            Operation.changeTrust({ asset: new Asset("AQUA", OTHER) }),
            pathPayment(),
          ]),
      ],
      [
        "a changeTrust with a limit other than the maximum",
        () =>
          txOf([
            Operation.changeTrust({ asset: usdc, limit: "1000" }),
            pathPayment(),
          ]),
      ],
      [
        "a changeTrust with another source",
        () =>
          txOf([
            Operation.changeTrust({ asset: usdc, source: OTHER }),
            pathPayment(),
          ]),
      ],
      [
        "a LI.FI call with an extra payment",
        () => {
          const env = xdr.TransactionEnvelope.fromXDR(
            lifi.withTrust.xdr,
            "base64",
          ) as any;
          env.v1.tx.operations.push(
            Operation.payment({
              destination: OTHER,
              asset: Asset.native(),
              amount: "1",
            }),
          );
          return env.toXDR("base64");
        },
      ],
    ])("refuses %s", (_name, build) => {
      const account = _name.startsWith("a LI.FI")
        ? lifi.withTrust.account
        : ACCOUNT;
      expect(() => decode(build(), account)).toThrow(/does not match/);
    });
  });

  it("refuses a swap for another account", () => {
    expect(() => decode(lifi.withTrust.xdr)).toThrow(/source account/);
    expect(() => decode(classicTx({ source: OTHER }))).toThrow(
      /source account/,
    );
  });

  it("refuses a classic swap that pays someone else", () => {
    expect(() => decode(classicTx({ destination: OTHER }))).toThrow(
      /path payment/,
    );
  });

  it("refuses a swap into another asset", () => {
    expect(() =>
      decode(classicTx({ destAsset: new Asset("USDC", OTHER) })),
    ).toThrow(/path payment/);
  });
});
