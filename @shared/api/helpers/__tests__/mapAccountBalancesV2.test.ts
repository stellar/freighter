import BigNumber from "bignumber.js";

import { mapAccountBalancesV2 } from "../mapAccountBalancesV2";
import {
  V2AccountBalances,
  V2ClassicBalance,
  V2LiquidityPoolBalance,
  V2NativeBalance,
  V2SacBalance,
  V2Sep41Balance,
} from "../../types/backend-api";

// Fixtures mirror the live wire format (snake_case; server-computed
// `available` — balance minus reserves/liabilities for native/classic, equal
// to balance for contract tokens and pool shares).
const nativeBalance: V2NativeBalance = {
  token_type: "NATIVE",
  token_id: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
  balance: "100",
  available: "88.5",
  minimum_balance: "1.5",
  buying_liabilities: "0",
  selling_liabilities: "10",
};

const classicBalance: V2ClassicBalance = {
  token_type: "CLASSIC",
  token_id: "CUSDC",
  balance: "50",
  available: "45",
  code: "USDC",
  issuer: "GISSUER",
  type: "credit_alphanum4",
  limit: "1000",
  buying_liabilities: "0",
  selling_liabilities: "5",
  is_authorized: true,
  is_authorized_to_maintain_liabilities: true,
};

const sacBalance: V2SacBalance = {
  token_type: "SAC",
  token_id: "CSAC123",
  balance: "42.5",
  available: "42.5",
  code: "SACT",
  issuer: "GSACISSUER",
  decimals: 7,
  is_authorized: true,
  is_clawback_enabled: false,
};

const sep41Balance: V2Sep41Balance = {
  token_type: "SEP41",
  token_id: "CTOKEN456",
  balance: "5000000000",
  available: "5000000000",
  symbol: "TKN",
  name: "Token Name",
  decimals: 7,
};

const lpBalance: V2LiquidityPoolBalance = {
  token_type: "LIQUIDITY_POOL",
  token_id: "LPTOKENID",
  balance: "12.75",
  available: "12.75",
  liquidity_pool_id: "abc123poolid",
  reserves: [
    { asset: "native", amount: "10" },
    { asset: "USDC:GISSUER", amount: "25" },
  ],
};

const makeAccount = (
  balances: V2AccountBalances["balances"],
  overrides: Partial<V2AccountBalances> = {},
): V2AccountBalances => ({
  address: "GACCOUNT",
  is_funded: balances.length > 0,
  subentry_count: 0,
  balances,
  ...overrides,
});

