import {
  buildSwapSections,
  mergeScanResults,
  omitHiddenFromSections,
} from "../useSwapTokenLookup";
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
const CONTRACT = "CAZXEHTSQATVQVWDPWWDTFSY6CM764JD4MZ6HUVPO3QKS64QEEP4KJH7";
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

  it("lists a held Soroban contract token by its contract ID, at its decimals", () => {
    const heldSoroban = {
      token: { code: "SRBN", issuer: { key: CONTRACT } },
      contractId: CONTRACT,
      total: "1500000000000000000",
      decimals: 18,
    } as any;
    const result = buildSwapSections({
      searchTerm: "",
      balances: [heldAqua, heldSoroban],
      networkDetails: MAINNET,
    });
    expect(result.sections.yourTokens.map((r) => r.code)).toEqual([
      "AQUA",
      "SRBN",
    ]);
    expect(result.sections.yourTokens[1]).toMatchObject({
      issuer: CONTRACT,
      canonical: `SRBN:${CONTRACT}`,
      isContract: true,
      requiresTrustline: false,
      decimals: 18,
      tokenAmount: "1.5",
    });
  });

  it("keeps Popular Soroban contract tokens the verified lists vouch for", () => {
    const result = buildSwapSections({
      searchTerm: "",
      balances: [],
      networkDetails: MAINNET,
      popular: [
        {
          code: "TKN",
          issuer: CONTRACT,
          contract: CONTRACT,
          domain: null,
          volume7d: 9,
          decimals: 6,
        },
      ],
      verifiedAssets: [{ code: "TKN", issuer: CONTRACT, domain: null }],
    });
    expect(result.sections.popular[0]).toMatchObject({
      code: "TKN",
      isContract: true,
      requiresTrustline: false,
      decimals: 6,
    });
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
      verifiedAssets: [{ code: "USDC", issuer: "GUSD", domain: null }],
      unverifiedAssets: [{ code: "USDT", issuer: "GUSDT", domain: null }],
    });

    expect(result.isSearch).toBe(true);
    expect(result.sections.verified.map((r) => r.code)).toEqual(["USDC"]);
    expect(result.sections.unverified.map((r) => r.code)).toEqual(["USDT"]);
  });

  it("keeps Soroban contract results, with no trustline to add", () => {
    const wrap = {
      code: "WRAP",
      issuer: CONTRACT,
      contract: CONTRACT,
      domain: null,
      decimals: 18,
    };
    const result = buildSwapSections({
      searchTerm: "CAZX",
      balances: [],
      networkDetails: MAINNET,
      verifiedAssets: [],
      unverifiedAssets: [wrap],
    });

    expect(result.sections.unverified).toEqual([
      expect.objectContaining({
        code: "WRAP",
        canonical: `WRAP:${CONTRACT}`,
        isContract: true,
        requiresTrustline: false,
        decimals: 18,
      }),
    ]);
  });
});

describe("buildSwapSections — a contract token is one identity", () => {
  // Held: the on-chain symbol; search: stellar.expert's code. Same contract.
  const heldSoroban = {
    token: { code: "SYM", issuer: { key: CONTRACT } },
    contractId: CONTRACT,
    total: "1000000",
    decimals: 6,
  } as any;
  const searchRow = {
    code: "ABC",
    issuer: CONTRACT,
    contract: CONTRACT,
    domain: null,
  };

  it("dedupes a search row for a held contract, whatever code it carries", () => {
    const result = buildSwapSections({
      searchTerm: "abc",
      balances: [heldSoroban],
      networkDetails: MAINNET,
      verifiedAssets: [searchRow],
      unverifiedAssets: [],
    });

    expect(result.sections.verified).toEqual([]);
  });

  it("keeps a Popular row for a held contract out, whatever code it carries", () => {
    const result = buildSwapSections({
      searchTerm: "",
      balances: [heldSoroban],
      networkDetails: MAINNET,
      popular: [{ ...searchRow, volume7d: 9 }],
      verifiedAssets: [searchRow],
    });

    expect(result.sections.popular).toEqual([]);
  });

  it("hides a contract token by its contract, whatever code the row carries", () => {
    const result = buildSwapSections({
      searchTerm: "abc",
      balances: [],
      networkDetails: MAINNET,
      verifiedAssets: [searchRow],
      unverifiedAssets: [],
    });

    expect(
      omitHiddenFromSections(result, { [`SYM:${CONTRACT}`]: "hidden" }).sections
        .verified,
    ).toEqual([]);
  });
});

