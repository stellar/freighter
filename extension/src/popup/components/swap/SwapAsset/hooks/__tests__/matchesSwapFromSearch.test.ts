import { Networks } from "stellar-sdk";

import {
  ClassicAsset,
  NativeAsset,
  SorobanAsset,
} from "@shared/api/types/account-balance";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { getAssetSacAddress } from "@shared/helpers/soroban/token";
import { getNativeContractDetails } from "popup/helpers/searchAsset";

import { matchesSwapFromSearch } from "../matchesSwapFromSearch";

const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
// An unrelated, valid Soroban contract id (neither the USDC SAC nor native).
const OTHER_CONTRACT =
  "CAZXEHTSQATVQVWDPWWDTFSY6CM764JD4MZ6HUVPO3QKS64QEEP4KJH7";

const usdcBalance = {
  token: {
    type: "credit_alphanum4",
    code: "USDC",
    issuer: { key: USDC_ISSUER },
  },
} as unknown as ClassicAsset;

const nativeBalance = {
  token: { type: "native", code: "XLM" },
} as unknown as NativeAsset;

const sorobanBalance = {
  token: { code: "ABC", issuer: { key: USDC_ISSUER } },
  contractId: OTHER_CONTRACT,
} as unknown as SorobanAsset;

const match = (balance: any, searchTerm: string) =>
  matchesSwapFromSearch({
    balance,
    searchTerm,
    networkDetails: TESTNET_NETWORK_DETAILS,
  });

describe("matchesSwapFromSearch", () => {
  it("matches by token code (case-insensitive, partial)", () => {
    expect(match(usdcBalance, "usd")).toBe(true);
    expect(match(usdcBalance, "USDC")).toBe(true);
  });

  it("matches a classic asset by its issuer", () => {
    expect(match(usdcBalance, USDC_ISSUER)).toBe(true);
  });

  it("matches a Soroban balance by its contractId", () => {
    expect(match(sorobanBalance, OTHER_CONTRACT)).toBe(true);
  });

  it("resolves a pasted SAC to the held classic token it wraps", () => {
    const usdcSac = getAssetSacAddress(`USDC:${USDC_ISSUER}`, Networks.TESTNET);
    expect(match(usdcBalance, usdcSac)).toBe(true);
  });

  it("resolves the native SAC to the held XLM balance", () => {
    const xlmSac = getNativeContractDetails(TESTNET_NETWORK_DETAILS).contract;
    expect(match(nativeBalance, xlmSac)).toBe(true);
  });

  it("does not match an unrelated contract id to a held token", () => {
    expect(match(usdcBalance, OTHER_CONTRACT)).toBe(false);
  });

  it("does not match an unrelated search term", () => {
    expect(match(usdcBalance, "zzz")).toBe(false);
  });
});
