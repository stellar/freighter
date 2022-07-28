import { Tabs } from "webextension-polyfill-ts";
import { getTransactionInfo, truncatedPublicKey } from "../stellar";
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
      tab: {} as Tabs.Tab,
    });
    expect(getTransactionInfo("foo").isHttpsDomain).toBe(true);
  });
  it("detects non-https domain", () => {
    jest.spyOn(urls, "parsedSearchParam").mockReturnValue({
      accountToSign: "",
      url: "http://stellar.org",
      transaction: { _networkPassphrase: "foo" },
      transactionXdr: "",
      isDomainListedAllowed: true,
      flaggedKeys: { test: { tags: [""] } },
      tab: {} as Tabs.Tab,
    });
    expect(getTransactionInfo("foo").isHttpsDomain).toBe(false);
  });
});
