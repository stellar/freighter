import { Memo } from "stellar-sdk";
import { MEMO_TYPES } from "popup/constants/memoTypes";
import { decodeMemo } from "../parseTransaction";

describe("decodeMemo", () => {
  it("should return a memo id", () => {
    const MEMO = Memo.id("999");

    expect(decodeMemo(MEMO).value).toBe("999");
    expect(decodeMemo(MEMO).type).toBe(MEMO_TYPES.MEMO_ID);
  });
  it("should decode and return a hashed memo", () => {
    const MEMO = Memo.hash(
      "e98869bba8bce08c10b78406202127f3888c25454cd37b02600862452751f526",
    );

    expect(decodeMemo(MEMO).value).toBe(
      "e98869bba8bce08c10b78406202127f3888c25454cd37b02600862452751f526",
    );
    expect(decodeMemo(MEMO).type).toBe(MEMO_TYPES.MEMO_HASH);
  });
  it("should decode and return a return memo", () => {
    const MEMO = Memo.return(
      "e98869bba8bce08c10b78406202127f3888c25454cd37b02600862452751f526",
    );

    expect(decodeMemo(MEMO).value).toBe(
      "e98869bba8bce08c10b78406202127f3888c25454cd37b02600862452751f526",
    );
    expect(decodeMemo(MEMO).type).toBe(MEMO_TYPES.MEMO_RETURN);
  });
  it("should decode and return a text memo", () => {
    const MEMO = Memo.text("asdf");

    expect(decodeMemo(MEMO).value).toBe("asdf");
    expect(decodeMemo(MEMO).type).toBe(MEMO_TYPES.MEMO_TEXT);
  });
});
