import React from "react";
import { Provider } from "react-redux";
import { renderHook, act } from "@testing-library/react";
import { captureException } from "@sentry/browser";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { makeDummyStore } from "popup/__testHelpers__";
import { makeHistory } from "@shared/api/__tests__/fixtures/tokenPriceHistory";
import { useGetTokenPriceHistory } from "../hooks/useGetTokenPriceHistory";

// §N refs: wallet-eng-monorepo/design-docs/token-price-graphs/token-price-graphs-design.md

jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

jest.mock("helpers/metrics", () => ({
  emitMetric: jest.fn(),
}));

jest.mock("@sentry/browser", () => ({
  captureException: jest.fn(),
}));
const mockedCapture = captureException as jest.Mock;

const renderTestHook = () => {
  const store = makeDummyStore({});
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useGetTokenPriceHistory(), { wrapper });
};

const fetchOnce = async (
  result: ReturnType<typeof renderTestHook>["result"],
) => {
  await act(async () => {
    await result.current.fetchData({
      token: "native",
      range: "1D",
      networkDetails: MAINNET_NETWORK_DETAILS,
    });
  });
};

describe("useGetTokenPriceHistory Sentry reporting (§4.4 rule 6)", () => {
  afterEach(() => {
    mockedSend.mockReset();
    mockedCapture.mockReset();
  });

  it("reports a failed fetch — upstream outages must be tracked", async () => {
    mockedSend.mockResolvedValue({ status: 503, body: { error: "down" } });
    const { result } = renderTestHook();

    await fetchOnce(result);

    expect(mockedCapture).toHaveBeenCalledTimes(1);
    // The Error itself, not an interpolated string — a string loses the type
    // and the stack before Sentry receives them.
    expect(mockedCapture.mock.calls[0][0]).toBeInstanceOf(Error);
    expect(mockedCapture.mock.calls[0][1]?.tags?.operation).toBe(
      "getTokenPriceHistory",
    );
    expect(String(mockedCapture.mock.calls[0][0])).toContain(
      "token price history",
    );
  });

  it("never reports a no-data response — the expected state for most Soroban tokens", async () => {
    mockedSend.mockResolvedValue({
      status: 200,
      body: {
        data: makeHistory({ lowVolume: null, change: null, points: [] }),
      },
    });
    const { result } = renderTestHook();

    await fetchOnce(result);

    expect(mockedCapture).not.toHaveBeenCalled();
  });

  it("never reports a warm failure — the user never asked for that range", async () => {
    // Background warming is opportunistic: it has no error UI, no retry and
    // no incident. A range the user later switches to fails through
    // `fetchData` and is reported there, exactly as it is today.
    mockedSend.mockResolvedValue({ status: 503, body: { error: "down" } });
    const { result } = renderTestHook();

    await act(async () => {
      await result.current.warmRange({
        token: "native",
        range: "1W",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    expect(mockedCapture).not.toHaveBeenCalled();
  });

  it("treats a malformed series as a reported failure, not a render crash", async () => {
    // `t` reaches Intl.DateTimeFormat when the accessible label is built, and
    // a non-finite value throws a RangeError there — during render, where the
    // app-level ErrorBoundary would replace the whole popup with an error
    // page. The API layer rejects the payload instead, so it lands on the
    // ordinary failure path: reported to Sentry, rendered as the error state.
    mockedSend.mockResolvedValueOnce({
      status: 200,
      body: {
        data: {
          ...makeHistory(),
          points: [
            { t: 1786636800, p: "0.15" },
            { t: null, p: "0.16" },
          ],
        },
      },
    });

    const { result } = renderTestHook();
    let payload: Awaited<ReturnType<typeof result.current.fetchData>>;
    await act(async () => {
      payload = await result.current.fetchData({
        token: "native",
        range: "1D",
        networkDetails: MAINNET_NETWORK_DETAILS,
      });
    });

    expect(payload!.history).toBeNull();
    expect(mockedCapture).toHaveBeenCalledTimes(1);
    expect(String(mockedCapture.mock.calls[0][0])).toContain("malformed point");
  });

  it.each([
    [
      "a non-numeric price",
      {
        points: [
          { t: 1786636800, p: "0.15" },
          { t: 1786637700, p: "abc" },
        ],
      },
      "malformed point",
    ],
    // `formatChartPrice` takes abs(), so a negative close would be labelled as
    // a positive dollar amount — malformed data shown as plausible market data.
    [
      "a negative price",
      {
        points: [
          { t: 1786636800, p: "0.15" },
          { t: 1786637700, p: "-0.16" },
        ],
      },
      "malformed point",
    ],
    [
      "a whitespace-only price",
      {
        points: [
          { t: 1786636800, p: "0.15" },
          { t: 1786637700, p: "  " },
        ],
      },
      "malformed point",
    ],
    [
      "a non-finite resolutionSeconds",
      { resolutionSeconds: Number.NaN },
      "resolutionSeconds",
    ],
    // Zero or negative would place a bucket's close at or before its start.
    // The geometry takes the first bucket as the x origin, so a backwards
    // series draws a line that doubles back rather than failing.
    [
      "a non-chronological series",
      {
        points: [
          { t: 1786636800, p: "0.15" },
          { t: 1786636000, p: "0.16" },
          { t: 1786637700, p: "0.17" },
        ],
      },
      "out of chronological order",
    ],
    ["a zero resolutionSeconds", { resolutionSeconds: 0 }, "resolutionSeconds"],
    [
      "a negative resolutionSeconds",
      { resolutionSeconds: -900 },
      "resolutionSeconds",
    ],
    [
      // Finite, but past Date's ±8.64e15 ms: `format(new Date(t * 1000))`
      // throws RangeError.
      "a timestamp outside Date's range",
      {
        points: [
          { t: 1786636800, p: "0.15" },
          { t: 1e13, p: "0.16" },
        ],
      },
      "malformed point",
    ],
    [
      "a range end outside Date's range",
      { resolutionSeconds: 8.64e12 },
      "range end",
    ],
    // A missing or stringly verdict would read as `false` and silence the
    // "verdict unavailable" warning.
    ["a stringly lowVolume", { lowVolume: "false" }, "lowVolume"],
    ["a missing lowVolume", { lowVolume: undefined }, "lowVolume"],
    // Well-formed, but for another asset or range: cached under this key it
    // would draw someone else's prices under this tab.
    [
      "a response echoing a different token",
      {
        token: "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
      },
      "does not match requested",
    ],
    [
      "a response echoing a different range",
      { range: "1W" },
      "does not match requested",
    ],
    [
      "a non-numeric change",
      { change: { absolute: "n/a", percent: "0.86" } },
      "malformed change",
    ],
    // `change` is nullable, not optional. A missing field renders the same
    // empty header as the legitimate null, so the distinct message matters:
    // folding this back into the `!== null` branch would report "malformed
    // change" and this row is what notices.
    ["a missing change", { change: undefined }, "missing change"],
  ])(
    "rejects %s rather than rendering NaN or throwing in render",
    async (_label, overrides, expected) => {
      // Each of these reaches arithmetic or Intl downstream: a bad `p` prints
      // "$NaN" and NaN SVG coordinates while still reporting has_data: true,
      // and a bad `resolutionSeconds` is added to the last timestamp to label
      // the range end, throwing a RangeError during render.
      mockedSend.mockResolvedValueOnce({
        status: 200,
        body: { data: { ...makeHistory(), ...overrides } },
      });

      const { result } = renderTestHook();
      let payload: Awaited<ReturnType<typeof result.current.fetchData>>;
      await act(async () => {
        payload = await result.current.fetchData({
          token: "native",
          range: "1D",
          networkDetails: MAINNET_NETWORK_DETAILS,
        });
      });

      expect(payload!.history).toBeNull();
      expect(mockedCapture).toHaveBeenCalledTimes(1);
      expect(String(mockedCapture.mock.calls[0][0])).toContain(expected);
    },
  );
});
