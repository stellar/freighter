import {
  reducer,
  savePopularTokens,
  saveAssetScanResults,
  clearAll,
} from "popup/ducks/cache";
import { NetworkDetails } from "@shared/constants/stellar";

const MAINNET = { network: "PUBLIC" } as NetworkDetails;

const trending = [{ code: "AQUA", issuer: "GBNZ", domain: null, volume7d: 5 }];

describe("cache slice — popular tokens + scan results", () => {
  it("stamps popularTokens with updatedAt per network", () => {
    const before = Date.now();
    const state = reducer(
      undefined,
      savePopularTokens({ networkDetails: MAINNET, tokens: trending }),
    );
    expect(state.popularTokens.PUBLIC.tokens).toEqual(trending);
    expect(state.popularTokens.PUBLIC.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("stamps assetScanResults with updatedAt per network", () => {
    const results = { "AQUA-GBNZ": { result_type: "Benign" } } as any;
    const state = reducer(
      undefined,
      saveAssetScanResults({ networkDetails: MAINNET, results }),
    );
    expect(state.assetScanResults.PUBLIC.results["AQUA-GBNZ"]).toEqual({
      result_type: "Benign",
    });
    expect(state.assetScanResults.PUBLIC.updatedAt).toBeGreaterThan(0);
  });

  it("merges new scan results into the existing per-network map", () => {
    let state = reducer(
      undefined,
      saveAssetScanResults({
        networkDetails: MAINNET,
        results: { "A-G": { result_type: "Benign" } } as any,
      }),
    );
    state = reducer(
      state,
      saveAssetScanResults({
        networkDetails: MAINNET,
        results: { "B-G": { result_type: "Malicious" } } as any,
      }),
    );
    expect(Object.keys(state.assetScanResults.PUBLIC.results).sort()).toEqual([
      "A-G",
      "B-G",
    ]);
  });

  it("clearAll resets popularTokens and assetScanResults", () => {
    let state = reducer(
      undefined,
      savePopularTokens({ networkDetails: MAINNET, tokens: trending }),
    );
    state = reducer(state, clearAll());
    expect(state.popularTokens).toEqual({});
    expect(state.assetScanResults).toEqual({});
  });
});
