import BigNumber from "bignumber.js";
import {
  getTransactionInfo,
  truncatedPublicKey,
  stroopToXlm,
  xlmToStroop,
} from "../stellar";
import * as urls from "../urls";

describe("truncatedPublicKey", () => {
  it("truncates keys", () => {
    expect(
      truncatedPublicKey(
        "GAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWU7B3",
      ),
    ).toBe("GAJV…U7B3");
  });
  it("returns empty on no input", () => {
    expect(truncatedPublicKey("")).toBe("");
  });
});

describe("getTransactionInfo", () => {
  it("detects https domain", () => {
    jest.spyOn(urls, "parsedSearchParam").mockReturnValue({
      accountToSign: "",
      url: "https://stellar.org",
      transaction: { _networkPassphrase: "foo" },
      transactionXdr: "",
      isDomainListedAllowed: true,
      flaggedKeys: { test: { tags: [""] } },
      tab: {},
    });
    const info = getTransactionInfo("foo");
    if (!("blob" in info)) {
      expect(info.isHttpsDomain).toBe(true);
    }
  });
  it("detects non-https domain", () => {
    jest.spyOn(urls, "parsedSearchParam").mockReturnValue({
      accountToSign: "",
      url: "http://stellar.org",
      transaction: { _networkPassphrase: "foo" },
      transactionXdr: "",
      isDomainListedAllowed: true,
      flaggedKeys: { test: { tags: [""] } },
      tab: {},
    });
    const info = getTransactionInfo("foo");
    if (!("blob" in info)) {
      expect(info.isHttpsDomain).toBe(false);
    }
  });
});

describe("stroopToXlm", () => {
  test("should convert a raw string representing stroops into the equivalent value in lumens", () => {
    const stroops = "10000001";
    const lumens = stroopToXlm(stroops);

    expect(lumens).toEqual(new BigNumber(Number(stroops) / 1e7));
  });

  test("should convert a raw number representing stroops into the equivalent value in lumens", () => {
    const stroops = 10000001;
    const lumens = stroopToXlm(stroops);

    expect(lumens).toEqual(new BigNumber(Number(stroops) / 1e7));
  });

  test("should convert a BigNumber representing stroops into the equivalent value in lumens", () => {
    const stroops = new BigNumber("10000001");
    const lumens = stroopToXlm(stroops);

    expect(lumens).toEqual(stroops.dividedBy(1e7));
  });
});

describe("xlmToStroop", () => {
  test("should convert a raw string representing a value in lumens to its equivalent value in stroops", () => {
    const lumens = "11";
    const stroops = xlmToStroop(lumens);

    expect(stroops).toEqual(new BigNumber(Math.round(Number(lumens) * 1e7)));
  });

  test("should convert a BigNumber representing a value in lumens to its equivalent value in stroops", () => {
    const lumens = new BigNumber("11");
    const stroops = xlmToStroop(lumens);

    expect(stroops).toEqual(lumens.times(1e7));
  });
});
