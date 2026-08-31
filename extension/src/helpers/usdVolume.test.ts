import BigNumber from "bignumber.js";
import { Asset, Keypair, Networks } from "stellar-sdk";

import { BalanceMap } from "@shared/api/types/backend-api";
import { ErrorMessage } from "@shared/api/types";
import {
  AssetKind,
  classifyAssetIdentity,
  computeExecutionSlippagePct,
  computeUsdSlippagePct,
  deriveLegUsd,
  FailureCategory,
  getFailureCategory,
  LegUsdStatus,
  roundHalfUp2dp,
} from "./usdVolume";

describe("roundHalfUp2dp", () => {
  it("rounds half up at the 2dp boundary", () => {
    expect(roundHalfUp2dp("1.005")).toBe(1.01);
    expect(roundHalfUp2dp("1.004")).toBe(1.0);
    expect(roundHalfUp2dp(1.115)).toBe(1.12);
  });

  it("never floors like the extension's existing roundUsdValue", () => {
    // roundUsdValue would report 0.00 here (Math.floor bias); half-up must not.
    expect(roundHalfUp2dp("0.009")).toBe(0.01);
  });

  it("handles negative values (slippage can be negative)", () => {
    expect(roundHalfUp2dp("-12.345")).toBe(-12.35);
  });
});

describe("deriveLegUsd", () => {
  it("is no_price when no price is held for the asset", () => {
    expect(deriveLegUsd("10", undefined)).toEqual({
      status: LegUsdStatus.NoPrice,
    });
    expect(deriveLegUsd("10", null as unknown as undefined)).toEqual({
      status: LegUsdStatus.NoPrice,
    });
  });

  it("is ok and rounds half-up when a price is held", () => {
    const result = deriveLegUsd("10.5", "1.999");
    if (result.status !== LegUsdStatus.Ok) {
      throw new Error(`expected ok, got ${result.status}`);
    }
    expect(result.value).toBe(20.99); // 10.5 * 1.999 = 20.9895 -> half-up -> 20.99
    expect(result.rate).toBe(1.999);
    expect(result.unrounded.toString()).toBe("20.9895");
  });

  it("never emits 0 for a missing price — that's no_price, not a real zero", () => {
    const result = deriveLegUsd("0", undefined);
    expect(result.status).toBe(LegUsdStatus.NoPrice);
    expect("value" in result).toBe(false);
  });

  it("emits a real 0.00 for a genuine zero-value transfer when priced", () => {
    const result = deriveLegUsd("0", "1.5");
    if (result.status !== LegUsdStatus.Ok) {
      throw new Error(`expected ok, got ${result.status}`);
    }
    expect(result.value).toBe(0);
  });

  it("is error when the derivation produces a non-finite result", () => {
    expect(deriveLegUsd("not-a-number", "1.5").status).toBe(LegUsdStatus.Error);
    expect(deriveLegUsd("10", "not-a-number").status).toBe(LegUsdStatus.Error);
  });
});

describe("computeUsdSlippagePct", () => {
  it("is negative when the user received less USD value than they gave up", () => {
    const pct = computeUsdSlippagePct(
      new BigNumber("100"),
      new BigNumber("99"),
    );
    expect(pct).toBe(-1);
  });

  it("rounds only the final percentage, from unrounded inputs", () => {
    const pct = computeUsdSlippagePct(
      new BigNumber("33.333"),
      new BigNumber("33.1"),
    );
    // (33.1 - 33.333) / 33.333 * 100 = -0.699009...
    expect(pct).toBe(-0.7);
  });

  it("is undefined when the source value is zero (no ratio)", () => {
    expect(
      computeUsdSlippagePct(new BigNumber(0), new BigNumber("5")),
    ).toBeUndefined();
  });
});

describe("computeExecutionSlippagePct", () => {
  it("computes settled vs quoted as a percentage", () => {
    expect(computeExecutionSlippagePct("100", "99.5")).toBe(-0.5);
  });

  it("is undefined when no quote amount was captured", () => {
    expect(computeExecutionSlippagePct(undefined, "99.5")).toBeUndefined();
  });

  it("is undefined when the quoted amount is zero", () => {
    expect(computeExecutionSlippagePct("0", "99.5")).toBeUndefined();
  });
});

