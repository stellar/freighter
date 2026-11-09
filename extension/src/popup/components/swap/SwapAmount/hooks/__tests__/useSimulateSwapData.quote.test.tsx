import React from "react";
import { captureException } from "@sentry/browser";
import { act, renderHook } from "@testing-library/react";
import {
  Account,
  Asset,
  Networks,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import * as FetchBackendV2 from "@shared/api/helpers/fetchBackendV2";
import { getAssetFromCanonical } from "@shared/helpers/stellar";
import { Wrapper, getTestStore } from "popup/__testHelpers__";
import {
  initialState as transactionSubmissionInitialState,
  saveSimulation,
} from "popup/ducks/transactionSubmission";
import * as Blockaid from "popup/helpers/blockaid";
import * as HorizonGetBestPath from "popup/helpers/horizonGetBestPath";

import { useSimulateTxData } from "../useSimulateSwapData";

jest.mock("@sentry/browser", () => ({
  ...jest.requireActual("@sentry/browser"),
  captureException: jest.fn(),
}));

jest.mock("@shared/api/helpers/stellarSdkServer", () => ({
  stellarSdkServer: () => ({
    loadAccount: async (pk: string) => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { Account } = require("stellar-sdk");
      return new Account(pk, "1");
    },
  }),
}));

const PUBLIC_KEY = "GCXRLIZUQNZ3YYJDGX6Z445P7FG5WXT7UILBO5CFIYYM7Z7YTIOELC6O";
const USDC_ISSUER = "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";
const USDC = `USDC:${USDC_ISSUER}`;
const AQUA_ISSUER = "GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA";
const AQUA = `AQUA:${AQUA_ISSUER}`;

const quotes = {
  routes: [
    {
      source: "classic",
      fromAmount: "10",
      toAmount: "1.5",
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
    },
  ],
  unavailable: [],
};

const storedKey = {
  account: PUBLIC_KEY,
  network: "PUBLIC",
  networkUrl: MAINNET_NETWORK_DETAILS.networkUrl,
  mode: "send",
  sourceAsset: "native",
  destAsset: USDC,
  amount: "10",
};

const storedQuote = {
  destinationAmount: "1.6",
  path: [] as string[],
  swapQuotes: {
    ...quotes,
    routes: [{ ...quotes.routes[0], toAmount: "1.6" }],
  },
  swapQuoteKey: storedKey,
};

const backendAsset = (a: string) =>
  a === "XLM" ? Asset.native() : (getAssetFromCanonical(a) as Asset);

// /swap/tx as #178's classic source builds it, from the request.
const classicBuild = (req: any) =>
  new TransactionBuilder(new Account(req.account, "1"), {
    fee: "100",
    networkPassphrase: Networks.PUBLIC,
  })
    .addOperation(
      Operation.pathPaymentStrictSend({
        sendAsset: backendAsset(req.fromAsset),
        sendAmount: req.amount,
        destination: req.account,
        destAsset: backendAsset(req.toAsset),
        destMin: req.minOut,
        path: req.paths[0].hops
          .slice(1)
          .map((h: { from: string }) => backendAsset(h.from)),
      }),
    )
    .setTimeout(req.timeout)
    .build()
    .toXDR();

const answer = (
  quotesResponse: unknown,
  tx: { status: number; build?: (req: any) => string } = {
    status: 200,
    build: classicBuild,
  },
) =>
  jest.fn(async ({ path, body }: { path: string; body: string }) => {
    if (path.startsWith("/swap/quotes")) {
      return { status: 200, body: { data: quotesResponse } };
    }
    if (tx.status !== 200 || !tx.build) {
      return { status: tx.status, body: { error: "x" } };
    }
    return {
      status: 200,
      body: { data: { xdr: tx.build(JSON.parse(body)), addsTrustline: false } },
    };
  });

const txRequest = (spy: jest.SpyInstance) =>
  JSON.parse(
    spy.mock.calls.find(([{ path }]) => path.startsWith("/swap/tx"))[0].body,
  );

const quoteCalls = (spy: jest.SpyInstance) =>
  spy.mock.calls.filter(([{ path }]) => path.startsWith("/swap/quotes"));

