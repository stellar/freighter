import BigNumber from "bignumber.js";

import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { defaultBlockaidScanAssetResult } from "@shared/helpers/stellar";

import { getBalanceByKey } from "../balance";

const CLASSIC_ISSUER =
  "CBANAM7DMVGXE7C3XPE2RZ7RU5FSVGY7RELHN2B6F5XLGFWX7BQ5D7S5";
const CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const TOKEN_BALANCE_KEY = `DT:${CONTRACT_ID}`;
const CLASSIC_BALANCE_KEY =
  "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const LP_ID =
  "a468d41d8e9b8f3c7209651608b74b7db7ac9952dcae0cdf24871d1d9c7b0088";
const BALANCES = {
  [TOKEN_BALANCE_KEY]: {
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
  },
  [CLASSIC_BALANCE_KEY]: {
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
  [`${LP_ID}:lp`]: {
    liquidityPoolId:
      "a468d41d8e9b8f3c7209651608b74b7db7ac9952dcae0cdf24871d1d9c7b0088",
    total: new BigNumber(10),
    limit: new BigNumber(100),
  },
  native: {
    token: {
      code: "XLM",
    },
    decimals: 7,
  },
};

describe("getBalanceByKey", () => {
  it("should return a valid key for a classic asset", () => {
    const key = getBalanceByKey(
      CLASSIC_ISSUER,
      BALANCES,
      TESTNET_NETWORK_DETAILS,
    );
    expect(key).toEqual(CLASSIC_BALANCE_KEY);
  });
  it("should return a valid key for a token", () => {
    const key = getBalanceByKey(CONTRACT_ID, BALANCES, TESTNET_NETWORK_DETAILS);
    expect(key).toEqual(TOKEN_BALANCE_KEY);
  });
});