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

  it("attaches held-token icons from the icons map (keyed by canonical)", () => {
    const result = buildSwapSections({
      searchTerm: "",
      balances: [heldAqua],
      networkDetails: MAINNET,
      icons: { "AQUA:GBNZ": "https://icons/aqua.png" },
    });
    expect(result.sections.yourTokens[0].code).toBe("AQUA");
    expect(result.sections.yourTokens[0].image).toBe("https://icons/aqua.png");
  });

  it("excludes held Soroban (contract) tokens — Classic assets only", () => {
    const heldSoroban = {
      token: { code: "SRBN", issuer: { key: "GSRBN" } },
      contractId: "CAZXEHTSQATVQVWDPWWDTFSY6CM764JD4MZ6HUVPO3QKS64QEEP4KJH7",
      total: "5",
      decimals: 7,
    } as any;
    const result = buildSwapSections({
      searchTerm: "",
      balances: [heldAqua, heldSoroban],
      networkDetails: MAINNET,
    });
    expect(result.sections.yourTokens.map((r) => r.code)).toEqual(["AQUA"]);
  });

  it("sorts Your tokens by descending fiat value", () => {
    const result = buildSwapSections({
      searchTerm: "",
      balances: [heldAqua, heldXlm],
      networkDetails: MAINNET,
      tokenPrices: {
        "AQUA:GBNZ": { currentPrice: "0.01" },
        native: { currentPrice: "0.5" },
      } as any,
    });
    // AQUA: 100 * 0.01 = 1; XLM: 50 * 0.5 = 25 -> XLM sorts first.
    expect(result.sections.yourTokens.map((r) => r.code)).toEqual([
      "XLM",
      "AQUA",
    ]);
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

  it("stamps friendly securityWarnings from the scan's Warning/Malicious features (excluding Benign)", () => {
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
      scanResults: {
        "USDC-GUSD": {
          result_type: "Malicious",
          features: [
            { type: "Malicious", feature_id: "mal", description: "bad thing" },
            { type: "Benign", feature_id: "ok", description: "fine thing" },
          ],
        },
      } as any,
      networkDetails: MAINNET,
    });
    expect(merged[0].securityWarnings).toEqual([
      { description: "bad thing", isError: true, featureId: "mal" },
    ]);
  });

  it("leaves rows without a scan entry UNDECORATED when skipUnscanned is true", () => {
    const rows = [
      {
        code: "USDC",
        issuer: "GUSD",
        canonical: "USDC:GUSD",
        isHeld: false,
        requiresTrustline: true,
        domain: null,
      },
      {
        code: "AQUA",
        issuer: "GAQUA",
        canonical: "AQUA:GAQUA",
        isHeld: false,
        requiresTrustline: true,
        domain: null,
      },
    ] as any;
    // Only USDC is in the (cached) scan map.
    const merged = mergeScanResults({
      rows,
      scanResults: { "USDC-GUSD": { result_type: "Malicious" } } as any,
      networkDetails: MAINNET,
      skipUnscanned: true,
    });
    // USDC is decorated; AQUA (no scan entry) is left untouched (no premature
    // badge) rather than defaulting to SAFE/unable-to-scan.
    expect(merged[0].securityLevel).toBe(SecurityLevel.MALICIOUS);
    expect(merged[1].securityLevel).toBeUndefined();
  });

  it("decorates every scanned row by default (skipUnscanned false)", () => {
    const rows = [
      {
        code: "AQUA",
        issuer: "GAQUA",
        canonical: "AQUA:GAQUA",
        isHeld: false,
        requiresTrustline: true,
        domain: null,
      },
    ] as any;
    const merged = mergeScanResults({
      rows,
      scanResults: { "AQUA-GAQUA": { result_type: "Benign" } } as any,
      networkDetails: MAINNET,
    });
    // A benign scan still yields a defined (SAFE) level — existing behavior.
    expect(merged[0].securityLevel).toBe(SecurityLevel.SAFE);
  });

  it("omits securityWarnings when the scan has no flagged features", () => {
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
    expect(merged[0].securityWarnings).toBeUndefined();
  });
});
