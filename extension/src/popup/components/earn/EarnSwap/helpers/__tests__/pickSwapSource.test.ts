import BigNumber from "bignumber.js";

import { AssetType } from "@shared/api/types/account-balance";
import { ApiTokenPrices } from "@shared/api/types";

import { pickSwapSource } from "../pickSwapSource";

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const EURC_ISSUER = "GDHU6WRG4IEQXM5NZ4BMPKOXHW76MZM4Y2IEMFDVXBSDP6SJY4ITNPP2";
const ARST_ISSUER = "GCYE7C77EB5AWAA25R5XMWNI2EDOKTTFTTPZKM2SR5DI4B4WFD52DARS";
const USDC = `USDC:${USDC_ISSUER}`;
const EURC = `EURC:${EURC_ISSUER}`;
const ARST = `ARST:${ARST_ISSUER}`;

const native = (total: string): AssetType =>
  ({
    token: { code: "XLM", type: "native" },
    total: new BigNumber(total),
  }) as unknown as AssetType;

const classic = (code: string, issuer: string, total: string): AssetType =>
  ({
    token: { code, issuer: { key: issuer } },
    total: new BigNumber(total),
  }) as unknown as AssetType;

const prices = (map: Record<string, string>): ApiTokenPrices =>
  Object.fromEntries(
    Object.entries(map).map(([key, currentPrice]) => [
      key,
      { currentPrice, percentagePriceChange24h: null },
    ]),
  ) as unknown as ApiTokenPrices;

describe("pickSwapSource", () => {
  const balances = [
    native("1691.69"),
    classic("USDC", USDC_ISSUER, "550"),
    classic("ARST", ARST_ISSUER, "50000"),
  ];

  it("starts from the most valuable priced balance", () => {
    expect(
      pickSwapSource({
        balances,
        prices: prices({
          native: "0.266",
          [USDC]: "1",
          [ARST]: "0.0008",
        }),
        destinationCanonical: EURC,
      }),
    ).toBe(USDC);
  });

  it("ignores a balance with no price", () => {
    // ARST holds the most units, but without a price it has no value to rank.
    expect(
      pickSwapSource({
        balances,
        prices: prices({ native: "0.266" }),
        destinationCanonical: EURC,
      }),
    ).toBe("native");
  });

  it("falls back to XLM when nothing is priced", () => {
    expect(
      pickSwapSource({ balances, prices: {}, destinationCanonical: EURC }),
    ).toBe("native");
  });

  it("never starts from the token being swapped into, or an empty one", () => {
    expect(
      pickSwapSource({
        balances: [
          native("0"),
          classic("USDC", USDC_ISSUER, "550"),
          classic("EURC", EURC_ISSUER, "0"),
        ],
        prices: prices({ [USDC]: "1" }),
        destinationCanonical: USDC,
      }),
    ).toBe("native");
  });
});