describe("mapAccountBalancesV2", () => {
  describe("native", () => {
    it("maps to the `native` key with server-provided available", () => {
      const result = mapAccountBalancesV2(makeAccount([nativeBalance]));
      const native = result.balances!.native;

      expect(native).toBeDefined();
      expect(native.token).toEqual({ type: "native", code: "XLM" });
      expect((native.total as BigNumber).toString()).toBe("100");
      // available passes through from the server: 100 - 10 - 1.5
      expect((native.available as BigNumber).toString()).toBe("88.5");
    });

    it("folds selling liabilities into minimumBalance (v1 parity)", () => {
      // v2's minimum_balance excludes liabilities; the v1 contract includes
      // them, and getAvailableBalance computes spendable XLM as
      // total − minimumBalance. 1.5 reserve + 10 selling liabilities = 11.5,
      // so total − minimumBalance === the server's own `available`.
      const result = mapAccountBalancesV2(makeAccount([nativeBalance]));
      const native = result.balances!.native as any;

      expect(native.minimumBalance).toBe("11.5");
      expect(
        (native.total as BigNumber).minus(native.minimumBalance).toString(),
      ).toBe((native.available as BigNumber).toString());
    });

    it("leaves minimumBalance at the base reserve when there are no selling liabilities", () => {
      const result = mapAccountBalancesV2(
        makeAccount([{ ...nativeBalance, selling_liabilities: "0" }]),
      );
      expect((result.balances!.native as any).minimumBalance).toBe("1.5");
    });
  });

  describe("classic", () => {
    it("maps to the `code:issuer` key with issuer nested under token", () => {
      const result = mapAccountBalancesV2(makeAccount([classicBalance]));
      const entry = result.balances!["USDC:GISSUER"] as any;

      expect(entry).toBeDefined();
      expect(entry.token).toEqual({
        type: "credit_alphanum4",
        code: "USDC",
        issuer: { key: "GISSUER" },
      });
      expect(entry.total.toString()).toBe("50");
      // available passes through from the server: 50 - 5
      expect(entry.available.toString()).toBe("45");
      expect(entry.contractId).toBeUndefined();
    });

    it("uses credit_alphanum12 for codes longer than 4 chars", () => {
      const result = mapAccountBalancesV2(
        makeAccount([{ ...classicBalance, code: "LONGCODE" }]),
      );
      const entry = result.balances!["LONGCODE:GISSUER"] as any;
      expect(entry.token.type).toBe("credit_alphanum12");
    });
  });

  describe("SAC", () => {
    it("maps to a classic-shaped `code:issuer` entry (no double-scaling)", () => {
      const result = mapAccountBalancesV2(makeAccount([sacBalance]));
      const entry = result.balances!["SACT:GSACISSUER"] as any;

      expect(entry).toBeDefined();
      expect(entry.token).toEqual({
        type: "credit_alphanum4",
        code: "SACT",
        issuer: { key: "GSACISSUER" },
      });
      // pre-formatted decimal passes through untouched
      expect(entry.total.toString()).toBe("42.5");
      expect(entry.available.toString()).toBe("42.5");
      // NOT treated as a Soroban balance (no contractId), so display won't
      // re-scale it by `decimals`.
      expect(entry.contractId).toBeUndefined();
      expect(entry.decimals).toBeUndefined();
    });
  });

  describe("SEP41", () => {
    it("maps to a Soroban-shaped `symbol:contractId` entry with raw total + decimals", () => {
      const result = mapAccountBalancesV2(makeAccount([sep41Balance]));
      const entry = result.balances!["TKN:CTOKEN456"] as any;

      expect(entry).toBeDefined();
      expect(entry.contractId).toBe("CTOKEN456");
      expect(entry.token).toEqual({
        code: "TKN",
        issuer: { key: "CTOKEN456" },
      });
      expect(entry.symbol).toBe("TKN");
      expect(entry.name).toBe("Token Name");
      expect(entry.decimals).toBe(7);
      // raw i128 preserved for display-time scaling
      expect(entry.total.toString()).toBe("5000000000");
    });
  });

  describe("liquidity pool", () => {
    it("maps to a `<poolId>:lp` entry with reserves and share total", () => {
      const result = mapAccountBalancesV2(makeAccount([lpBalance]));
      const entry = result.balances!["abc123poolid:lp"] as any;

      expect(entry).toBeDefined();
      expect(entry.liquidityPoolId).toBe("abc123poolid");
      expect(entry.total.toString()).toBe("12.75");
      expect(entry.available.toString()).toBe("12.75");
      expect(entry.reserves).toEqual([
        { asset: "native", amount: "10" },
        { asset: "USDC:GISSUER", amount: "25" },
      ]);
      // LP shares are not an asset — no token identity fields
      expect(entry.contractId).toBeUndefined();
    });
  });

  describe("envelope", () => {
    it("passes is_funded and subentry_count through from the v2 envelope", () => {
      const result = mapAccountBalancesV2(
        makeAccount([nativeBalance, classicBalance], {
          subentry_count: 3,
        }),
      );
      expect(result.isFunded).toBe(true);
      expect(result.subentryCount).toBe(3);
      expect(Object.keys(result.balances!)).toHaveLength(2);
    });

    it("reports an unfunded account (is_funded false, empty balances)", () => {
      const result = mapAccountBalancesV2(
        makeAccount([], { is_funded: false }),
      );
      expect(result.isFunded).toBe(false);
      expect(result.balances).toEqual({});
      expect(result.subentryCount).toBe(0);
    });

    it("handles an undefined account (missing from the fan-out result)", () => {
      const result = mapAccountBalancesV2(undefined);
      expect(result.isFunded).toBe(false);
      expect(result.balances).toEqual({});
      expect(result.subentryCount).toBe(0);
    });

    it("skips unknown token types rather than emitting malformed entries", () => {
      const result = mapAccountBalancesV2(
        makeAccount([
          nativeBalance,
          { ...sep41Balance, token_type: "MYSTERY" as any },
        ]),
      );
      expect(Object.keys(result.balances!)).toEqual(["native"]);
    });
  });
});
