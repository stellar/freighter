import { scrubStrKeys } from "@shared/helpers/stellarStrKey";

const G_KEY = "GA4EFTUDCDT7QNG2FXFISAH7W3V42BIYINBGCMPS7ZUFUR6KBWG2QTPH";
const S_KEY = "SBKWZZZ3GQOUQYTDYNAXDGN6WXBOFKGTRMD2IOGLJYXUTH4MHWNZFAHK";
const C_KEY = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const M_KEY =
  "MAJVUHQV535IYW25XBTWTCUXNHLQN4F2PGIPOOX4DDKL2UPNXUHWUAAAAAAAAAAAAGPZI";
// CAP-84 muxed contract: the SEP-23 test vector.
const W_KEY =
  "WA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJUAAAAAAAAAAAAAWWC";

describe("scrubStrKeys", () => {
  it.each([
    ["G", G_KEY],
    ["S", S_KEY],
    ["C", C_KEY],
    ["M", M_KEY],
    ["W", W_KEY],
  ])("replaces a %s… key with its prefix sentinel", (prefix, key) => {
    expect(scrubStrKeys(`failed for ${key} on testnet`)).toBe(
      `failed for ${prefix}*** on testnet`,
    );
  });

  it("scrubs every key in a string, whatever the mix of types", () => {
    expect(scrubStrKeys(`${G_KEY} -> ${W_KEY}`)).toBe("G*** -> W***");
  });

  it("leaves a same-length run inside a longer token alone", () => {
    expect(scrubStrKeys(`x${W_KEY}x`)).toBe(`x${W_KEY}x`);
  });

  it("returns undefined for a missing input", () => {
    expect(scrubStrKeys(null)).toBeUndefined();
    expect(scrubStrKeys(undefined)).toBeUndefined();
  });
});
