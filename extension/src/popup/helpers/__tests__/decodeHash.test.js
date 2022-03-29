import { MEMO_TYPES } from "popup/constants/memoTypes";
import { decodeMemo } from "../parseTransaction";

describe("decodeMemo", () => {
  it("should return a memo id", () => {
    const MEMO = {
      _switch: {
        name: MEMO_TYPES.MEMO_ID,
      },
      _value: {
        low: 999,
      },
    };

    expect(decodeMemo(MEMO)).toBe(999);
  });
  it("should decode and return a hashed memo", () => {
    const MEMO = {
      _switch: {
        name: MEMO_TYPES.MEMO_HASH,
      },
      _value: {
        data: [84, 104, 105],
      },
    };

    expect(decodeMemo(MEMO)).toBe("546869");
  });
  it("should decode and return a memo", () => {
    const MEMO = {
      _switch: {
        name: MEMO_TYPES.MEMO_TEXT,
      },
      _value: {
        data: [97, 115, 100, 102],
      },
    };

    expect(decodeMemo(MEMO)).toBe("asdf");
  });
});
