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
  it("reads USDC from a sponsored payment", () => {
    const xdr = xdrWithOps([
      Operation.payment({
        destination: DEST.publicKey(),
        asset: new Asset("USDC", ISSUER),
        amount: "1",
      }),
    ]);
    expect(tokenFeeCodeFromXdr(xdr, Networks.TESTNET)).toBe("USDC");
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