describe("classifyAssetIdentity", () => {
  const network = Networks.TESTNET;

  it("classifies native XLM with no issuer", () => {
    expect(classifyAssetIdentity("XLM", undefined, network)).toEqual({
      code: "XLM",
      type: AssetKind.Native,
    });
  });

  it("classifies a plain classic asset (G-issuer)", () => {
    const issuer = Keypair.random().publicKey();
    expect(classifyAssetIdentity("USDC", issuer, network)).toEqual({
      code: "USDC",
      issuer,
      type: AssetKind.Classic,
    });
  });

  it("collapses XLM moved via the native SAC to native, not soroban", () => {
    const nativeSac = Asset.native().contractId(network);
    expect(classifyAssetIdentity("XLM", nativeSac, network)).toEqual({
      code: "XLM",
      type: AssetKind.Native,
    });
  });

  const makeBalanceMap = (code: string, issuer: string): BalanceMap =>
    ({
      native: { token: { type: "native", code: "XLM" } },
      [`${code}:${issuer}`]: {
        token: { type: "credit_alphanum4", code, issuer: { key: issuer } },
        total: new BigNumber(0),
        available: new BigNumber(0),
      },
    }) as unknown as BalanceMap;

  it("collapses a classic asset moved via its SAC back to classic, by derivation against a held balance", () => {
    const issuer = Keypair.random().publicKey();
    const sacAddress = new Asset("USDC", issuer).contractId(network);
    const balances = makeBalanceMap("USDC", issuer);

    expect(
      classifyAssetIdentity("USDC", sacAddress, network, balances),
    ).toEqual({ code: "USDC", issuer, type: AssetKind.Classic });
  });

  it("reports a contract with no matching classic balance as Soroban-native", () => {
    const unrelatedIssuer = Keypair.random().publicKey();
    const sacAddress = new Asset("SHRIMP", unrelatedIssuer).contractId(network);

    // No balances at all, so there's nothing to collapse against.
    expect(
      classifyAssetIdentity("SHRIMP", sacAddress, network, {} as BalanceMap),
    ).toEqual({
      code: "SHRIMP",
      issuer: sacAddress,
      type: AssetKind.Soroban,
    });
  });

  it("skips a liquidity-pool entry (no token field) instead of throwing", () => {
    const issuer = Keypair.random().publicKey();
    const sacAddress = new Asset("USDC", issuer).contractId(network);
    // The LP entry is iterated before the real match, so a naive
    // `"issuer" in balance.token` throws on it (no `token` field at all)
    // before ever reaching the matching classic balance below.
    const balances = {
      native: { token: { type: "native", code: "XLM" } },
      "POOLID:lp": {
        liquidityPoolId: "POOLID",
        total: new BigNumber(0),
        available: new BigNumber(0),
      },
      [`USDC:${issuer}`]: {
        token: {
          type: "credit_alphanum4",
          code: "USDC",
          issuer: { key: issuer },
        },
        total: new BigNumber(0),
        available: new BigNumber(0),
      },
    } as unknown as BalanceMap;

    expect(
      classifyAssetIdentity("USDC", sacAddress, network, balances),
    ).toEqual({ code: "USDC", issuer, type: AssetKind.Classic });
  });

  it("does not collapse a genuine Soroban/SEP-41 balance whose token also carries an issuer", () => {
    // A locally-injected non-classic token is stored with the contract ID in
    // both `contractId` and `token.issuer.key` (see injectLocalTokenBalances)
    // - it directly contractId-matches, but must not be misread as classic
    // just because its token also has an "issuer" field.
    const contractId = new Asset(
      "SHRIMP",
      Keypair.random().publicKey(),
    ).contractId(network);
    const balances = {
      native: { token: { type: "native", code: "XLM" } },
      [`SHRIMP:${contractId}`]: {
        token: { code: "SHRIMP", issuer: { key: contractId } },
        contractId,
        total: new BigNumber(0),
        available: new BigNumber(0),
      },
    } as unknown as BalanceMap;

    expect(
      classifyAssetIdentity("SHRIMP", contractId, network, balances),
    ).toEqual({
      code: "SHRIMP",
      issuer: contractId,
      type: AssetKind.Soroban,
    });
  });

  it("does not collapse against a held balance with a different code", () => {
    const heldIssuer = Keypair.random().publicKey();
    const otherIssuer = Keypair.random().publicKey();
    const sacAddress = new Asset("EUROC", otherIssuer).contractId(network);
    const balances = makeBalanceMap("USDC", heldIssuer);

    expect(
      classifyAssetIdentity("EUROC", sacAddress, network, balances),
    ).toEqual({ code: "EUROC", issuer: sacAddress, type: AssetKind.Soroban });
  });
});

