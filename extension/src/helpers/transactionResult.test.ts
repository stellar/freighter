import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  xdr,
} from "stellar-sdk";

import {
  findPathPaymentStrictSendIndex,
  getSettledPathPaymentStrictSendAmount,
} from "./transactionResult";

/** Builds a TransactionResult XDR (base64) whose op at `index` settled a
 * pathPaymentStrictSend for `stroops`, padded with plain payment successes. */
const buildPathPaymentSuccessResultXdr = (
  stroops: string,
  index: number,
  opCount: number,
): string => {
  const destination = xdr.PublicKey.publicKeyTypeEd25519(
    Keypair.random().rawPublicKey(),
  );
  const simple = new xdr.SimplePaymentResult({
    destination,
    asset: Asset.native().toXdrObject(),
    amount: BigInt(stroops),
  });
  const success = new xdr.PathPaymentStrictSendResultSuccess({
    offers: [],
    last: simple,
  });
  const pathPaymentOpResult = xdr.OperationResult.opInner(
    xdr.OperationResultTr.pathPaymentStrictSend(
      xdr.PathPaymentStrictSendResult.pathPaymentStrictSendSuccess(success),
    ),
  );
  const plainPaymentOpResult = xdr.OperationResult.opInner(
    xdr.OperationResultTr.payment(xdr.PaymentResult.paymentSuccess()),
  );

  const results = Array.from({ length: opCount }, (_, i) =>
    i === index ? pathPaymentOpResult : plainPaymentOpResult,
  );

  const txResult = new xdr.TransactionResult({
    feeCharged: BigInt("100"),
    result: xdr.TransactionResultResult.txSuccess(results),
    ext: xdr.TransactionResultExt.v0(),
  });
  return txResult.toXdr("base64");
};

describe("getSettledPathPaymentStrictSendAmount", () => {
  it("reads the settled destination amount in whole units", () => {
    const resultXdr = buildPathPaymentSuccessResultXdr("50000000", 0, 1);
    const amount = getSettledPathPaymentStrictSendAmount(resultXdr, 0);
    expect(amount?.toString()).toBe("5");
  });

  it("selects the operation by index when preceded by other operations (e.g. a changeTrust)", () => {
    const resultXdr = buildPathPaymentSuccessResultXdr("12345000", 1, 2);
    expect(
      getSettledPathPaymentStrictSendAmount(resultXdr, 1)?.toString(),
    ).toBe("1.2345");
    // The other operation at index 0 is a plain payment success, not a path
    // payment — reading it as one fails cleanly rather than misreading data.
    expect(getSettledPathPaymentStrictSendAmount(resultXdr, 0)).toBeNull();
  });

  it("returns null for a negative or missing operation index", () => {
    const resultXdr = buildPathPaymentSuccessResultXdr("50000000", 0, 1);
    expect(getSettledPathPaymentStrictSendAmount(resultXdr, -1)).toBeNull();
    expect(getSettledPathPaymentStrictSendAmount(resultXdr, 5)).toBeNull();
  });

  it("returns null (never throws) for garbage XDR", () => {
    expect(
      getSettledPathPaymentStrictSendAmount("not-valid-xdr", 0),
    ).toBeNull();
    expect(
      getSettledPathPaymentStrictSendAmount(undefined as unknown as string, 0),
    ).toBeNull();
  });

  it("returns null when the operation didn't succeed", () => {
    const failedResult = xdr.OperationResult.opInner(
      xdr.OperationResultTr.pathPaymentStrictSend(
        xdr.PathPaymentStrictSendResult.pathPaymentStrictSendUnderfunded(),
      ),
    );
    const txResult = new xdr.TransactionResult({
      feeCharged: BigInt("100"),
      result: xdr.TransactionResultResult.txFailed([failedResult]),
      ext: xdr.TransactionResultExt.v0(),
    });
    expect(
      getSettledPathPaymentStrictSendAmount(txResult.toXdr("base64"), 0),
    ).toBeNull();
  });
});

describe("findPathPaymentStrictSendIndex", () => {
  it("finds the operation's position, after an optional changeTrust", () => {
    const kp = Keypair.random();
    const account = new Account(kp.publicKey(), "0");
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(
        Operation.changeTrust({
          asset: new Asset("USDC", Keypair.random().publicKey()),
        }),
      )
      .addOperation(
        Operation.pathPaymentStrictSend({
          sendAsset: Asset.native(),
          sendAmount: "5",
          destination: kp.publicKey(),
          destAsset: new Asset("USDC", Keypair.random().publicKey()),
          destMin: "1",
          path: [],
        }),
      )
      .setTimeout(30)
      .build();

    expect(findPathPaymentStrictSendIndex(tx)).toBe(1);
  });
});
