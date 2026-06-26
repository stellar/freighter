import { reducer, savePopularTokens, clearAll } from "popup/ducks/cache";
import { NetworkDetails } from "@shared/constants/stellar";

const MAINNET = { network: "PUBLIC" } as NetworkDetails;

const trending = [{ code: "AQUA", issuer: "GBNZ", domain: null, volume7d: 5 }];

describe("cache slice — popular tokens", () => {
  it("stamps popularTokens with updatedAt per network", () => {
    const before = Date.now();
    const state = reducer(
      undefined,
      savePopularTokens({ networkDetails: MAINNET, tokens: trending }),
    );
    expect(state.popularTokens.PUBLIC.tokens).toEqual(trending);
    expect(state.popularTokens.PUBLIC.updatedAt).toBeGreaterThanOrEqual(before);
  });

  it("clearAll resets popularTokens", () => {
    let state = reducer(
      undefined,
      savePopularTokens({ networkDetails: MAINNET, tokens: trending }),
    );
    state = reducer(state, clearAll());
    expect(state.popularTokens).toEqual({});
  });
});
