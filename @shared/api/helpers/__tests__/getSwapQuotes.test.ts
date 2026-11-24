import { captureException } from "@sentry/browser";

import { getSwapQuotes, SwapQuotesError } from "../getSwapQuotes";
import { fetchBackendV2 } from "../fetchBackendV2";

jest.mock("../fetchBackendV2");
jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));
const mockedFetch = fetchBackendV2 as jest.Mock;

const ACCOUNT = "GCXRLIZUQNZ3YYJDGX6Z445P7FG5WXT7UILBO5CFIYYM7Z7YTIOELC6O";
const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const request = {
  network: "PUBLIC",
  account: ACCOUNT,
  mode: "send" as const,
  fromAsset: "XLM",
  toAsset: USDC,
  amount: "100",
};

const quotes = {
  routes: [
    {
      source: "classic",
      fromAmount: "100",
      toAmount: "17.5",
      paths: [
        {
          share: "1",
          hops: [{ venue: "stellar-dex", from: "XLM", to: USDC }],
        },
      ],
      fees: [],
    },
  ],
  unavailable: [],
};

describe("getSwapQuotes", () => {
  afterEach(() => jest.clearAllMocks());

  it("POSTs the quote request to /swap/quotes with the network in the query", async () => {
    mockedFetch.mockResolvedValue({ status: 200, body: { data: quotes } });

    await getSwapQuotes(request);

    expect(mockedFetch).toHaveBeenCalledWith({
      method: "POST",
      path: "/swap/quotes?network=PUBLIC",
      body: JSON.stringify({
        account: ACCOUNT,
        mode: "send",
        fromAsset: "XLM",
        toAsset: USDC,
        amount: "100",
      }),
    });
  });

  it("returns the unwrapped response on 200", async () => {
    mockedFetch.mockResolvedValue({ status: 200, body: { data: quotes } });

    await expect(getSwapQuotes(request)).resolves.toEqual(quotes);
  });

  it("returns empty routes on 200 with no route", async () => {
    const empty = {
      routes: [],
      unavailable: [{ source: "classic", reason: "no_route" }],
    };
    mockedFetch.mockResolvedValue({ status: 200, body: { data: empty } });

    await expect(getSwapQuotes(request)).resolves.toEqual(empty);
  });

  it("rejects a 400 as bad input", async () => {
    mockedFetch.mockResolvedValue({
      status: 400,
      body: { error: "invalid amount" },
    });

    const err = await getSwapQuotes(request).catch((e) => e);
    expect(err).toBeInstanceOf(SwapQuotesError);
    expect(err.kind).toBe("badRequest");
  });

  it.each([502, 503, 401, 500, 429])(
    "rejects a %s as swaps unavailable",
    async (status) => {
      mockedFetch.mockResolvedValue({ status, body: { error: "x" } });

      const err = await getSwapQuotes(request).catch((e) => e);
      expect(err).toBeInstanceOf(SwapQuotesError);
      expect(err.kind).toBe("unavailable");
    },
  );

  it("reports an unreachable backend as swaps unavailable", async () => {
    mockedFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    const err = await getSwapQuotes(request).catch((e) => e);
    expect(err).toBeInstanceOf(SwapQuotesError);
    expect(err.kind).toBe("unavailable");
  });

  it("never reports to Sentry itself; the user-initiated callers do", async () => {
    mockedFetch.mockResolvedValueOnce({ status: 503, body: {} });
    await getSwapQuotes(request).catch(() => undefined);
    mockedFetch.mockResolvedValueOnce({ status: 400, body: {} });
    await getSwapQuotes(request).catch(() => undefined);
    mockedFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    await getSwapQuotes(request).catch(() => undefined);

    expect(captureException).not.toHaveBeenCalled();
  });

  it("rejects a 200 without a routes list as swaps unavailable", async () => {
    mockedFetch.mockResolvedValue({ status: 200, body: { data: {} } });

    const err = await getSwapQuotes(request).catch((e) => e);
    expect(err).toBeInstanceOf(SwapQuotesError);
    expect(err.kind).toBe("unavailable");
  });
});