const renderSimulate = (
  stored: Record<string, unknown> = {
    // No live quote yet: the hook must fetch one.
    destinationAmount: "",
    path: [],
  },
) =>
  renderHook(
    () =>
      useSimulateTxData({
        publicKey: PUBLIC_KEY,
        networkDetails: MAINNET_NETWORK_DETAILS,
        simParams: {
          sourceAsset: Asset.native(),
          destAsset: new Asset("USDC", USDC_ISSUER),
          amount: "10",
          allowedSlippage: "1",
          path: [],
          transactionFee: "0.00001",
          transactionTimeout: 180,
          destRequiresTrustline: false,
        },
      }),
    {
      wrapper: ({ children }) => (
        <Wrapper
          routes={["/"]}
          state={{
            transactionSubmission: {
              ...transactionSubmissionInitialState,
              transactionData: {
                ...transactionSubmissionInitialState.transactionData,
                ...stored,
              },
            },
          }}
        >
          {children}
        </Wrapper>
      ),
    },
  );

describe("useSimulateTxData quote when no live quote exists", () => {
  let fetchBackendV2: jest.SpyInstance;
  let horizonGetBestPath: jest.SpyInstance;

  beforeEach(() => {
    jest.spyOn(Blockaid, "useScanTx").mockReturnValue({
      scanTx: jest.fn().mockResolvedValue(null),
    } as any);
    fetchBackendV2 = jest.spyOn(FetchBackendV2, "fetchBackendV2");
    horizonGetBestPath = jest
      .spyOn(HorizonGetBestPath, "horizonGetBestPath")
      .mockRejectedValue(new Error("Horizon must not be called"));
  });
  afterEach(() => jest.restoreAllMocks());

  it("builds the path payment from the backend's classic route", async () => {
    fetchBackendV2.mockImplementation(answer(quotes));
    const { result } = renderSimulate();

    let payload: any;
    await act(async () => {
      payload = await result.current.fetchData({ amount: "10" });
    });

    expect(fetchBackendV2).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/swap/quotes?network=PUBLIC" }),
    );
    expect(horizonGetBestPath).not.toHaveBeenCalled();

    const tx = TransactionBuilder.fromXDR(
      payload.transactionXdr,
      MAINNET_NETWORK_DETAILS.networkPassphrase,
    ) as any;
    const op = tx.operations[0];
    expect(op.type).toBe("pathPaymentStrictSend");
    expect(op.path.map((a: Asset) => `${a.code}:${a.issuer}`)).toEqual([AQUA]);
    // 1.5 less 1% slippage
    expect(op.destMin).toBe("1.4850000");

    const { transactionData } =
      getTestStore()!.getState().transactionSubmission;
    expect(transactionData.swapQuotes).toEqual(quotes);
  });

  it("sends the route, minOut, slippage, fee and timeout to /swap/tx", async () => {
    fetchBackendV2.mockImplementation(answer(quotes));
    const { result } = renderSimulate();

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(fetchBackendV2).toHaveBeenCalledWith(
      expect.objectContaining({ path: "/swap/tx?network=PUBLIC" }),
    );
    expect(txRequest(fetchBackendV2)).toEqual({
      account: PUBLIC_KEY,
      source: "classic",
      fromAsset: "XLM",
      toAsset: USDC,
      amount: "10",
      minOut: "1.485",
      fee: "0.00001",
      slippage: "1",
      timeout: 180,
      paths: quotes.routes[0].paths,
    });
  });

  it("builds the backend's best route even when it is not classic", async () => {
    const lifiFirst = {
      ...quotes,
      routes: [
        {
          source: "lifi",
          fromAmount: "10",
          toAmount: "2",
          paths: [
            {
              share: "1",
              hops: [{ venue: "Aquarius", from: "XLM", to: USDC, pool: "p" }],
            },
          ],
          fees: [],
        },
        ...quotes.routes,
      ],
    };
    fetchBackendV2.mockImplementation(answer(lifiFirst));
    const { result } = renderSimulate();

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(txRequest(fetchBackendV2)).toMatchObject({
      source: "lifi",
      minOut: "1.98",
    });
  });

  it("returns the review values decoded from the built transaction", async () => {
    // A build that sells less than asked must show what it sells.
    fetchBackendV2.mockImplementation(
      answer(quotes, {
        status: 200,
        build: (req) => classicBuild({ ...req, amount: "9" }),
      }),
    );
    const { result } = renderSimulate();

    let payload: any;
    await act(async () => {
      payload = await result.current.fetchData({ amount: "10" });
    });

    expect(payload.decoded).toEqual({
      sendAmount: "9",
      minReceived: "1.485",
      fee: "0.00001",
      addsTrustline: false,
    });
  });

  it("refuses a built transaction that pays another account", async () => {
    fetchBackendV2.mockImplementation(
      answer(quotes, {
        status: 200,
        build: (req) =>
          new TransactionBuilder(new Account(req.account, "1"), {
            fee: "100",
            networkPassphrase: Networks.PUBLIC,
          })
            .addOperation(
              Operation.pathPaymentStrictSend({
                sendAsset: Asset.native(),
                sendAmount: req.amount,
                destination: USDC_ISSUER,
                destAsset: backendAsset(req.toAsset),
                destMin: req.minOut,
              }),
            )
            .setTimeout(180)
            .build()
            .toXDR(),
      }),
    );
    const { result } = renderSimulate();

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(result.current.state.state).toBe("ERROR");
    expect(
      getTestStore()!.getState().transactionSubmission.transactionSimulation
        .preparedTransaction,
    ).toBeNull();
  });

  it("refuses a build whose minimum is below the minOut sent", async () => {
    fetchBackendV2.mockImplementation(
      answer(quotes, {
        status: 200,
        build: (req) => classicBuild({ ...req, minOut: "1.4849999" }),
      }),
    );
    const { result } = renderSimulate();

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(result.current.state.state).toBe("ERROR");
  });

  it("treats a 409 quote_moved as an expired quote and re-quotes next time", async () => {
    fetchBackendV2.mockImplementation(answer(quotes, { status: 409 }));
    const { result } = renderSimulate(storedQuote);

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(result.current.isQuoteExpired).toBe(true);
    expect(result.current.state.error).toBe(
      "Quote has expired, please try again to get a new quote",
    );
    expect(
      getTestStore()!.getState().transactionSubmission.transactionData
        .swapQuoteKey,
    ).toBeNull();
  });

  it("keeps the newest build when an older one lands after it", async () => {
    const builds: Array<() => void> = [];
    const respond = answer(quotes);
    fetchBackendV2.mockImplementation(async (req: any) => {
      if (!req.path.startsWith("/swap/tx")) {
        return respond(req);
      }
      const reply = await respond(req);
      return new Promise((resolve) => builds.push(() => resolve(reply)));
    });
    const { result } = renderSimulate();

    let older: Promise<unknown>;
    let newer: Promise<unknown>;
    await act(async () => {
      older = result.current.fetchData({ amount: "10" });
      newer = result.current.fetchData({ amount: "20" });
      await Promise.resolve();
    });
    await act(async () => {
      while (builds.length < 2) {
        // eslint-disable-next-line no-await-in-loop
        await Promise.resolve();
      }
      builds[1]();
      await newer;
      builds[0]();
      await older;
    });

    expect(result.current.state.data?.decoded?.sendAmount).toBe("20");
    const prepared =
      getTestStore()!.getState().transactionSubmission.transactionSimulation
        .preparedTransaction;
    expect(
      (
        TransactionBuilder.fromXDR(
          prepared!,
          MAINNET_NETWORK_DETAILS.networkPassphrase,
        ) as any
      ).operations[0].sendAmount,
    ).toBe("20.0000000");
  });

  it("does not report a decode failure from a superseded build", async () => {
    (captureException as jest.Mock).mockClear();
    let finishOlder: () => void = () => {};
    let builds = 0;
    const respond = answer(quotes);
    fetchBackendV2.mockImplementation(async (req: any) => {
      const reply = await respond(req);
      if (!req.path.startsWith("/swap/tx")) {
        return reply;
      }
      builds += 1;
      if (builds > 1) {
        return reply;
      }
      // The older build pays another account, so it fails to decode.
      const bad = {
        status: 200,
        body: {
          data: {
            xdr: classicBuild({
              ...JSON.parse(req.body),
              account: USDC_ISSUER,
            }),
            addsTrustline: false,
          },
        },
      };
      return new Promise((resolve) => {
        finishOlder = () => resolve(bad);
      });
    });
    const { result } = renderSimulate();

    let older: Promise<unknown>;
    await act(async () => {
      older = result.current.fetchData({ amount: "10" });
      await new Promise((r) => setTimeout(r, 0));
      await result.current.fetchData({ amount: "20" });
    });
    await act(async () => {
      finishOlder();
      await older;
    });

    expect(captureException).not.toHaveBeenCalled();
    expect(result.current.state.data?.decoded?.sendAmount).toBe("20");
  });

  it("stores nothing from a build that lands after unmount", async () => {
    let finishBuild: () => void = () => {};
    const respond = answer(quotes);
    fetchBackendV2.mockImplementation(async (req: any) => {
      const reply = await respond(req);
      if (!req.path.startsWith("/swap/tx")) {
        return reply;
      }
      return new Promise((resolve) => {
        finishBuild = () => resolve(reply);
      });
    });
    const { result, unmount } = renderSimulate();

    let pending: Promise<unknown>;
    await act(async () => {
      pending = result.current.fetchData({ amount: "10" });
      await new Promise((r) => setTimeout(r, 0));
    });
    unmount();
    await act(async () => {
      finishBuild();
      await pending;
    });

    const { transactionSimulation, transactionData } =
      getTestStore()!.getState().transactionSubmission;
    expect(transactionSimulation.preparedTransaction).toBeNull();
    expect(transactionData.swapQuotes).toBeFalsy();
  });

  it("drops the previous review's transaction when a rebuild fails", async () => {
    fetchBackendV2.mockImplementation(answer(quotes, { status: 503 }));
    const { result } = renderSimulate();
    getTestStore()!.dispatch(
      saveSimulation({ response: null, preparedTransaction: "OLD_XDR" }),
    );

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(
      getTestStore()!.getState().transactionSubmission.transactionSimulation
        .preparedTransaction,
    ).toBeNull();
  });

  it.each([502, 503])(
    "reports swaps unavailable when the build is a %s",
    async (status) => {
      fetchBackendV2.mockImplementation(answer(quotes, { status }));
      const { result } = renderSimulate();

      await act(async () => {
        await result.current.fetchData({ amount: "10" });
      });

      expect(result.current.state.error).toBe(
        "Swaps are temporarily unavailable",
      );
      expect(result.current.isQuoteExpired).toBe(false);
    },
  );

  it("reports swaps unavailable when the backend can't quote", async () => {
    fetchBackendV2.mockResolvedValue({ status: 503, body: {} });
    const { result } = renderSimulate();

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(result.current.state.error).toBe(
      "Swaps are temporarily unavailable",
    );
  });

  it("shows the live CTA's no-quote message when the re-quote is a 400", async () => {
    fetchBackendV2.mockResolvedValue({
      status: 400,
      body: { error: "account not found" },
    });
    const { result } = renderSimulate();

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(result.current.state.error).toBe("No quote available");
  });

  it("reports no path when the response has no route", async () => {
    fetchBackendV2.mockResolvedValue({
      status: 200,
      body: { data: { routes: [], unavailable: [] } },
    });
    const { result } = renderSimulate();

    await act(async () => {
      await result.current.fetchData({ amount: "10" });
    });

    expect(fetchBackendV2).toHaveBeenCalled();
    expect(result.current.state.error).toBe("No path found for swap.");
  });

  describe("with a stored live quote", () => {
    const opOf = (payload: any) =>
      (
        TransactionBuilder.fromXDR(
          payload.transactionXdr,
          MAINNET_NETWORK_DETAILS.networkPassphrase,
        ) as any
      ).operations[0];

    it("reuses it when it answered these exact inputs", async () => {
      fetchBackendV2.mockImplementation(answer(storedQuote.swapQuotes));
      const { result } = renderSimulate(storedQuote);

      let payload: any;
      await act(async () => {
        payload = await result.current.fetchData({ amount: "10" });
      });

      expect(quoteCalls(fetchBackendV2)).toHaveLength(0);
      // 1.6 less 1% slippage
      expect(opOf(payload).destMin).toBe("1.5840000");
    });

    it("re-quotes when the amount changed before the debounced quote landed", async () => {
      fetchBackendV2.mockImplementation(answer(quotes));
      const { result } = renderSimulate(storedQuote);

      await act(async () => {
        await result.current.fetchData({ amount: "100" });
      });

      expect(quoteCalls(fetchBackendV2)).toHaveLength(1);
      expect(JSON.parse(quoteCalls(fetchBackendV2)[0][0].body).amount).toBe(
        "100",
      );
    });

    it("re-quotes when the stored quote was for another destination", async () => {
      fetchBackendV2.mockImplementation(answer(quotes));
      const { result } = renderSimulate({
        ...storedQuote,
        swapQuoteKey: { ...storedKey, destAsset: AQUA },
      });

      await act(async () => {
        await result.current.fetchData({ amount: "10" });
      });

      expect(quoteCalls(fetchBackendV2)).toHaveLength(1);
    });

    it("re-quotes when the stored quote has no key (expired at submit)", async () => {
      fetchBackendV2.mockImplementation(answer(quotes));
      const { result } = renderSimulate({ ...storedQuote, swapQuoteKey: null });

      let payload: any;
      await act(async () => {
        payload = await result.current.fetchData({ amount: "10" });
      });

      expect(quoteCalls(fetchBackendV2)).toHaveLength(1);
      // fresh quote's 1.5, not the stored 1.6
      expect(opOf(payload).destMin).toBe("1.4850000");
    });
  });
});
