import {
  MAINNET_NETWORK_DETAILS,
  NetworkDetails,
} from "@shared/constants/stellar";
import { CUSTOM_NETWORK } from "@shared/helpers/stellar";
import { captureException } from "@sentry/browser";
import * as GetSwapQuotes from "@shared/api/helpers/getSwapQuotes";
import * as HorizonGetBestPath from "popup/helpers/horizonGetBestPath";

import { getSwapQuote } from "../swapQuote";

jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));

const ACCOUNT = "GCXRLIZUQNZ3YYJDGX6Z445P7FG5WXT7UILBO5CFIYYM7Z7YTIOELC6O";
const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const AQUA = "AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";
const TOKEN_CONTRACT =
  "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75";

const CUSTOM_NETWORK_DETAILS: NetworkDetails = {
  network: CUSTOM_NETWORK,
  networkName: "Local",
  networkUrl: "http://localhost:8000",
  networkPassphrase: "Standalone Network ; February 2017",
};

const classicRoute = {
  source: "classic",
  fromAmount: "100",
  toAmount: "17.5",
  paths: [
    {
      share: "1",
      hops: [
        { venue: "stellar-dex", from: "XLM", to: AQUA },
        { venue: "stellar-dex", from: AQUA, to: USDC },
      ],
    },
  ],
  fees: [],
};

const lifiRoute = {
  source: "lifi",
  fromAmount: "100",
  toAmount: "18",
  paths: [
    {
      share: "1",
      hops: [{ venue: "Aquarius", from: "XLM", to: USDC, pool: "abc" }],
    },
  ],
  fees: [],
};

