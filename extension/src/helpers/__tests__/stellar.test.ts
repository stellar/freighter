import BigNumber from "bignumber.js";
import {
  getTransactionInfo,
  truncatedPublicKey,
  truncateString,
  stroopToXlm,
  xlmToStroop,
  encodeSep53Message,
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

describe("truncateString", () => {
  it("truncates using the correct default character count", () => {
    const defaultCount = 4;
    const str = truncateString(
      "GAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWU7B3",
    );
    const [firstHalf, secondHalf] = str.split("…");
    expect(firstHalf.length).toBe(defaultCount);
    expect(secondHalf.length).toBe(defaultCount);
  });

  it("truncates using the correct custom character count", () => {
    const count = 5;
    const str = truncateString(
      "GAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWU7B3",
      count,
    );
    const [firstHalf, secondHalf] = str.split("…");
    expect(firstHalf.length).toBe(count);
    expect(secondHalf.length).toBe(count);
  });
});

describe("getTransactionInfo", () => {
  it("detects https domain", () => {
    jest.spyOn(urls, "parsedSearchParam").mockReturnValue({
      accountToSign: "",
      url: "https://stellar.org",
      transaction: { _networkPassphrase: "foo" },
      transactionXdr: "",
      flaggedKeys: { test: { tags: [""] } },
      tab: {},
    });
    const info = getTransactionInfo("foo");
    if (!("blob" in info) && !("entry" in info)) {
      expect(info.isHttpsDomain).toBe(true);
    }
  });
  it("detects non-https domain", () => {
    jest.spyOn(urls, "parsedSearchParam").mockReturnValue({
      accountToSign: "",
      url: "http://stellar.org",
      transaction: { _networkPassphrase: "foo" },
      transactionXdr: "",
      flaggedKeys: { test: { tags: [""] } },
      tab: {},
    });
    const info = getTransactionInfo("foo");
    if (!("blob" in info) && !("entry" in info)) {
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

describe("encodeSep53Message", () => {
  test("should encode a simple ascii message", () => {
    const message = "Hello, World!";
    const expected = "1S61nAa7UQ0GWZf/kwdwaO7QpIbCAhW14C4asNLr6l8=";
    expect(encodeSep53Message(message).toString("base64")).toEqual(expected);
  });
});
