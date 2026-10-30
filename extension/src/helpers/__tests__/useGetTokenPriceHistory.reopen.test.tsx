import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { makeDummyStore } from "popup/__testHelpers__";
import {
  densePoints,
  makeHistory,
} from "@shared/api/__tests__/fixtures/tokenPriceHistory";
import { resetCacheWriteClaims } from "helpers/cacheWrites";
import { useGetTokenPriceHistory } from "../hooks/useGetTokenPriceHistory";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));

const TOKEN = "native";

const FRESH = makeHistory({ points: densePoints(4, { startPrice: 9 }) });

const readCache = (store: ReturnType<typeof makeDummyStore>) =>
  (store.getState() as any).cache.tokenPriceHistory[
    MAINNET_NETWORK_DETAILS.networkPassphrase
  ]?.[TOKEN]?.["1D"];

describe("useGetTokenPriceHistory — a closed view's request cannot overwrite the reopened one", () => {
  afterEach(() => {
    mockedSend.mockReset();
    resetCacheWriteClaims();
  });

  it("keeps the newer instance's series when the older instance's response lands last", async () => {
    // The race guard that orders same-key writes used to be a `useRef` on the
    // hook, so it could not see across instances: closing the detail view threw
    // the map away, and the reopened view's fresh map said "you are the latest"
    // to a request issued before it. The stale body then won the cache AND took
    // a fresh `updatedAt`, so it was served for the full five-minute window.
    const releases: ((value: unknown) => void)[] = [];
    mockedSend.mockImplementation(
      () =>
        new Promise((resolve) => {
          releases.push(resolve);
        }),
    );

    // One store, as in the popup: Redux outlives the detail view's mount.
    const store = makeDummyStore({});
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Provider store={store}>{children}</Provider>
    );
    const query = {
      token: TOKEN,
      range: "1D" as const,
      networkDetails: MAINNET_NETWORK_DETAILS,
    };

    const first = renderHook(() => useGetTokenPriceHistory(), { wrapper });
    let pendingA: Promise<unknown> = Promise.resolve();
    act(() => {
      pendingA = first.result.current.fetchData(query);
    });

    // The user closes the detail view with A still outstanding, then reopens
    // the same token — a new hook instance, the same cache key.
    first.unmount();
    const second = renderHook(() => useGetTokenPriceHistory(), { wrapper });
    let pendingB: Promise<unknown> = Promise.resolve();
    act(() => {
      pendingB = second.result.current.fetchData(query);
    });

    expect(releases).toHaveLength(1);

    await act(async () => {
      releases[0]({ status: 200, body: { data: FRESH } });
      await Promise.all([pendingA, pendingB]);
    });

    expect(mockedSend).toHaveBeenCalledTimes(1);
    expect(readCache(store).points).toEqual(FRESH.points);
    // The reopened view — the one the user is looking at — shows the series.
    expect(second.result.current.state.data?.history).toEqual(FRESH);
  });
});
