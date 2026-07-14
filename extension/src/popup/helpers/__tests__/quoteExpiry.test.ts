import {
  getQuoteExpiredOperationCodes,
  isQuoteExpiredError,
} from "../quoteExpiry";

const makeError = (ops: string[]) =>
  ({
    response: { extras: { result_codes: { operations: ops } } },
  }) as any;

describe("getQuoteExpiredOperationCodes", () => {
  it("returns op_under_dest_min when present", () => {
    expect(
      getQuoteExpiredOperationCodes(makeError(["op_under_dest_min"])),
    ).toEqual(["op_under_dest_min"]);
  });

  it("returns op_too_few_offers when present", () => {
    expect(
      getQuoteExpiredOperationCodes(makeError(["op_too_few_offers"])),
    ).toEqual(["op_too_few_offers"]);
  });

  it("ignores unrelated op codes", () => {
    expect(
      getQuoteExpiredOperationCodes(makeError(["op_underfunded"])),
    ).toEqual([]);
  });
});

describe("isQuoteExpiredError", () => {
  it("is true for a quote-expiry op code", () => {
    expect(isQuoteExpiredError(makeError(["op_too_few_offers"]))).toBe(true);
  });
  it("is false for a generic failure", () => {
    expect(isQuoteExpiredError(makeError(["op_underfunded"]))).toBe(false);
  });
  it("is false for undefined", () => {
    expect(isQuoteExpiredError(undefined)).toBe(false);
  });
});
