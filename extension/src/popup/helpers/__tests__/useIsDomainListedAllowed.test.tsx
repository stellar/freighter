import React from "react";
import { Provider } from "react-redux";
import { renderHook } from "@testing-library/react";
import { useIsDomainListedAllowed } from "../useIsDomainListedAllowed";
import { makeDummyStore } from "popup/__testHelpers__";

describe("useIsDomainListedAllowed", () => {
  const TEST_PUBLIC_KEY =
    "GBTYAFHGNZSTE4VBWZYAGB3SRGJEPTI5I4Y22KZ4JTVAN56LESB6JZOF";

  const createWrapper = (
    allowList: Record<string, Record<string, string[]>>,
  ) => {
    const store = makeDummyStore({
      auth: {
        publicKey: TEST_PUBLIC_KEY,
      },
      settings: {
        allowList,
        networkDetails: {
          networkName: "MAINNET",
          networkUrl: "https://horizon.stellar.org",
          networkPassphrase: "Public Global Stellar Network ; September 2015",
        },
      },
    });

    return ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
  };

  it("returns true for domain in allowlist", () => {
    const wrapper = createWrapper({
      MAINNET: {
        [TEST_PUBLIC_KEY]: ["example.com", "stellar.org"],
      },
    });

    const { result } = renderHook(
      () => useIsDomainListedAllowed({ domain: "example.com" }),
      { wrapper },
    );

    expect(result.current.isDomainListedAllowed).toBe(true);
  });

  it("returns false for domain not in allowlist", () => {
    const wrapper = createWrapper({
      MAINNET: {
        [TEST_PUBLIC_KEY]: ["example.com"],
      },
    });

    const { result } = renderHook(
      () => useIsDomainListedAllowed({ domain: "other.com" }),
      { wrapper },
    );

    expect(result.current.isDomainListedAllowed).toBe(false);
  });

  it("matches IDN domain against punycode-stored version", () => {
    // This is the core fix: domains are stored as punycode (xn--mnchen-3ya.de)
    // but the domain passed in might be the Unicode version (münchen.de)
    const wrapper = createWrapper({
      MAINNET: {
        [TEST_PUBLIC_KEY]: ["xn--mnchen-3ya.de"], // punycode for münchen.de
      },
    });

    const { result } = renderHook(
      () => useIsDomainListedAllowed({ domain: "münchen.de" }),
      { wrapper },
    );

    expect(result.current.isDomainListedAllowed).toBe(true);
  });

  it("matches punycode domain against punycode-stored version", () => {
    // When domain is already punycode, it should still match
    const wrapper = createWrapper({
      MAINNET: {
        [TEST_PUBLIC_KEY]: ["xn--mnchen-3ya.de"],
      },
    });

    const { result } = renderHook(
      () => useIsDomainListedAllowed({ domain: "xn--mnchen-3ya.de" }),
      { wrapper },
    );

    expect(result.current.isDomainListedAllowed).toBe(true);
  });

  it("returns false when allowlist is empty", () => {
    const wrapper = createWrapper({
      MAINNET: {
        [TEST_PUBLIC_KEY]: [],
      },
    });

    const { result } = renderHook(
      () => useIsDomainListedAllowed({ domain: "example.com" }),
      { wrapper },
    );

    expect(result.current.isDomainListedAllowed).toBe(false);
  });

  it("returns false when no allowlist for network", () => {
    const wrapper = createWrapper({});

    const { result } = renderHook(
      () => useIsDomainListedAllowed({ domain: "example.com" }),
      { wrapper },
    );

    expect(result.current.isDomainListedAllowed).toBe(false);
  });

  it("handles mixed ASCII and IDN allowlist correctly", () => {
    const wrapper = createWrapper({
      MAINNET: {
        [TEST_PUBLIC_KEY]: [
          "stellar.org",
          "xn--mnchen-3ya.de", // münchen.de in punycode
          "example.com",
        ],
      },
    });

    // ASCII domain should match
    const { result: asciiResult } = renderHook(
      () => useIsDomainListedAllowed({ domain: "stellar.org" }),
      { wrapper },
    );
    expect(asciiResult.current.isDomainListedAllowed).toBe(true);

    // IDN domain should match its punycode version
    const { result: idnResult } = renderHook(
      () => useIsDomainListedAllowed({ domain: "münchen.de" }),
      { wrapper },
    );
    expect(idnResult.current.isDomainListedAllowed).toBe(true);
  });
});
