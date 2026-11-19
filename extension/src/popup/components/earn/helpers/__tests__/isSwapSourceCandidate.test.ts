import BigNumber from "bignumber.js";

import { AssetType } from "@shared/api/types/account-balance";
import { isSwapSourceCandidate } from "../isSwapSourceCandidate";

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC = `USDC:${USDC_ISSUER}`;

const xlm = (total: string) =>
  ({
    token: { type: "native", code: "XLM" },
    total: new BigNumber(total),
  }) as unknown as AssetType;
const usdc = (total: string) =>
  ({
    token: {
      type: "credit_alphanum4",
      code: "USDC",
      issuer: { key: USDC_ISSUER },
    },
    total: new BigNumber(total),
  }) as unknown as AssetType;
const contractToken = {
  token: { code: "TKN", issuer: { key: "CABC" } },
  contractId: "CABC",
  total: new BigNumber("10"),
} as unknown as AssetType;

describe("isSwapSourceCandidate", () => {
  it("takes XLM and classic tokens with something to sell", () => {
    expect(isSwapSourceCandidate(xlm("5"), USDC)).toBe(true);
    expect(isSwapSourceCandidate(usdc("5"), "native")).toBe(true);
  });

  it("never takes the target itself", () => {
    expect(isSwapSourceCandidate(usdc("5"), USDC)).toBe(false);
    expect(isSwapSourceCandidate(xlm("5"), "native")).toBe(false);
  });

  it("skips empty balances and contract tokens, which Swap can't sell", () => {
    expect(isSwapSourceCandidate(usdc("0"), "native")).toBe(false);
    expect(isSwapSourceCandidate(contractToken, USDC)).toBe(false);
  });
});
