import * as ApiInternal from "@shared/api/internal";
import { ApiTokenPrices } from "@shared/api/types";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { startConfirmationPriceSnapshot } from "./confirmationPriceSnapshot";

const flushMicrotasks = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("startConfirmationPriceSnapshot", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses the freshly fetched prices once the fetch has settled (confirmation_fetch)", async () => {
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockResolvedValue({ native: { currentPrice: "0.5" } });

    const handle = startConfirmationPriceSnapshot({
      canonicalIds: ["native"],
      networkDetails: TESTNET_NETWORK_DETAILS,
      useV2: true,
      cachedDisplayPrices: { native: { currentPrice: "0.1" } },
    });

    await flushMicrotasks();

    expect(handle.resolve()).toEqual({
      pricesById: { native: { currentPrice: "0.5" } },
      freshness: "confirmation_fetch",
      source: "token_prices_v2",
    });
  });

  it("falls back to the cached display prices when the fetch hasn't settled yet (cached_display, TR-11)", () => {
    // Never resolves within this test — resolve() is called before any await.
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockImplementation(() => new Promise(() => {}));

    const handle = startConfirmationPriceSnapshot({
      canonicalIds: ["native"],
      networkDetails: TESTNET_NETWORK_DETAILS,
      useV2: false,
      cachedDisplayPrices: { native: { currentPrice: "0.1" } },
    });

    expect(handle.resolve()).toEqual({
      pricesById: { native: { currentPrice: "0.1" } },
      freshness: "cached_display",
      source: "token_prices_v1",
    });
  });

  it("degrades to a null snapshot (not a throw) when the fetch rejects", async () => {
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockRejectedValue(new Error("network down"));

    const handle = startConfirmationPriceSnapshot({
      canonicalIds: ["native"],
      networkDetails: TESTNET_NETWORK_DETAILS,
      useV2: true,
      cachedDisplayPrices: null,
    });

    await flushMicrotasks();

    expect(handle.resolve()).toEqual({
      pricesById: null,
      freshness: "confirmation_fetch",
      source: "token_prices_v2",
    });
  });

  it("never consults a late-arriving result after resolve() already ran (TR-13)", async () => {
    let resolveFetch!: (value: ApiTokenPrices) => void;
    jest.spyOn(ApiInternal, "getTokenPrices").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const handle = startConfirmationPriceSnapshot({
      canonicalIds: ["native"],
      networkDetails: TESTNET_NETWORK_DETAILS,
      useV2: true,
      cachedDisplayPrices: { native: { currentPrice: "0.2" } },
    });

    // Not settled yet — this is the snapshot the terminal event uses.
    const frozen = handle.resolve();
    expect(frozen.freshness).toBe("cached_display");

    // The fetch resolves only after the snapshot was already frozen.
    resolveFetch({ native: { currentPrice: "999" } });
    await flushMicrotasks();

    // Calling resolve() again would now see it as settled — proving the
    // *first* frozen snapshot (already returned above) never changes.
    expect(frozen).toEqual({
      pricesById: { native: { currentPrice: "0.2" } },
      freshness: "cached_display",
      source: "token_prices_v2",
    });
  });
});
