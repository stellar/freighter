import { TransactionBuilder, Networks, xdr } from "stellar-sdk";

import { encodeObject, decodeString } from "helpers/urls";
import { getSerializableTransaction } from "background/helpers/transactionInfo";

/**
 * Real mainnet Soroban swap (Soroswap aggregator `strict_send`) built with V2
 * preconditions. On stellar-sdk v16 the parsed transaction carries a native
 * BigInt (`_minAccountSequenceAge`), which used to make `encodeObject`'s
 * JSON.stringify throw and prevented the signing popup from ever opening.
 */
const V2_PRECONDITION_XDR =
  "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";

describe("getSerializableTransaction", () => {
  it("produces a JSON-serializable popup blob for a V2-precondition Soroban tx", () => {
    const transaction = TransactionBuilder.fromXDR(
      V2_PRECONDITION_XDR,
      Networks.PUBLIC,
    );

    const transactionInfo = {
      transaction: getSerializableTransaction(transaction),
      transactionXdr: V2_PRECONDITION_XDR,
      tab: {},
      url: "https://soroswap.finance",
      flaggedKeys: {},
      uuid: "test-uuid",
    };

    // Regression: this used to throw `TypeError: Do not know how to serialize
    // a BigInt` because the live transaction's `_minAccountSequenceAge` is a
    // native bigint on stellar-sdk v16+.
    let encoded = "";
    expect(() => {
      encoded = encodeObject(transactionInfo);
    }).not.toThrow();

    // ...and it round-trips back to exactly the fields the popup consumes.
    const decoded = JSON.parse(decodeString(encoded));
    expect(decoded.transaction._networkPassphrase).toBe(Networks.PUBLIC);
    expect(decoded.transaction._fee).toBe((transaction as any).fee);
    expect(decoded.transaction._operations).toEqual([
      { type: "invokeHostFunction" },
    ]);
    expect(decoded.transactionXdr).toBe(V2_PRECONDITION_XDR);
  });

  it("emits no BigInt values for any V2-precondition transaction", () => {
    const transaction = TransactionBuilder.fromXDR(
      V2_PRECONDITION_XDR,
      Networks.PUBLIC,
    );

    // Sanity-check the precondition really is V2 (the trigger for the bug).
    const cond = xdr.TransactionEnvelope.fromXDR(V2_PRECONDITION_XDR, "base64")
      .v1()
      .tx()
      .cond();
    expect(cond.switch().name).toBe("precondV2");

    const serialized = getSerializableTransaction(transaction);
    const hasBigInt = (value: unknown): boolean => {
      if (typeof value === "bigint") {
        return true;
      }
      if (value && typeof value === "object") {
        return Object.values(value).some(hasBigInt);
      }
      return false;
    };
    expect(hasBigInt(serialized)).toBe(false);
  });

  it("avoids the BigInt that makes the live transaction object unserializable", () => {
    const transaction = TransactionBuilder.fromXDR(
      V2_PRECONDITION_XDR,
      Networks.PUBLIC,
    );

    // This is the regression we are guarding against: embedding the live
    // stellar-sdk Transaction (as the handler used to) is not serializable on
    // v16+ because the V2 `minSeqAge` precondition is a native bigint.
    const minSeqAge = (transaction as any)._minAccountSequenceAge;
    if (typeof minSeqAge === "bigint") {
      expect(() => encodeObject({ transaction } as any)).toThrow(/BigInt/);
    }

    // The serialized form must always be safe.
    expect(() =>
      encodeObject({ transaction: getSerializableTransaction(transaction) }),
    ).not.toThrow();
  });

  it("preserves operation types for a fee-bump transaction", () => {
    const inner = TransactionBuilder.fromXDR(
      V2_PRECONDITION_XDR,
      Networks.PUBLIC,
    );
    const feeBump = TransactionBuilder.buildFeeBumpTransaction(
      "GBKWMR7TJ7BBICOOXRY2SWXKCWPTOHZPI6MP4LNNE5A73VP3WADGG3CH",
      "2000000",
      inner as any,
      Networks.PUBLIC,
    );

    const serialized = getSerializableTransaction(feeBump);
    expect(serialized._networkPassphrase).toBe(Networks.PUBLIC);
    expect(serialized._operations).toEqual([{ type: "invokeHostFunction" }]);
    expect(() => encodeObject({ transaction: serialized })).not.toThrow();
  });
});