describe("getFailureCategory", () => {
  const horizonError = (
    operations: string[],
    transaction = "tx_failed",
  ): ErrorMessage =>
    ({
      errorMessage: "failed",
      response: {
        status: 400,
        extras: { result_codes: { transaction, operations } },
      },
    }) as unknown as ErrorMessage;

  it("maps slippage-related op codes (also covers quote-expired-at-submit)", () => {
    expect(
      getFailureCategory(
        horizonError(["op_under_dest_min"]),
        "op_under_dest_min",
      ),
    ).toBe(FailureCategory.Slippage);
    expect(
      getFailureCategory(
        horizonError(["op_too_few_offers"]),
        "op_too_few_offers",
      ),
    ).toBe(FailureCategory.Slippage);
  });

  it("maps balance, trustline, destination, sequence, auth, and fee codes", () => {
    expect(
      getFailureCategory(horizonError(["op_underfunded"]), "op_underfunded"),
    ).toBe(FailureCategory.Balance);
    expect(
      getFailureCategory(horizonError(["op_no_trust"]), "op_no_trust"),
    ).toBe(FailureCategory.Trustline);
    expect(
      getFailureCategory(horizonError(["op_src_no_trust"]), "op_src_no_trust"),
    ).toBe(FailureCategory.Trustline);
    expect(
      getFailureCategory(
        horizonError(["op_src_not_authorized"]),
        "op_src_not_authorized",
      ),
    ).toBe(FailureCategory.Trustline);
    expect(
      getFailureCategory(
        horizonError(["op_no_destination"]),
        "op_no_destination",
      ),
    ).toBe(FailureCategory.Destination);
    expect(
      getFailureCategory(horizonError([], "tx_bad_seq"), "tx_bad_seq"),
    ).toBe(FailureCategory.Sequence);
    expect(
      getFailureCategory(horizonError([], "tx_bad_auth"), "tx_bad_auth"),
    ).toBe(FailureCategory.Auth);
    expect(
      getFailureCategory(
        horizonError([], "tx_insufficient_fee"),
        "tx_insufficient_fee",
      ),
    ).toBe(FailureCategory.Fee);
  });

  it("maps an unmapped Horizon code to protocol_other", () => {
    expect(getFailureCategory(horizonError([], "tx_failed"), "tx_failed")).toBe(
      FailureCategory.ProtocolOther,
    );
  });

  it("maps the 'unknown' sentinel to unknown when Horizon did answer", () => {
    expect(getFailureCategory(horizonError([]), "unknown")).toBe(
      FailureCategory.Unknown,
    );
  });

  it("maps to transport when there was no protocol answer at all", () => {
    const networkError = {
      errorMessage: "Failed to fetch",
      response: new TypeError("Failed to fetch"),
    } as unknown as ErrorMessage;
    expect(getFailureCategory(networkError, "unknown")).toBe(
      FailureCategory.Transport,
    );
    expect(getFailureCategory(undefined, "unknown")).toBe(
      FailureCategory.Transport,
    );
  });

  it("maps an answer that carries no verdict — 5xx/408/429/403 without result_codes — to transport, not unknown", () => {
    const statusOnlyError = (status: number): ErrorMessage =>
      ({
        errorMessage: "failed",
        response: { status, title: "problem" },
      }) as unknown as ErrorMessage;
    expect(getFailureCategory(statusOnlyError(503), "unknown")).toBe(
      FailureCategory.Transport,
    );
    expect(getFailureCategory(statusOnlyError(504), "unknown")).toBe(
      FailureCategory.Transport,
    );
    expect(getFailureCategory(statusOnlyError(408), "unknown")).toBe(
      FailureCategory.Transport,
    );
    expect(getFailureCategory(statusOnlyError(429), "unknown")).toBe(
      FailureCategory.Transport,
    );
    expect(getFailureCategory(statusOnlyError(403), "unknown")).toBe(
      FailureCategory.Transport,
    );
    // A definitive 4xx rejection without result codes stays unknown.
    expect(getFailureCategory(statusOnlyError(400), "unknown")).toBe(
      FailureCategory.Unknown,
    );
  });
});
