import {
  getUrlHostname,
  getUrlDomain,
  getPunycodedDomain,
  encodeObject,
  decodeString,
  newTabHref,
  removeQueryParam,
} from "../urls";

describe("getPunycodedDomain", () => {
  it("returns ASCII domain unchanged", () => {
    expect(getPunycodedDomain("example.com")).toBe("example.com");
    expect(getPunycodedDomain("stellar.org")).toBe("stellar.org");
  });

  it("converts IDN domains to punycode", () => {
    // German umlaut: münchen.de -> xn--mnchen-3ya.de
    expect(getPunycodedDomain("münchen.de")).toBe("xn--mnchen-3ya.de");

    // Greek domain
    expect(getPunycodedDomain("παράδειγμα.δοκιμή")).toBe(
      "xn--hxajbheg2az3al.xn--jxalpdlp",
    );

    // Chinese domain
    expect(getPunycodedDomain("例え.jp")).toBe("xn--r8jz45g.jp");
  });

  it("handles homograph attack domains", () => {
    // Cyrillic 'а' looks like Latin 'a' but encodes differently
    // This is the kind of attack the punycode normalization prevents
    expect(getPunycodedDomain("stellar.org")).toBe("stellar.org");
    // Cyrillic 'stеllаr.org' (with Cyrillic е and а) would be different
  });

  it("handles empty string", () => {
    expect(getPunycodedDomain("")).toBe("");
  });

  it("handles subdomains with IDN", () => {
    expect(getPunycodedDomain("subdomain.münchen.de")).toBe(
      "subdomain.xn--mnchen-3ya.de",
    );
  });
});

describe("getUrlHostname", () => {
  it("extracts hostname from valid URLs", () => {
    expect(getUrlHostname("https://example.com")).toBe("example.com");
    expect(getUrlHostname("https://example.com/path")).toBe("example.com");
    expect(getUrlHostname("https://sub.example.com:8080/path?query=1")).toBe(
      "sub.example.com",
    );
  });

  it("returns empty string for invalid URLs", () => {
    expect(getUrlHostname("not-a-url")).toBe("");
    expect(getUrlHostname("")).toBe("");
  });
});

describe("getUrlDomain", () => {
  it("extracts domain from URL", () => {
    expect(getUrlDomain("https://example.com")).toBe("example.com");
    expect(getUrlDomain("https://sub.example.com")).toBe("example.com");
    expect(getUrlDomain("https://deep.sub.example.com")).toBe("example.com");
  });

  it("returns empty string for invalid URLs", () => {
    expect(getUrlDomain("not-a-url")).toBe("");
    expect(getUrlDomain("")).toBe("");
  });
});

describe("encodeObject and decodeString", () => {
  it("round-trips objects correctly", () => {
    const obj = { foo: "bar", num: 123 };
    const encoded = encodeObject(obj);
    const decoded = JSON.parse(decodeString(encoded));
    expect(decoded).toEqual(obj);
  });

  it("handles unicode characters", () => {
    const obj = { text: "münchen", emoji: "🎉" };
    const encoded = encodeObject(obj);
    const decoded = JSON.parse(decodeString(encoded));
    expect(decoded).toEqual(obj);
  });
});

describe("newTabHref", () => {
  it("constructs href with path", () => {
    expect(newTabHref("/settings")).toBe("index.html#/settings");
  });

  it("constructs href with path and query params", () => {
    expect(newTabHref("/settings", "foo=bar")).toBe(
      "index.html#/settings?foo=bar",
    );
  });

  it("handles empty path", () => {
    expect(newTabHref()).toBe("index.html#");
  });
});

describe("removeQueryParam", () => {
  it("removes query params from URL", () => {
    expect(removeQueryParam("https://example.com?foo=bar")).toBe(
      "https://example.com",
    );
  });

  it("returns URL unchanged if no query params", () => {
    expect(removeQueryParam("https://example.com")).toBe("https://example.com");
  });

  it("handles empty string", () => {
    expect(removeQueryParam()).toBe("");
  });
});
