import BigNumber from "bignumber.js";
import { formatAmount } from "../formatters";
import { formatTokenAmount } from "../soroban";

describe("formatAmount", () => {
  it("should format a value", () => {
    const value = "1000.0001000";
    const formatted = "1,000.0001000";
    expect(formatAmount(value, value, 7).amount).toBe(formatted);
  });

  it("should format a token value", () => {
    const value = new BigNumber("10000001000");
    const formatted = "1000.0001";
    expect(formatTokenAmount(value, 7)).toBe(formatted);
  });
});
