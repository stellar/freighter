import {
  Account,
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";

import { decodeSwapTx } from "../decodeSwapTx";
import lifi from "./fixtures/lifiSwapTx.json";

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC = `USDC:${USDC_ISSUER}`;
const ACCOUNT = Keypair.random().publicKey();

const classicTx = ({
  source = ACCOUNT,
  destination = ACCOUNT,
  destAsset = new Asset("USDC", USDC_ISSUER),
  withTrustline = false,
} = {}) => {
  const builder = new TransactionBuilder(new Account(source, "1"), {
    fee: "150",
    networkPassphrase: Networks.PUBLIC,
  });
  if (withTrustline) {
    builder.addOperation(Operation.changeTrust({ asset: destAsset }));
  }
  return builder
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: Asset.native(),
        sendAmount: "10",
        destination,
        destAsset,
        destMin: "1.7150000",
        path: [],
      }),
    )
    .setTimeout(180)
    .build()
    .toXDR();
};

const decode = (transactionXdr: string, account = ACCOUNT) =>
  decodeSwapTx({
    transactionXdr,
    networkPassphrase: Networks.PUBLIC,
    account,
    sourceAsset: "native",
    destAsset: USDC,
  });

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
    expect(decode(lifi.withTrust.xdr, lifi.withTrust.account)).toEqual({
      sendAmount: "10",
      minReceived: "1.8340983",
      fee: "0.0858659",
      resourceFee: "0.0858459",
      addsTrustline: true,
    });
  });

  it("reads a LI.FI swap call without a trustline", () => {
    expect(decode(lifi.noTrust.xdr, lifi.noTrust.account)).toMatchObject({
      sendAmount: "100000",
      minReceived: "18191.30443",
      addsTrustline: false,
    });
  });

  it("refuses a swap for another account", () => {
    expect(() => decode(lifi.withTrust.xdr)).toThrow(/source account/);
    expect(() => decode(classicTx({ source: lifi.noTrust.account }))).toThrow(
      /source account/,
    );
  });

  it("refuses a classic swap that pays someone else", () => {
    expect(() =>
      decode(classicTx({ destination: lifi.noTrust.account })),
    ).toThrow(/path payment/);
  });

  it("refuses a swap into another asset", () => {
    const other = new Asset("USDC", lifi.noTrust.account);
    expect(() => decode(classicTx({ destAsset: other }))).toThrow(
      /path payment/,
    );
    expect(() =>
      decodeSwapTx({
        transactionXdr: lifi.withTrust.xdr,
        networkPassphrase: Networks.PUBLIC,
        account: lifi.withTrust.account,
        sourceAsset: "native",
        destAsset: `USDC:${lifi.noTrust.account}`,
      }),
    ).toThrow(/swap call/);
  });
});
