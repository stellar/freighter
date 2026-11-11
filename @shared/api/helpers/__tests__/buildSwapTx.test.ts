import { captureException } from "@sentry/browser";

import { buildSwapTx, SwapTxError } from "../buildSwapTx";
import { fetchBackendV2 } from "../fetchBackendV2";

jest.mock("../fetchBackendV2");
jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));
const mockedFetch = fetchBackendV2 as jest.Mock;

const ACCOUNT = "GCXRLIZUQNZ3YYJDGX6Z445P7FG5WXT7UILBO5CFIYYM7Z7YTIOELC6O";
const USDC = "USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN";

const body = {
  account: ACCOUNT,
  source: "classic",
  fromAsset: "XLM",
  toAsset: USDC,
  amount: "100",
  minOut: "17.15",
  fee: "0.00001",
  slippage: "2",
  timeout: 180,
  paths: [
    { share: "1", hops: [{ venue: "stellar-dex", from: "XLM", to: USDC }] },
  ],
};

describe("buildSwapTx", () => {
  afterEach(() => jest.clearAllMocks());

  it("POSTs the route to /swap/tx with the network in the query", async () => {
    mockedFetch.mockResolvedValue({
      status: 200,
      body: { data: { xdr: "AAAA", addsTrustline: false } },
    });

    await buildSwapTx({ network: "PUBLIC", ...body });

    expect(mockedFetch).toHaveBeenCalledWith({
      method: "POST",
      path: "/swap/tx?network=PUBLIC",
      body: JSON.stringify(body),
    });
  });

  it("returns the unwrapped response on 200", async () => {
    const data = { xdr: "AAAA", addsTrustline: true };
    mockedFetch.mockResolvedValue({ status: 200, body: { data } });

    await expect(buildSwapTx({ network: "PUBLIC", ...body })).resolves.toEqual(
      data,
    );
  });

  it("rejects a 409 as a moved quote without reporting it", async () => {
    mockedFetch.mockResolvedValue({
      status: 409,
      body: { error: "quote_moved" },
    });

    const err = await buildSwapTx({ network: "PUBLIC", ...body }).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(SwapTxError);
    expect(err.kind).toBe("quoteMoved");
    expect(captureException).not.toHaveBeenCalled();
  });

  it("rejects a 400 as bad input", async () => {
    mockedFetch.mockResolvedValue({ status: 400, body: { error: "x" } });

    const err = await buildSwapTx({ network: "PUBLIC", ...body }).catch(
      (e) => e,
    );
    expect(err.kind).toBe("badRequest");
    expect(captureException).not.toHaveBeenCalled();
  });

  it.each([502, 503, 401, 500])(
    "rejects a %s as swaps unavailable",
    async (status) => {
      mockedFetch.mockResolvedValue({ status, body: { error: "x" } });

      const err = await buildSwapTx({ network: "PUBLIC", ...body }).catch(
        (e) => e,
      );
      expect(err).toBeInstanceOf(SwapTxError);
      expect(err.kind).toBe("unavailable");
      expect(captureException).toHaveBeenCalledTimes(1);
    },
  );

  it("reports an unreachable backend as swaps unavailable", async () => {
    mockedFetch.mockRejectedValue(new TypeError("Failed to fetch"));

    const err = await buildSwapTx({ network: "PUBLIC", ...body }).catch(
      (e) => e,
    );
    expect(err.kind).toBe("unavailable");
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("rejects a 200 without an xdr as swaps unavailable", async () => {
    mockedFetch.mockResolvedValue({ status: 200, body: { data: {} } });

    const err = await buildSwapTx({ network: "PUBLIC", ...body }).catch(
      (e) => e,
    );
    expect(err.kind).toBe("unavailable");
  });
});