describe("buildSwapSections — off mainnet", () => {
  const TESTNET = {
    network: "TESTNET",
    networkPassphrase: "Test SDF Network ; September 2015",
  } as NetworkDetails;
  const wrap = { code: "WRAP", issuer: CONTRACT, domain: null, decimals: 7 };
  const heldWrap = {
    token: { code: "WRAP", issuer: { key: CONTRACT } },
    contractId: CONTRACT,
    total: "10000000",
    decimals: 7,
  } as any;

  it("leaves unheld contract tokens out of search and Popular, keeping held ones", () => {
    const search = buildSwapSections({
      searchTerm: "wrap",
      balances: [heldWrap],
      networkDetails: TESTNET,
      verifiedAssets: [{ code: "USDC", issuer: "GUSD", domain: null }],
      unverifiedAssets: [{ ...wrap, code: "WRAP2" }],
    });
    const idle = buildSwapSections({
      searchTerm: "",
      balances: [],
      networkDetails: TESTNET,
      popular: [{ ...wrap, contract: CONTRACT, volume7d: 0 }],
      verifiedAssets: [wrap],
    });

    expect(search.sections.yourTokens.map((r) => r.code)).toEqual(["WRAP"]);
    expect(search.sections.verified.map((r) => r.code)).toEqual(["USDC"]);
    expect(search.sections.unverified).toEqual([]);
    expect(idle.sections.popular).toEqual([]);
  });
});

describe("omitHiddenFromSections", () => {
  // A hidden token is left out of `balances`, so it would otherwise look new
  const hidden = { "USDC:GUSD": "hidden" } as const;

  it("drops a hidden token from Popular", () => {
    const result = buildSwapSections({
      searchTerm: "",
      balances: [heldXlm],
      networkDetails: MAINNET,
      popular: [
        { code: "USDC", issuer: "GUSD", domain: null, volume7d: 9 },
        { code: "EURC", issuer: "GEUR", domain: null, volume7d: 9 },
      ],
      verifiedAssets: [
        { code: "USDC", issuer: "GUSD", domain: null },
        { code: "EURC", issuer: "GEUR", domain: null },
      ],
      unverifiedAssets: [],
    });

    expect(
      omitHiddenFromSections(result, hidden).sections.popular.map(
        (r) => r.code,
      ),
    ).toEqual(["EURC"]);
  });

  it("drops a hidden token from the Verified and Unverified results", () => {
    const result = buildSwapSections({
      searchTerm: "u",
      balances: [heldXlm],
      networkDetails: MAINNET,
      verifiedAssets: [{ code: "USDC", issuer: "GUSD", domain: null }],
      unverifiedAssets: [{ code: "USDT", issuer: "GUSD", domain: null }],
    });

    const { sections } = omitHiddenFromSections(
      {
        ...result,
        sections: { ...result.sections, unverified: result.sections.verified },
      },
      hidden,
    );
    expect(sections.verified).toEqual([]);
    expect(sections.unverified).toEqual([]);
  });

  it("leaves Your tokens and a token marked visible alone", () => {
    const result = buildSwapSections({
      searchTerm: "u",
      balances: [heldXlm],
      networkDetails: MAINNET,
      verifiedAssets: [{ code: "USDC", issuer: "GUSD", domain: null }],
      unverifiedAssets: [],
    });

    const filtered = omitHiddenFromSections(result, { "USDC:GUSD": "visible" });
    expect(filtered.sections.verified.map((r) => r.code)).toEqual(["USDC"]);
    expect(filtered.sections.yourTokens).toBe(result.sections.yourTokens);
  });

  it("returns the same result when nothing is hidden", () => {
    const result = buildSwapSections({
      searchTerm: "",
      balances: [heldXlm],
      networkDetails: MAINNET,
    });

    expect(omitHiddenFromSections(result, {})).toBe(result);
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
    // USDC is decorated; AQUA (no scan entry) is left untouched — no security
    // badge — to avoid false classification before a result is available.
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
    // A benign scan yields a defined (SAFE) level, not undefined.
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
