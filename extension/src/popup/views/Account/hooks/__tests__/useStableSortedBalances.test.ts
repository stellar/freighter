import { renderHook } from "@testing-library/react";
import BigNumber from "bignumber.js";

import { AssetType } from "@shared/api/types/account-balance";
import { ApiTokenPrices } from "@shared/api/types";

import { useStableSortedBalances } from "../useStableSortedBalances";

const USDC_KEY =
  "USDC:GCK3D3V2XNLLKRFGFFFDEJXA4O2J4X36HET2FE446AV3M4U7DPHO3PEM";
const BTC_KEY =
  "BTC:GBSTRH4QOTWNSVA6E4HFERETX4ZLSR3CIUBLK7AXYII277PFJC4BBYOG";

const usdc: AssetType = {
  token: { code: "USDC", issuer: { key: USDC_KEY.split(":")[1] } },
  total: new BigNumber("100"),
  available: new BigNumber("100"),
} as unknown as AssetType;

const btc: AssetType = {
  token: { code: "BTC", issuer: { key: BTC_KEY.split(":")[1] } },
  total: new BigNumber("1"),
  available: new BigNumber("1"),
} as unknown as AssetType;

const xlm: AssetType = {
  token: { type: "native", code: "XLM" },
  total: new BigNumber("50"),
  available: new BigNumber("50"),
} as unknown as AssetType;

const balances: AssetType[] = [usdc, btc, xlm];

const initialPrices: ApiTokenPrices = {
  [USDC_KEY]: { currentPrice: "1", percentagePriceChange24h: "0" } as any,
  [BTC_KEY]: {
    currentPrice: "100000",
    percentagePriceChange24h: "0",
  } as any,
  native: {
    currentPrice: "0.27633884304166495",
    percentagePriceChange24h: "0",
  } as any,
};

// Prices that, if applied freshly, would re-order the list.
const flippedPrices: ApiTokenPrices = {
  [USDC_KEY]: {
    currentPrice: "10000",
    percentagePriceChange24h: "0",
  } as any,
  [BTC_KEY]: { currentPrice: "1", percentagePriceChange24h: "0" } as any,
  native: { currentPrice: "20", percentagePriceChange24h: "0" } as any,
};

const codesOf = (list: AssetType[]) =>
  list.map((b) => ("token" in b ? (b as any).token.code : "?"));

describe("useStableSortedBalances", () => {
  it("returns balances sorted by descending USD value on first render", () => {
    const { result } = renderHook(() =>
      useStableSortedBalances(balances, initialPrices),
    );
    // BTC: $100,000; USDC: $100; XLM: ~$13.81
    expect(codesOf(result.current)).toEqual(["BTC", "USDC", "XLM"]);
  });

  it("preserves the initial order when prices change but the asset set does not", () => {
    const { result, rerender } = renderHook(
      ({ p }: { p: ApiTokenPrices }) =>
        useStableSortedBalances(balances, p),
      { initialProps: { p: initialPrices } },
    );
    expect(codesOf(result.current)).toEqual(["BTC", "USDC", "XLM"]);

    // Prices update mid-view (e.g. polling refresh). The hook MUST keep
    // the captured display order so rows do not jump around.
    rerender({ p: flippedPrices });
    expect(codesOf(result.current)).toEqual(["BTC", "USDC", "XLM"]);
  });

  it("re-sorts when the set of held assets changes (asset added)", () => {
    const { result, rerender } = renderHook(
      ({ b, p }: { b: AssetType[]; p: ApiTokenPrices }) =>
        useStableSortedBalances(b, p),
      { initialProps: { b: [usdc, xlm], p: initialPrices } },
    );
    // USDC ($100) > XLM ($13.81)
    expect(codesOf(result.current)).toEqual(["USDC", "XLM"]);

    // User adds BTC. The asset set changed, so a fresh sort is computed —
    // BTC ($100,000) jumps to the top.
    rerender({ b: [usdc, xlm, btc], p: initialPrices });
    expect(codesOf(result.current)).toEqual(["BTC", "USDC", "XLM"]);
  });

  it("re-sorts when an asset is removed", () => {
    const { result, rerender } = renderHook(
      ({ b, p }: { b: AssetType[]; p: ApiTokenPrices }) =>
        useStableSortedBalances(b, p),
      { initialProps: { b: balances, p: initialPrices } },
    );
    expect(codesOf(result.current)).toEqual(["BTC", "USDC", "XLM"]);

    rerender({ b: [usdc, xlm], p: initialPrices });
    expect(codesOf(result.current)).toEqual(["USDC", "XLM"]);
  });

  it("flows updated `total` values through while preserving order", () => {
    const { result, rerender } = renderHook(
      ({ b, p }: { b: AssetType[]; p: ApiTokenPrices }) =>
        useStableSortedBalances(b, p),
      { initialProps: { b: balances, p: initialPrices } },
    );
    expect(codesOf(result.current)).toEqual(["BTC", "USDC", "XLM"]);

    // Same asset set, but USDC's `total` has changed (a new payment).
    const updatedUsdc = {
      ...(usdc as any),
      total: new BigNumber("999"),
      available: new BigNumber("999"),
    } as AssetType;
    rerender({ b: [updatedUsdc, btc, xlm], p: initialPrices });

    expect(codesOf(result.current)).toEqual(["BTC", "USDC", "XLM"]);
    const usdcEntry = result.current.find(
      (b) => "token" in b && (b as any).token.code === "USDC",
    ) as any;
    expect(usdcEntry.total.toString()).toBe("999");
  });

  it("returns an empty list and resets the snapshot when balances are empty", () => {
    const { result, rerender } = renderHook(
      ({ b }: { b: AssetType[] }) =>
        useStableSortedBalances(b, initialPrices),
      { initialProps: { b: balances } },
    );
    expect(result.current).toHaveLength(3);

    rerender({ b: [] });
    expect(result.current).toEqual([]);

    // Re-introducing balances must compute a fresh sort, not reuse the
    // stale snapshot.
    rerender({ b: [usdc, xlm] });
    expect(codesOf(result.current)).toEqual(["USDC", "XLM"]);
  });

  it("returns the input order untouched when no prices are available", () => {
    const { result } = renderHook(() =>
      useStableSortedBalances(balances, undefined),
    );
    expect(codesOf(result.current)).toEqual(["USDC", "BTC", "XLM"]);
  });
});
