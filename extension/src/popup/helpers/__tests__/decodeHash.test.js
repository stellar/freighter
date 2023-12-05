import { MEMO_TYPES } from "popup/constants/memoTypes";
import { decodeMemo } from "../parseTransaction";

describe("decodeMemo", () => {
  it("should return a memo id", () => {
    const MEMO = {
      _type: "id",
      _value: 999,
    };

    expect(decodeMemo(MEMO).value).toBe(999);
    expect(decodeMemo(MEMO).type).toBe(MEMO_TYPES.MEMO_ID);
  });
  it("should decode and return a hashed memo", () => {
    const MEMO = {
      _type: "hash",
      _value: [84, 104, 105],
    };

    expect(decodeMemo(MEMO).value).toBe("546869");
    expect(decodeMemo(MEMO).type).toBe(MEMO_TYPES.MEMO_HASH);
  });
  it("should decode and return a return memo", () => {
    const MEMO = {
      _type: "return",
      _value: [84, 104, 105],
    };

    expect(decodeMemo(MEMO).value).toBe("546869");
    expect(decodeMemo(MEMO).type).toBe(MEMO_TYPES.MEMO_RETURN);
  });
  it("should decode and return a text memo", () => {
    const MEMO = {
      _type: "text",
      _value: [97, 115, 100, 102],
    };

    expect(decodeMemo(MEMO).value).toBe("asdf");
    expect(decodeMemo(MEMO).type).toBe(MEMO_TYPES.MEMO_TEXT);
  });
});
