import { buildSwapSections, mergeScanResults } from "../useSwapTokenLookup";
import { NetworkDetails } from "@shared/constants/stellar";
import { SecurityLevel } from "popup/constants/blockaid";

const MAINNET = {
  network: "PUBLIC",
  networkPassphrase: "Public Global Stellar Network ; September 2015",
} as NetworkDetails;

// minimal held balance shape: getAssetFromCanonical-compatible token entries
const heldAqua = {
  token: { code: "AQUA", issuer: { key: "GBNZ" } },
  total: "100",
} as any;
const heldXlm = { token: { type: "native", code: "XLM" }, total: "50" } as any;

describe("buildSwapSections — idle (no search term)", () => {
  it("orders Your tokens then Popular (volume7d ∩ verified) and filters held out of Popular", () => {
    const result = buildSwapSections({
      searchTerm: "",
      balances: [heldAqua, heldXlm],
      networkDetails: MAINNET,
      popular: [
        { code: "AQUA", issuer: "GBNZ", domain: null, volume7d: 9 }, // held -> filtered from popular
        { code: "USDC", issuer: "GUSD", domain: null, volume7d: 9 },
      ],
      verifiedAssets: [{ code: "USDC", issuer: "GUSD", domain: null }],
      unverifiedAssets: [],
    });

    expect(result.isSearch).toBe(false);
    expect(result.sections.yourTokens.map((r) => r.code)).toEqual([
      "AQUA",
      "XLM",
    ]);
    // AQUA dropped from Popular (held); USDC kept because it is in the verified set
    expect(result.sections.popular.map((r) => r.code)).toEqual(["USDC"]);
    expect(result.sections.popular[0].requiresTrustline).toBe(true);
    expect(result.sections.popular[0].isHeld).toBe(false);
  });

  it("excludes Popular entries that are not in the verified set (volume7d ∩ verified)", () => {
    const result = buildSwapSections({
      searchTerm: "",
      balances: [],
      networkDetails: MAINNET,
      popular: [
        { code: "USDC", issuer: "GUSD", domain: null, volume7d: 9 },
        { code: "SCAM", issuer: "GSCAM", domain: null, volume7d: 9 },
      ],
      verifiedAssets: [{ code: "USDC", issuer: "GUSD", domain: null }],
      unverifiedAssets: [],
    });
    expect(result.sections.popular.map((r) => r.code)).toEqual(["USDC"]);
  });
});

describe("buildSwapSections — search term", () => {
  it("splits Your tokens / Verified / Unverified and dedupes by CODE:ISSUER", () => {
    const result = buildSwapSections({
      searchTerm: "usd",
      balances: [heldAqua],
      networkDetails: MAINNET,
      searchResults: [
        { code: "USDC", issuer: "GUSD", domain: null },
        { code: "USDC", issuer: "GUSD", domain: null }, // duplicate -> deduped
        { code: "USDT", issuer: "GUSDT", domain: null },
      ],
      verifiedAssets: [{ code: "USDC", issuer: "GUSD", domain: null }],
      unverifiedAssets: [{ code: "USDT", issuer: "GUSDT", domain: null }],
    });

    expect(result.isSearch).toBe(true);
    expect(result.sections.verified.map((r) => r.code)).toEqual(["USDC"]);
    expect(result.sections.unverified.map((r) => r.code)).toEqual(["USDT"]);
  });

  it("drops Soroban contract results and sets hadSorobanMatches", () => {
    const result = buildSwapSections({
      searchTerm: "CAZX",
      balances: [],
      networkDetails: MAINNET,
      searchResults: [
        {
          code: "WRAP",
          issuer: "CAZXEHTSQATVQVWDPWWDTFSY6CM764JD4MZ6HUVPO3QKS64QEEP4KJH7",
          contract: "CAZXEHTSQATVQVWDPWWDTFSY6CM764JD4MZ6HUVPO3QKS64QEEP4KJH7",
          domain: null,
        },
      ],
      verifiedAssets: [],
      unverifiedAssets: [],
    });

    expect(result.sections.verified).toEqual([]);
    expect(result.sections.unverified).toEqual([]);
    expect(result.hadSorobanMatches).toBe(true);
  });
});

describe("buildSwapSections — held-only fallback", () => {
  it("on fallback, omits Popular and matches held tokens only", () => {
    const result = buildSwapSections({
      searchTerm: "aqua",
      balances: [heldAqua, heldXlm],
      networkDetails: MAINNET,
      isFallback: true,
    });
    expect(result.isFallback).toBe(true);
    expect(result.sections.popular).toEqual([]);
    expect(result.sections.verified).toEqual([]);
    expect(result.sections.unverified).toEqual([]);
    expect(result.sections.yourTokens.map((r) => r.code)).toEqual(["AQUA"]);
  });
});

describe("mergeScanResults", () => {
  it("stamps securityLevel from the bulk-scan map keyed by CODE-ISSUER", () => {
    const rows = [
      {
        code: "USDC",
        issuer: "GUSD",
        canonical: "USDC:GUSD",
        isHeld: false,
        requiresTrustline: true,
        domain: null,
      },
    ] as any;
    const merged = mergeScanResults({
      rows,
      scanResults: { "USDC-GUSD": { result_type: "Malicious" } } as any,
      networkDetails: MAINNET,
    });
    expect(merged[0].securityLevel).toBe(SecurityLevel.MALICIOUS);
  });
});