describe("getSwapQuote", () => {
  let getSwapQuotes: jest.SpyInstance;
  let horizonSend: jest.SpyInstance;
  let horizonReceive: jest.SpyInstance;

  beforeEach(() => {
    getSwapQuotes = jest.spyOn(GetSwapQuotes, "getSwapQuotes");
    horizonSend = jest.spyOn(HorizonGetBestPath, "horizonGetBestPath");
    horizonReceive = jest.spyOn(
      HorizonGetBestPath,
      "horizonGetBestReceivePath",
    );
  });
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  describe("on a standard network", () => {
    it("asks the backend, not Horizon, with backend asset ids", async () => {
      getSwapQuotes.mockResolvedValue({ routes: [], unavailable: [] });

      await getSwapQuote({
        mode: "send",
        amount: "1,000.5",
        sourceAsset: "native",
        destAsset: USDC,
        networkDetails: MAINNET_NETWORK_DETAILS,
        publicKey: ACCOUNT,
      });

      expect(getSwapQuotes).toHaveBeenCalledWith({
        network: "PUBLIC",
        account: ACCOUNT,
        mode: "send",
        fromAsset: "XLM",
        toAsset: USDC,
        amount: "1000.5",
      });
      expect(horizonSend).not.toHaveBeenCalled();
      expect(horizonReceive).not.toHaveBeenCalled();
    });

    it("sends a contract token as its contract ID", async () => {
      getSwapQuotes.mockResolvedValue({ routes: [], unavailable: [] });

      await getSwapQuote({
        mode: "receive",
        amount: "0.5",
        sourceAsset: `TKN:${TOKEN_CONTRACT}`,
        destAsset: "native",
        networkDetails: MAINNET_NETWORK_DETAILS,
        publicKey: ACCOUNT,
      });

      expect(getSwapQuotes).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: "receive",
          fromAsset: TOKEN_CONTRACT,
          toAsset: "XLM",
        }),
      );
    });

    it("uses the classic route, even when it is not the best, and keeps the full response", async () => {
      const quotes = { routes: [lifiRoute, classicRoute], unavailable: [] };
      getSwapQuotes.mockResolvedValue(quotes);

      const result = await getSwapQuote({
        mode: "send",
        amount: "100",
        sourceAsset: "native",
        destAsset: USDC,
        networkDetails: MAINNET_NETWORK_DETAILS,
        publicKey: ACCOUNT,
      });

      expect(result).toEqual({
        route: {
          sourceAmount: "100",
          destinationAmount: "17.5",
          path: [AQUA],
        },
        quotes,
        key: expect.any(Object),
      });
    });

    it("maps an XLM intermediate hop to the canonical native id", async () => {
      const route = {
        ...classicRoute,
        paths: [
          {
            share: "1",
            hops: [
              { venue: "stellar-dex", from: AQUA, to: "XLM" },
              { venue: "stellar-dex", from: "XLM", to: USDC },
            ],
          },
        ],
      };
      getSwapQuotes.mockResolvedValue({ routes: [route], unavailable: [] });

      const result = await getSwapQuote({
        mode: "send",
        amount: "100",
        sourceAsset: AQUA,
        destAsset: USDC,
        networkDetails: MAINNET_NETWORK_DETAILS,
        publicKey: ACCOUNT,
      });

      expect(result.route?.path).toEqual(["native"]);
    });

    it("has no route when no classic route came back", async () => {
      const quotes = {
        routes: [lifiRoute],
        unavailable: [{ source: "classic", reason: "no_route" }],
      };
      getSwapQuotes.mockResolvedValue(quotes);

      const result = await getSwapQuote({
        mode: "send",
        amount: "100",
        sourceAsset: "native",
        destAsset: USDC,
        networkDetails: MAINNET_NETWORK_DETAILS,
        publicKey: ACCOUNT,
      });

      expect(result).toEqual({ route: null, quotes, key: expect.any(Object) });
    });
  });

  it.each([
    ["5.", "5"],
    [".5", "0.5"],
    ["0.10", "0.1"],
  ])("sends the amount %s as the plain decimal %s", async (typed, sent) => {
    getSwapQuotes.mockResolvedValue({ routes: [], unavailable: [] });

    const { key } = await getSwapQuote({
      mode: "send",
      amount: typed,
      sourceAsset: "native",
      destAsset: USDC,
      networkDetails: MAINNET_NETWORK_DETAILS,
      publicKey: ACCOUNT,
    });

    expect(getSwapQuotes).toHaveBeenCalledWith(
      expect.objectContaining({ amount: sent }),
    );
    expect(key.amount).toBe(sent);
  });

  describe("when classic can't quote", () => {
    const quoteWith = (unavailable: { source: string; reason: string }[]) => {
      getSwapQuotes.mockResolvedValue({ routes: [lifiRoute], unavailable });
      return getSwapQuote({
        mode: "send",
        amount: "100",
        sourceAsset: "native",
        destAsset: USDC,
        networkDetails: MAINNET_NETWORK_DETAILS,
        publicKey: ACCOUNT,
      });
    };

    it.each(["error", "timeout", "rate_limited"])(
      "reports classic %s as swaps unavailable, leaving Sentry to the caller",
      async (reason) => {
        const err = await quoteWith([{ source: "classic", reason }]).catch(
          (e) => e,
        );

        expect(err).toBeInstanceOf(GetSwapQuotes.SwapQuotesError);
        expect(err.kind).toBe("unavailable");
        expect(captureException).not.toHaveBeenCalled();
      },
    );

    it.each([
      [[{ source: "classic", reason: "no_route" }]],
      [[{ source: "classic", reason: "insufficient_balance" }]],
      [[{ source: "lifi", reason: "error" }]],
      [[]],
    ])("has no route for unavailable %j", async (unavailable) => {
      const result = await quoteWith(unavailable);

      expect(result.route).toBeNull();
    });
  });

  describe("on a custom network", () => {
    it("keeps Horizon strict-send path finding", async () => {
      horizonSend.mockResolvedValue({
        source_amount: "100",
        destination_amount: "17.5",
        path: [
          {
            asset_type: "credit_alphanum4",
            asset_code: "AQUA",
            asset_issuer: AQUA.split(":")[1],
          },
          { asset_type: "native" },
        ],
      } as any);

      const result = await getSwapQuote({
        mode: "send",
        amount: "100",
        sourceAsset: "native",
        destAsset: USDC,
        networkDetails: CUSTOM_NETWORK_DETAILS,
        publicKey: ACCOUNT,
      });

      expect(getSwapQuotes).not.toHaveBeenCalled();
      expect(horizonSend).toHaveBeenCalledWith({
        amount: "100",
        sourceAsset: "native",
        destAsset: USDC,
        networkDetails: CUSTOM_NETWORK_DETAILS,
      });
      expect(result).toEqual({
        route: {
          sourceAmount: "100",
          destinationAmount: "17.5",
          path: [AQUA, "native"],
        },
        quotes: null,
        key: expect.any(Object),
      });
    });

    it("keeps Horizon strict-receive path finding for receive quotes", async () => {
      horizonReceive.mockResolvedValue({
        source_amount: "3.2",
        destination_amount: "0.5",
        path: [],
      } as any);

      const result = await getSwapQuote({
        mode: "receive",
        amount: "0.5",
        sourceAsset: USDC,
        destAsset: "native",
        networkDetails: CUSTOM_NETWORK_DETAILS,
        publicKey: ACCOUNT,
      });

      expect(horizonReceive).toHaveBeenCalledWith({
        destinationAmount: "0.5",
        sourceAsset: USDC,
        destAsset: "native",
        networkDetails: CUSTOM_NETWORK_DETAILS,
      });
      expect(result.route).toEqual({
        sourceAmount: "3.2",
        destinationAmount: "0.5",
        path: [],
      });
    });

    it("has no route when Horizon finds no path", async () => {
      horizonSend.mockResolvedValue(undefined as any);

      const result = await getSwapQuote({
        mode: "send",
        amount: "100",
        sourceAsset: "native",
        destAsset: USDC,
        networkDetails: CUSTOM_NETWORK_DETAILS,
        publicKey: ACCOUNT,
      });

      expect(result).toEqual({
        route: null,
        quotes: null,
        key: expect.any(Object),
      });
    });
  });
});
