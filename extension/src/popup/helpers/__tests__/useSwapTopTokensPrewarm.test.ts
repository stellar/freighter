import {
  MAINNET_NETWORK_DETAILS,
  TESTNET_NETWORK_DETAILS,
} from "@shared/constants/stellar";
import { prewarmTopTokens } from "../useSwapTopTokensPrewarm";
import * as Trending from "popup/helpers/trendingAssets";
import * as Cache from "popup/helpers/swapPopularTokensCache";

const tokens = [
  { code: "AQUA", issuer: "GBNZ", domain: null, volume7d: 5 },
] as any;

describe("prewarmTopTokens", () => {
  afterEach(() => jest.restoreAllMocks());

  it("fetches + persists + caches on mainnet when the disk cache is cold", async () => {
    jest.spyOn(Cache, "getPersistedPopularTokens").mockResolvedValue(null);
    const setSpy = jest
      .spyOn(Cache, "setPersistedPopularTokens")
      .mockResolvedValue();
    const fetchSpy = jest
      .spyOn(Trending, "fetchTrendingAssets")
      .mockResolvedValue(tokens);
    const dispatch = jest.fn();

    await prewarmTopTokens({
      networkDetails: MAINNET_NETWORK_DETAILS,
      dispatch: dispatch as any,
    });

    expect(fetchSpy).toHaveBeenCalled();
    expect(dispatch).toHaveBeenCalled();
    expect(setSpy).toHaveBeenCalledWith(
      MAINNET_NETWORK_DETAILS.network,
      tokens,
    );
  });

  it("does nothing on testnet", async () => {
    const fetchSpy = jest.spyOn(Trending, "fetchTrendingAssets");
    const dispatch = jest.fn();

    await prewarmTopTokens({
      networkDetails: TESTNET_NETWORK_DETAILS,
      dispatch: dispatch as any,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("skips the network when the disk cache is already fresh", async () => {
    jest.spyOn(Cache, "getPersistedPopularTokens").mockResolvedValue(tokens);
    const fetchSpy = jest.spyOn(Trending, "fetchTrendingAssets");
    const dispatch = jest.fn();

    await prewarmTopTokens({
      networkDetails: MAINNET_NETWORK_DETAILS,
      dispatch: dispatch as any,
    });

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("does not persist when the fetch returns nothing", async () => {
    jest.spyOn(Cache, "getPersistedPopularTokens").mockResolvedValue(null);
    const setSpy = jest
      .spyOn(Cache, "setPersistedPopularTokens")
      .mockResolvedValue();
    jest.spyOn(Trending, "fetchTrendingAssets").mockResolvedValue([]);
    const dispatch = jest.fn();

    await prewarmTopTokens({
      networkDetails: MAINNET_NETWORK_DETAILS,
      dispatch: dispatch as any,
    });

    expect(dispatch).not.toHaveBeenCalled();
    expect(setSpy).not.toHaveBeenCalled();
  });

  it("swallows fetch errors (best-effort)", async () => {
    jest.spyOn(Cache, "getPersistedPopularTokens").mockResolvedValue(null);
    jest
      .spyOn(Trending, "fetchTrendingAssets")
      .mockRejectedValue(new Error("network down"));
    const dispatch = jest.fn();

    await expect(
      prewarmTopTokens({
        networkDetails: MAINNET_NETWORK_DETAILS,
        dispatch: dispatch as any,
      }),
    ).resolves.toBeUndefined();
    expect(dispatch).not.toHaveBeenCalled();
  });
});
