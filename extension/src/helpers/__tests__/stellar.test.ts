import BigNumber from "bignumber.js";
import {
  getTransactionInfo,
  truncatedPublicKey,
  truncateString,
  stroopToXlm,
  xlmToStroop,
  encodeSep53Message,
  isSameAccount,
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
      uuid: "test-uuid",
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
      uuid: "test-uuid",
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

describe("isSameAccount", () => {
  // GAJV... and its muxed forms (memo ids 1 and 12345) share the same base account
  const BASE_G = "GAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWU7B3";
  const MUXED_1 =
    "MAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWUAAAAAAAAAAAAGPZI";
  const MUXED_12345 =
    "MAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWUAAAAAAAAABQHFISM";
  const OTHER_G = "GBE5XHPAMKKVHJJB6CWOFXIIAWKEJ7SSUNUMYFISYR47HOKIJ6JRA43Y";
  const CONTRACT_ID =
    "CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526";

  it("returns true for two identical base (G...) addresses", () => {
    expect(isSameAccount(BASE_G, BASE_G)).toBe(true);
  });

  it("returns true when a muxed (M...) address resolves to the base (G...) account", () => {
    expect(isSameAccount(MUXED_1, BASE_G)).toBe(true);
    expect(isSameAccount(BASE_G, MUXED_1)).toBe(true);
  });

  it("returns true for two muxed addresses sharing the same base account", () => {
    expect(isSameAccount(MUXED_1, MUXED_12345)).toBe(true);
  });

  it("returns false for different base accounts", () => {
    expect(isSameAccount(BASE_G, OTHER_G)).toBe(false);
  });

  it("returns false when comparing a contract id against a G address", () => {
    expect(isSameAccount(CONTRACT_ID, BASE_G)).toBe(false);
  });

  it("returns false for empty or nullish inputs", () => {
    expect(isSameAccount("", BASE_G)).toBe(false);
    expect(isSameAccount(BASE_G, "")).toBe(false);
    expect(isSameAccount(undefined, BASE_G)).toBe(false);
    expect(isSameAccount(BASE_G, undefined)).toBe(false);
    expect(isSameAccount("", "")).toBe(false);
  });
});

describe("encodeSep53Message", () => {
  test("should encode a simple ascii message", () => {
    const message = "Hello, World!";
    const expected = "1S61nAa7UQ0GWZf/kwdwaO7QpIbCAhW14C4asNLr6l8=";
    expect(encodeSep53Message(message).toString("base64")).toEqual(expected);
  });
});
