import {
  Asset,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";

import { tokenFeeCodeFromXdr } from "../reserve/signFee";

const SRC = Keypair.random();
const DEST = Keypair.random();
const ISSUER = "GCKUFD5KAAM6DRSLODK55OVECMB5IJ5NSFQYFTBZRPOTJASUKTBZXGS2";

function xdrWithOps(ops: ReturnType<typeof Operation.payment>[]) {
  const tx = new TransactionBuilder(
    {
      accountId: () => SRC.publicKey(),
      sequenceNumber: () => "1",
      incrementSequenceNumber: () => undefined,
    } as any,
    { fee: "200", networkPassphrase: Networks.TESTNET },
  );
  for (const op of ops) tx.addOperation(op);
  return tx.setTimeout(30).build().toXdr();
}

describe("tokenFeeCodeFromXdr", () => {
  it("reads the fee token from a sponsored Reserve inner tx", () => {
    const xdr = xdrWithOps([
      Operation.beginSponsoringFutureReserves({
        sponsoredId: SRC.publicKey(),
      }),
      Operation.payment({
        destination: DEST.publicKey(),
        asset: new Asset("USDC", ISSUER),
        amount: "1",
      }),
      Operation.endSponsoringFutureReserves(),
      Operation.pathPaymentStrictReceive({
        sendAsset: new Asset("USDC", ISSUER),
        sendMax: "1",
        destination: DEST.publicKey(),
        destAsset: Asset.native(),
        destAmount: "0.1",
      }),
    ]);
    expect(tokenFeeCodeFromXdr(xdr, Networks.TESTNET)).toBe("USDC");
  });

  it("ignores a dApp payment plus strict-receive without sponsorship", () => {
    const xdr = xdrWithOps([
      Operation.payment({
        destination: DEST.publicKey(),
        asset: new Asset("USDC", ISSUER),
        amount: "1",
      }),
      Operation.pathPaymentStrictReceive({
        sendAsset: new Asset("USDC", ISSUER),
        sendMax: "1",
        destination: DEST.publicKey(),
        destAsset: Asset.native(),
        destAmount: "0.1",
      }),
    ]);
    expect(tokenFeeCodeFromXdr(xdr, Networks.TESTNET)).toBeNull();
  });

  it("ignores a lone dApp strict-receive", () => {
    const xdr = xdrWithOps([
      Operation.pathPaymentStrictReceive({
        sendAsset: new Asset("USDC", ISSUER),
        sendMax: "1",
        destination: DEST.publicKey(),
        destAsset: Asset.native(),
        destAmount: "0.1",
      }),
    ]);
    expect(tokenFeeCodeFromXdr(xdr, Networks.TESTNET)).toBeNull();
  });

  it("ignores a plain token payment", () => {
    const xdr = xdrWithOps([
      Operation.payment({
        destination: DEST.publicKey(),
        asset: new Asset("USDC", ISSUER),
        amount: "1",
      }),
    ]);
    expect(tokenFeeCodeFromXdr(xdr, Networks.TESTNET)).toBeNull();
  });

  it("ignores a strict-send swap", () => {
    const xdr = xdrWithOps([
      Operation.pathPaymentStrictSend({
        sendAsset: new Asset("USDC", ISSUER),
        sendAmount: "1",
        destination: DEST.publicKey(),
        destAsset: Asset.native(),
        destMin: "0.1",
      }),
    ]);
    expect(tokenFeeCodeFromXdr(xdr, Networks.TESTNET)).toBeNull();
  });

  it("is silent on a native-only payment", () => {
    const xdr = xdrWithOps([
      Operation.payment({
        destination: DEST.publicKey(),
        asset: Asset.native(),
        amount: "1",
      }),
    ]);
    expect(tokenFeeCodeFromXdr(xdr, Networks.TESTNET)).toBeNull();
  });
});
