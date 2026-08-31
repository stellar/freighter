import * as ApiInternal from "@shared/api/internal";
import { ApiTokenPrices } from "@shared/api/types";
import { TESTNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import {
  PriceFreshness,
  PriceSource,
  startConfirmationPriceSnapshot,
} from "./confirmationPriceSnapshot";

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
      freshness: PriceFreshness.ConfirmationFetch,
      source: PriceSource.TokenPricesV2,
    });
  });

  it("falls back wholesale to the display cache when the fetch only covers some of the requested ids", async () => {
    // A 200 that omits the swap destination (e.g. a non-held token
    // /token-prices has no entry for) - a partial result isn't trusted even
    // for the ids it does cover.
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockResolvedValue({ native: { currentPrice: "0.5" } });

    const handle = startConfirmationPriceSnapshot({
      canonicalIds: ["native", "USDC:ISSUER"],
      networkDetails: TESTNET_NETWORK_DETAILS,
      useV2: true,
      cachedDisplayPrices: { native: { currentPrice: "0.1" } },
    });

    await flushMicrotasks();

    expect(handle.resolve()).toEqual({
      pricesById: { native: { currentPrice: "0.1" } },
      freshness: PriceFreshness.CachedDisplay,
      source: PriceSource.TokenPricesV2,
    });
  });

  it("falls back to the cached display prices when the fetch hasn't settled yet (cached_display)", () => {
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
      freshness: PriceFreshness.CachedDisplay,
      source: PriceSource.TokenPricesV1,
    });
  });

  it("falls back to the cached display prices when the fetch rejects", async () => {
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockRejectedValue(new Error("network down"));

    const handle = startConfirmationPriceSnapshot({
      canonicalIds: ["native"],
      networkDetails: TESTNET_NETWORK_DETAILS,
      useV2: true,
      cachedDisplayPrices: { native: { currentPrice: "0.1" } },
    });

    await flushMicrotasks();

    // A rejected fetch degrades exactly like a still-pending one: coverage
    // takes priority over freshness, and the degradation is visible via
    // `cached_display` rather than reported as unpriced legs.
    expect(handle.resolve()).toEqual({
      pricesById: { native: { currentPrice: "0.1" } },
      freshness: PriceFreshness.CachedDisplay,
      source: PriceSource.TokenPricesV2,
    });
  });

  it("degrades to a null snapshot (not a throw) when the fetch rejects and no display price is cached", async () => {
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
      freshness: PriceFreshness.CachedDisplay,
      source: PriceSource.TokenPricesV2,
    });
  });

  it("aborts a still-pending fetch at resolve() so the request cannot outlive the flow", () => {
    let capturedSignal: AbortSignal | undefined;
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockImplementation((_tokens, _network, _useV2, signal) => {
        capturedSignal = signal;
        return new Promise(() => {});
      });

    const handle = startConfirmationPriceSnapshot({
      canonicalIds: ["native"],
      networkDetails: TESTNET_NETWORK_DETAILS,
      useV2: false,
      cachedDisplayPrices: null,
    });

    expect(capturedSignal?.aborted).toBe(false);
    handle.resolve();
    expect(capturedSignal?.aborted).toBe(true);
  });

  it("cancel() aborts the fetch without producing a snapshot (pre-submission failure)", () => {
    let capturedSignal: AbortSignal | undefined;
    jest
      .spyOn(ApiInternal, "getTokenPrices")
      .mockImplementation((_tokens, _network, _useV2, signal) => {
        capturedSignal = signal;
        return new Promise(() => {});
      });

    const handle = startConfirmationPriceSnapshot({
      canonicalIds: ["native"],
      networkDetails: TESTNET_NETWORK_DETAILS,
      useV2: false,
      cachedDisplayPrices: null,
    });

    handle.cancel();
    expect(capturedSignal?.aborted).toBe(true);
    // Idempotent, and safe to combine with a later resolve().
    handle.cancel();
    expect(handle.resolve().freshness).toBe(PriceFreshness.CachedDisplay);
  });

  it("never consults a late-arriving result after resolve() already ran", async () => {
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
    expect(frozen.freshness).toBe(PriceFreshness.CachedDisplay);

    // The fetch resolves only after the snapshot was already frozen.
    resolveFetch({ native: { currentPrice: "999" } });
    await flushMicrotasks();

    // Calling resolve() again would now see it as settled — proving the
    // *first* frozen snapshot (already returned above) never changes.
    expect(frozen).toEqual({
      pricesById: { native: { currentPrice: "0.2" } },
      freshness: PriceFreshness.CachedDisplay,
      source: PriceSource.TokenPricesV2,
    });
  });
});
