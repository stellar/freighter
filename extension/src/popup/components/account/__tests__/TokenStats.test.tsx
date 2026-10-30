import React from "react";
import { Provider } from "react-redux";
import { render, screen, waitFor, act } from "@testing-library/react";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { sendMessageToBackground } from "@shared/api/helpers/extensionMessaging";
import { makeDummyStore } from "popup/__testHelpers__";
import { resetCacheWriteClaims } from "helpers/cacheWrites";
import { TOKEN_STATS_STALE_MS } from "popup/ducks/cache";
import { TokenStats } from "popup/components/account/TokenStats";

jest.mock("@shared/api/helpers/extensionMessaging");
const mockedSend = sendMessageToBackground as jest.Mock;

const renderStats = (store = makeDummyStore({})) => ({
  store,
  ...render(
    <Provider store={store}>
      <TokenStats token="native" networkDetails={MAINNET_NETWORK_DETAILS} />
    </Provider>,
  ),
});

describe("TokenStats", () => {
  afterEach(() => {
    mockedSend.mockReset();
    resetCacheWriteClaims();
  });

  it("renders the rows the response carries", async () => {
    mockedSend.mockResolvedValue({
      status: 200,
      body: {
        data: {
          token: "native",
          supplyOnStellar: "105443902087.3472865",
          holders: 9926520,
        },
      },
    });
    renderStats();

    await waitFor(() => expect(screen.getByTestId("TokenStats")).toBeDefined());
    expect(screen.getByText("Supply on Stellar")).toBeInTheDocument();
    expect(screen.getByText("105,443,902,087")).toBeInTheDocument();
    expect(screen.getByText("Holders")).toBeInTheDocument();
    expect(screen.getByText("9,926,520")).toBeInTheDocument();
  });

  it("keeps every digit of a supply above 2^53", async () => {
    // formatAmount narrows through Number and would render ...992.
    mockedSend.mockResolvedValue({
      status: 200,
      body: { data: { token: "native", supplyOnStellar: "9007199254740993" } },
    });
    renderStats();

    await waitFor(() => expect(screen.getByTestId("TokenStats")).toBeDefined());
    expect(screen.getByText("9,007,199,254,740,993")).toBeInTheDocument();
  });

  it("renders only present fields — absent fields get no row", async () => {
    mockedSend.mockResolvedValue({
      status: 200,
      body: { data: { token: "native", holders: 42 } },
    });
    renderStats();

    await waitFor(() => expect(screen.getByTestId("TokenStats")).toBeDefined());
    expect(screen.queryByText("Supply on Stellar")).toBeNull();
    expect(screen.getByText("Holders")).toBeInTheDocument();
  });

  it("hides the whole section when no rows come back", async () => {
    mockedSend.mockResolvedValue({
      status: 200,
      body: { data: { token: "native" } },
    });
    const { container } = renderStats();

    await waitFor(() => expect(mockedSend).toHaveBeenCalled());
    expect(screen.queryByTestId("TokenStats")).toBeNull();
    expect(container.textContent).toBe("");
  });

  it.each([
    ["a null supply", { supplyOnStellar: null, holders: 12 }],
    ["a non-numeric supply", { supplyOnStellar: "abc", holders: 12 }],
    ["a non-finite holders", { supplyOnStellar: "12", holders: null }],
    ["a negative supply", { supplyOnStellar: "-1", holders: 12 }],
    ["a negative holders", { supplyOnStellar: "12", holders: -1 }],
    [
      "a response for another token",
      { token: "USDC:GA5Z", supplyOnStellar: "12" },
    ],
  ])("hides the section on %s rather than rendering NaN", async (_l, data) => {
    mockedSend.mockResolvedValue({
      status: 200,
      body: { data: { token: "native", ...data } },
    });
    renderStats();

    await waitFor(() => expect(mockedSend).toHaveBeenCalled());
    expect(screen.queryByTestId("TokenStats")).toBeNull();
    expect(screen.queryByText("NaN")).toBeNull();
  });

  it("hides the section on a fetch error rather than an empty card", async () => {
    mockedSend.mockResolvedValue({ status: 503, body: { error: "down" } });
    renderStats();

    await waitFor(() => expect(mockedSend).toHaveBeenCalled());
    expect(screen.queryByTestId("TokenStats")).toBeNull();
  });

  it("serves a remount from the session cache without a second request", async () => {
    mockedSend.mockResolvedValue({
      status: 200,
      body: {
        data: {
          token: "native",
          supplyOnStellar: "105443902087.3472865",
          holders: 9926520,
        },
      },
    });

    // AssetDetail mounts this on every open of a token's detail view; without
    // a cache each open pays a fresh round trip for data that changes hourly.
    const store = makeDummyStore({});
    const first = renderStats(store);
    await waitFor(() => expect(screen.getByTestId("TokenStats")).toBeDefined());
    expect(mockedSend).toHaveBeenCalledTimes(1);
    first.unmount();

    renderStats(store);
    await waitFor(() => expect(screen.getByTestId("TokenStats")).toBeDefined());
    expect(screen.getByText("9,926,520")).toBeInTheDocument();
    expect(mockedSend).toHaveBeenCalledTimes(1);
  });

  it("refetches once the cached entry falls outside the validity window", async () => {
    const now = 1_800_000_000_000;
    jest.spyOn(Date, "now").mockReturnValue(now);
    mockedSend.mockResolvedValue({
      status: 200,
      body: { data: { token: "native", holders: 7 } },
    });

    const store = makeDummyStore({
      cache: {
        tokenStats: {
          [MAINNET_NETWORK_DETAILS.networkPassphrase]: {
            native: {
              token: "native",
              holders: 9926520,
              updatedAt: now - TOKEN_STATS_STALE_MS - 1,
            },
          },
        },
      },
    });
    renderStats(store);

    await waitFor(() => expect(screen.getByText("7")).toBeInTheDocument());
    expect(mockedSend).toHaveBeenCalledTimes(1);
    jest.restoreAllMocks();
  });

  it("does not let a closed card's response overwrite the reopened card's", async () => {
    // The effect's `isActive` flag only stops the local dispatch — the cache
    // write ran unconditionally. Close and quickly reopen the same token and
    // the first card's in-flight response lands last, overwriting the second's
    // and re-stamping `updatedAt`, so the stale figure is then served for the
    // whole five-minute window.
    const releases: ((value: unknown) => void)[] = [];
    mockedSend.mockImplementation(
      () =>
        new Promise((resolve) => {
          releases.push(resolve);
        }),
    );

    const store = makeDummyStore({});
    const first = renderStats(store);
    await waitFor(() => expect(releases).toHaveLength(1));

    first.unmount();
    renderStats(store);
    await waitFor(() => expect(releases).toHaveLength(2));

    // The reopened card's response settles first...
    await act(async () => {
      releases[1]({
        status: 200,
        body: { data: { token: "native", holders: 2 } },
      });
    });
    // ...then the closed card's, carrying the older figure.
    await act(async () => {
      releases[0]({
        status: 200,
        body: { data: { token: "native", holders: 111 } },
      });
    });

    const cached = (store.getState() as any).cache.tokenStats[
      MAINNET_NETWORK_DETAILS.networkPassphrase
    ].native;
    expect(cached.holders).toBe(2);
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
