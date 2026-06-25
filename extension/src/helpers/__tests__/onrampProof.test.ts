import {
  canonicalizeJson,
  sha256Hex,
  buildOnrampClaims,
  assembleAuthHeader,
} from "../onrampProof";

describe("onrampProof helper", () => {
  it("canonicalizes with sorted keys, no whitespace", () => {
    expect(canonicalizeJson({ b: 1, a: "x" })).toEqual('{"a":"x","b":1}');
    expect(canonicalizeJson({})).toEqual("{}");
  });

  it("sha256Hex of {} matches the known vector", () => {
    expect(sha256Hex("{}")).toEqual(
      "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a",
    );
  });

  it("buildOnrampClaims produces the contract shape", () => {
    const claims = buildOnrampClaims({
      publicKey: "GABC",
      body: {},
      nowSeconds: 1000,
    });
    expect(claims).toEqual({
      sub: "GABC",
      method: "POST",
      path: "/api/v1/onramp/token",
      body_hash: sha256Hex("{}"),
      exp: 1015,
    });
  });

  it("assembleAuthHeader base64url-encodes payload and signature", () => {
    const header = assembleAuthHeader("{}", Buffer.from([1, 2, 3]));
    expect(header).toEqual(
      `Stellar ${Buffer.from("{}", "utf8").toString("base64url")}.${Buffer.from([1, 2, 3]).toString("base64url")}`,
    );
  });

  // Regression guard: the bundled browser `buffer` polyfill cannot produce the
  // Node-only "base64url" encoding, and the backend verifier expects url-safe
  // base64. So the header must never contain "+", "/", or "=". This runs in
  // Node (where "base64url" *is* available), so it would NOT catch a
  // `.toString("base64url")` regression — it specifically catches a fallback to
  // standard base64. See onrampProof.ts toBase64Url.
  it("assembleAuthHeader emits url-safe base64 (no +, / or = padding)", () => {
    // Bytes chosen so standard base64 is "+/+/+w==" — contains +, /, and =.
    const signature = Buffer.from([0xfb, 0xff, 0xbf, 0xfb]);
    expect(signature.toString("base64")).toMatch(/[+/=]/);

    const header = assembleAuthHeader("{}", signature);
    expect(header).toMatch(/^Stellar [A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(header).not.toMatch(/[+/=]/);
  });
});
