import BigNumber from "bignumber.js";
import { formatAmount, scrubPathGkey } from "../formatters";
import { formatTokenAmount } from "../soroban";

describe("formatAmount", () => {
  it("should format a value", () => {
    const value = "1000.0001000";
    const formatted = "1,000.0001000";
    expect(formatAmount(value)).toBe(formatted);
  });

  it("should format a token value", () => {
    const value = new BigNumber("10000001000");
    const formatted = "1000.0001";
    expect(formatTokenAmount(value, 7)).toBe(formatted);
  });
});

describe("scrubPathGkey", () => {
  const ADDRESS = "GCBDC5AVPZEOSO3IAASQZSVRJMHX3UCCZH5O7S53FPZ636LQ5RHEW65H";
  it("should redact a G address from a URL", () => {
    const route = "account-history/";
    const url =
      "http://0.0.0.0:3002/api/v1/account-history/GCBDC5AVPZEOSO3IAASQZSVRJMHX3UCCZH5O7S53FPZ636LQ5RHEW65H?network=PUBLIC";
    const expected =
      "http://0.0.0.0:3002/api/v1/account-history/REDACTED?network=PUBLIC";
    expect(scrubPathGkey(route, url)).toBe(expected);
  });
  it("should redact a G address from a URL with no query params", () => {
    const route = "account-history/";
    const url =
      "http://0.0.0.0:3002/api/v1/account-history/GCBDC5AVPZEOSO3IAASQZSVRJMHX3UCCZH5O7S53FPZ636LQ5RHEW65H";
    const expected = "http://0.0.0.0:3002/api/v1/account-history/REDACTED";
    expect(scrubPathGkey(route, url)).toBe(expected);
  });
  it("should return the URL in cases where it cannot redact", () => {
    const route = "account-history/";
    const url = "not-even-a-url";
    expect(scrubPathGkey(route, url)).toBe(url);
  });
});
