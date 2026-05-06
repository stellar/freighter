import BigNumber from "bignumber.js";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";

import { getBalanceByKey, findAssetBalance, sortBalancesByValue } from "../balance";

const CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const TOKEN_BALANCE_KEY = `DT:${CONTRACT_ID}`;
const CLASSIC_BALANCE_KEY =
  "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const LP_ID =
  "a468d41d8e9b8f3c7209651608b74b7db7ac9952dcae0cdf24871d1d9c7b0088";
const TOKEN_BALANCE = {
  token: {
    code: "DT",
    issuer: {
      key: "CCXVDIGMR6WTXZQX2OEVD6YM6AYCYPXPQ7YYH6OZMRS7U6VD3AVHNGBJ",
    },
  },
  decimals: 7,
  total: new BigNumber("1000000000"),
  available: new BigNumber("1000000000"),
  blockaidData: defaultBlockaidScanAssetResult,
  contractId: CONTRACT_ID,
};

const BALANCES = [
  TOKEN_BALANCE,
  {
    token: {
      code: "USDC",
      issuer: {
        key: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
      },
    },
    total: new BigNumber("100"),
    available: new BigNumber("100"),
    blockaidData: defaultBlockaidScanAssetResult,
  },
  {
    liquidityPoolId:
      "a468d41d8e9b8f3c7209651608b74b7db7ac9952dcae0cdf24871d1d9c7b0088",
    total: new BigNumber(10),
    limit: new BigNumber(100),
  },
];

describe("getBalanceByKey", () => {
  it("should return a valid key for a token", () => {
    const balance = getBalanceByKey(
      CONTRACT_ID,
      BALANCES,
      TESTNET_NETWORK_DETAILS,
    );
    expect(balance).toEqual(TOKEN_BALANCE);
  });
});

describe("findAssetBalance", () => {
  it("should match a classic asset by code and issuer", () => {
    const result = findAssetBalance(BALANCES, {
      code: "USDC",
      issuer: "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM",
    });
    expect(result).toBeDefined();
    expect(result.token.code).toBe("USDC");
  });

  it("should match a Soroban token when issuer is a contract ID", () => {
    const result = findAssetBalance(BALANCES, {
      code: "DT",
      issuer: CONTRACT_ID,
    });
    expect(result).toBeDefined();
    expect(result.contractId).toBe(CONTRACT_ID);
  });

  it("should return undefined when contract ID is not in balances", () => {
    const result = findAssetBalance(BALANCES, {
      code: "NOPE",
      issuer: "CAZXEHTSQATVQVWDPWWDTFSY6CM764JD4MZ6HUVPO3QKS64QEEP4KJH7",
    });
    expect(result).toBeUndefined();
  });

  it("should return undefined for an empty balances array", () => {
    const result = findAssetBalance([], {
      code: "DT",
      issuer: CONTRACT_ID,
    });
    expect(result).toBeUndefined();
  });

  it("should not match a classic asset when issuer does not match", () => {
    const result = findAssetBalance(BALANCES, {
      code: "USDC",
      issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    });
    expect(result).toBeUndefined();
  });
});

describe("sortBalancesByValue", () => {
  const NATIVE = {
    token: { type: "native", code: "XLM" },
    total: new BigNumber("50"),
    available: new BigNumber("50"),
  };
  const USDC_ISSUER = "GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
  const USDC = {
    token: { code: "USDC", issuer: { key: USDC_ISSUER } },
    total: new BigNumber("100"),
    available: new BigNumber("100"),
  };
  const ARS_ISSUER = "GCYE7C77EB5AWAA25R5XMWNI2EDOKTTFTTPZKM2SR5DI4B4WFD52DARS";
  const ARS = {
    token: { code: "ARS", issuer: { key: ARS_ISSUER } },
    total: new BigNumber("100000"),
    available: new BigNumber("100000"),
  };
  const LP = {
    liquidityPoolId:
      "a468d41d8e9b8f3c7209651608b74b7db7ac9952dcae0cdf24871d1d9c7b0088",
    total: new BigNumber("10"),
    limit: new BigNumber("100"),
  };

  const fullPrices = {
    native: { currentPrice: "0.276" },
    [`USDC:${USDC_ISSUER}`]: { currentPrice: "1" },
    [`ARS:${ARS_ISSUER}`]: { currentPrice: "0.001" },
  };

  it("returns input unchanged when prices is null", () => {
    const input = [NATIVE, USDC, LP];
    expect(sortBalancesByValue(input, null)).toEqual(input);
  });

  it("returns input unchanged when prices is undefined", () => {
    const input = [NATIVE, USDC, LP];
    expect(sortBalancesByValue(input, undefined)).toEqual(input);
  });

  it("returns input unchanged when prices is empty", () => {
    const input = [NATIVE, USDC, LP];
    expect(sortBalancesByValue(input, {})).toEqual(input);
  });

  it("orders all priced assets descending by USD value", () => {
    // USD values: USDC = 100 * 1 = 100; XLM = 50 * 0.276 = 13.8; ARS = 100000 * 0.001 = 100
    // ARS and USDC tie at 100 → original order (USDC first) preserved.
    const input = [NATIVE, USDC, ARS];
    const result = sortBalancesByValue(input, fullPrices);
    expect(result).toEqual([USDC, ARS, NATIVE]);
  });

  it("places priced assets before unpriced; unpriced keep original order", () => {
    // USDC and ARS unpriced (no entry); XLM priced.
    const partialPrices = { native: { currentPrice: "0.276" } };
    const input = [USDC, NATIVE, ARS];
    const result = sortBalancesByValue(input, partialPrices);
    expect(result).toEqual([NATIVE, USDC, ARS]);
  });

  it("treats LP shares as unpriced and keeps them after priced assets", () => {
    const input = [NATIVE, LP, USDC];
    const result = sortBalancesByValue(input, fullPrices);
    // USDC=100, XLM=13.8 → USDC, XLM, LP (LP unpriced; appears after priced).
    expect(result).toEqual([USDC, NATIVE, LP]);
  });

  it("keeps a zero currentPrice in the priced group", () => {
    const prices = {
      native: { currentPrice: "0" },
      [`USDC:${USDC_ISSUER}`]: { currentPrice: "1" },
    };
    // ARS unpriced → after priced. NATIVE has zero priced value, USDC has 100.
    const input = [NATIVE, ARS, USDC];
    const result = sortBalancesByValue(input, prices);
    expect(result).toEqual([USDC, NATIVE, ARS]);
  });

  it("treats a malformed currentPrice as unpriced", () => {
    const prices = {
      native: { currentPrice: "not-a-number" },
      [`USDC:${USDC_ISSUER}`]: { currentPrice: "1" },
    };
    const input = [NATIVE, USDC];
    const result = sortBalancesByValue(input, prices);
    expect(result).toEqual([USDC, NATIVE]);
  });

  it("preserves original order when two priced assets have identical USD value", () => {
    // USDC = 100; ARS = 100. Original order: ARS, USDC → ARS stays first.
    const input = [ARS, USDC];
    const result = sortBalancesByValue(input, fullPrices);
    expect(result).toEqual([ARS, USDC]);
  });

  it("does not mutate the input array", () => {
    const input = [NATIVE, USDC, LP];
    const snapshot = [...input];
    sortBalancesByValue(input, fullPrices);
    expect(input).toEqual(snapshot);
  });
});
