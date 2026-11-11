import { captureException } from "@sentry/browser";

import { MAINNET_NETWORK_DETAILS } from "@shared/constants/stellar";
import { discoverFundedIndices } from "../helpers/discover-funded-indices";

jest.mock("@sentry/browser", () => ({ captureException: jest.fn() }));

const pk = (i: number) => `PK${i}`;
const wallet = {
  getPublicKey: (i: number) => pk(i),
  getSecret: (i: number) => `SK${i}`,
} as any;

const mockFetch = (handler: (publicKey: string) => Promise<unknown>) => {
  const fn = jest.fn((url: string) => {
    const publicKey = url.split("/accounts/")[1];
    return handler(publicKey).then((body) => ({
      json: () => Promise.resolve(body),
    }));
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
};

describe("discoverFundedIndices", () => {
  beforeEach(() => {
    (captureException as jest.Mock).mockClear();
  });

  it("returns funded indices in ascending order", async () => {
    const delays: Record<string, number> = {
      [pk(7)]: 5,
      [pk(2)]: 30,
      [pk(49)]: 1,
    };
    mockFetch(
      (publicKey) =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve(
                publicKey in delays
                  ? { account_id: publicKey }
                  : { status: 404 },
              ),
            delays[publicKey] ?? 0,
          ),
        ),
    );

    expect(await discoverFundedIndices({ wallet, from: 1, to: 49 })).toEqual([
      2, 7, 49,
    ]);
  });

  it("treats a 404 body as not funded", async () => {
    mockFetch(async () => ({ status: 404 }));

    expect(await discoverFundedIndices({ wallet, from: 1, to: 5 })).toEqual([]);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("skips an index whose lookup throws and reports it", async () => {
    mockFetch(async (publicKey) => {
      if (publicKey === pk(3)) throw new Error("network down");
      return publicKey === pk(4) ? { account_id: publicKey } : { status: 404 };
    });

    expect(await discoverFundedIndices({ wallet, from: 1, to: 5 })).toEqual([
      4,
    ]);
    expect(captureException).toHaveBeenCalledTimes(1);
  });

  it("queries mainnet Horizon", async () => {
    const fetchMock = mockFetch(async () => ({ status: 404 }));

    await discoverFundedIndices({ wallet, from: 1, to: 10 });

    expect(fetchMock).toHaveBeenCalledTimes(10);
    fetchMock.mock.calls.forEach(([url]) => {
      expect(
        url.startsWith(`${MAINNET_NETWORK_DETAILS.networkUrl}/accounts/`),
      ).toBe(true);
    });
  });

  it("keeps the requests in flight bounded", async () => {
    let inFlight = 0;
    let peak = 0;
    mockFetch(async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 2));
      inFlight -= 1;
      return { status: 404 };
    });

    await discoverFundedIndices({ wallet, from: 1, to: 49 });

    expect(peak).toBeLessThanOrEqual(10);
    // More than one at a time, so the lookups really run in parallel.
    expect(peak).toBeGreaterThan(1);
  });

  it("gives up on a lookup that stalls past the timeout and returns the rest", async () => {
    // AbortSignal.timeout runs on the runtime's own timer, which fake timers
    // don't drive. Hand out signals this test can abort instead.
    const controllers: AbortController[] = [];
    const timeoutSpy = jest
      .spyOn(AbortSignal, "timeout")
      .mockImplementation(() => {
        const controller = new AbortController();
        controllers.push(controller);
        return controller.signal;
      });
    let stalled: () => void = () => {};
    const isStalled = new Promise<void>((r) => {
      stalled = r;
    });
    global.fetch = jest.fn(
      (url: string, { signal }: { signal: AbortSignal }) => {
        const publicKey = url.split("/accounts/")[1];
        if (publicKey === pk(2)) {
          // Never resolves; only the abort ends it.
          return new Promise((_, reject) => {
            signal.addEventListener("abort", () =>
              reject(new DOMException("timed out", "TimeoutError")),
            );
            stalled();
          });
        }
        return Promise.resolve({
          json: () =>
            Promise.resolve(
              publicKey === pk(1) || publicKey === pk(3)
                ? { account_id: publicKey }
                : { status: 404 },
            ),
        });
      },
    ) as unknown as typeof fetch;

    try {
      const result = discoverFundedIndices({ wallet, from: 1, to: 3 });
      await isStalled;
      expect(timeoutSpy).toHaveBeenCalledWith(5000);
      // Fire the timeouts. Only index 2's lookup is still waiting on one.
      controllers.forEach((controller) => controller.abort());

      expect(await result).toEqual([1, 3]);
      expect(captureException).toHaveBeenCalledTimes(1);
    } finally {
      timeoutSpy.mockRestore();
    }
  });
});
