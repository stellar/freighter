import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { makeDummyStore } from "popup/__testHelpers__";
import { makeHistory } from "@shared/api/__tests__/fixtures/tokenPriceHistory";
import { emitMetric } from "helpers/metrics";
import { useGetTokenPriceHistory } from "../hooks/useGetTokenPriceHistory";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));
const mockedEmitMetric = emitMetric as jest.Mock;

const TOKEN = "native";

const renderTestHook = () => {
  const store = makeDummyStore({});
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useGetTokenPriceHistory(), { wrapper });
};

describe("useGetTokenPriceHistory — unmount invalidates in-flight fetches", () => {
  afterEach(() => {
    mockedSend.mockReset();
    mockedEmitMetric.mockReset();
  });

  it("emits no token_chart.loaded for a response that lands after unmount", async () => {
    // The request is outstanding when the detail view closes.
    let release: (value: unknown) => void = () => {};
    mockedSend.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = resolve;
        }),
    );

    const { result, unmount } = renderTestHook();
    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.fetchData({
        token: TOKEN,
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    unmount();

    // The response arrives for a chart the user is no longer looking at.
    // `isSuperseded` keys off the fetch id, and only a NEWER fetch bumps it —
    // so without the unmount cleanup this guard passes and the outcome event
    // fires for a chart nobody was shown.
    await act(async () => {
      release({ status: 200, body: { data: makeHistory() } });
      await pending;
    });

    expect(mockedEmitMetric).not.toHaveBeenCalled();
  });
});
