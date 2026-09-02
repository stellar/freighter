import {
  ICON_LOAD_BUDGET_MS,
  ICON_LOOKUP_CONCURRENCY,
  canLoadIcon,
  firstLoadableIconUrl,
  mapWithConcurrency,
} from "../iconProbe";

const A = "https://a.example/icon.png";
const B = "https://b.example/icon.png";
const C = "https://c.example/icon.png";

/** Probe stub that reports success only for the urls named as loadable. */
const probeThatLoads = (...loadable: string[]) =>
  jest.fn(async (url: string) => loadable.includes(url));

describe("firstLoadableIconUrl", () => {
  it("returns the first candidate that loads", async () => {
    const probe = probeThatLoads(B);

    const result = await firstLoadableIconUrl([A, B, C], { probe });

    expect(result).toEqual(B);
  });

  it("stops probing once a candidate loads", async () => {
    const probe = probeThatLoads(A, B, C);

    await firstLoadableIconUrl([A, B, C], { probe });

    expect(probe).toHaveBeenCalledTimes(1);
    expect(probe).toHaveBeenCalledWith(A, expect.any(Number));
  });

  it("returns undefined when no candidate loads", async () => {
    const result = await firstLoadableIconUrl([A, B], {
      probe: probeThatLoads(),
    });

    expect(result).toBeUndefined();
  });

  it("returns undefined for an empty candidate list without probing", async () => {
    const probe = probeThatLoads(A);

    const result = await firstLoadableIconUrl([], { probe });

    expect(result).toBeUndefined();
    expect(probe).not.toHaveBeenCalled();
  });

  it("spends one shared budget across candidates rather than one per candidate", async () => {
    // Each probe burns more than the whole budget, so only the first candidate
    // should ever be attempted no matter how many are queued.
    const probe = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      return false;
    });

    const result = await firstLoadableIconUrl([A, B, C], {
      budgetMs: 20,
      probe,
    });

    expect(result).toBeUndefined();
    expect(probe).toHaveBeenCalledTimes(1);
  });

  it("never hands a probe more time than the budget has left", async () => {
    const probe = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return false;
    });

    await firstLoadableIconUrl([A, B], { budgetMs: 200, probe });

    for (const [, timeoutMs] of probe.mock.calls) {
      expect(timeoutMs).toBeLessThanOrEqual(200);
    }
  });
});

describe("canLoadIcon", () => {
  const originalImage = global.Image;

  /**
   * Stands in for the browser's HTMLImageElement: records the assigned src and
   * lets each test decide whether that src "loads", so no network is involved.
   */
  const stubImage = (outcome: "load" | "error" | "never") => {
    const instances: any[] = [];
    (global as any).Image = class {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_value: string) {
        instances.push(this);
        if (outcome === "never") {
          return;
        }
        setTimeout(() => {
          if (outcome === "load") {
            this.onload?.();
          } else {
            this.onerror?.();
          }
        }, 0);
      }
    };
    return instances;
  };

  afterEach(() => {
    (global as any).Image = originalImage;
  });

  it("resolves true when the image loads", async () => {
    stubImage("load");

    await expect(canLoadIcon(A, 100)).resolves.toBe(true);
  });

  it("resolves false when the image errors", async () => {
    stubImage("error");

    await expect(canLoadIcon(A, 100)).resolves.toBe(false);
  });

  it("resolves false when the image never settles within the timeout", async () => {
    stubImage("never");

    await expect(canLoadIcon(A, 20)).resolves.toBe(false);
  });
});

describe("ICON_LOAD_BUDGET_MS", () => {
  it("leaves headroom over a typical icon fetch without being a visible stall", () => {
    // Measured: both real USDT0 candidates fully load in 130-300ms including
    // cold DNS + TLS for a ~8KB png.
    expect(ICON_LOAD_BUDGET_MS).toBeGreaterThanOrEqual(1000);
    expect(ICON_LOAD_BUDGET_MS).toBeLessThanOrEqual(1500);
  });
});

describe("mapWithConcurrency", () => {
  const settleAfter = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  it("returns results in input order, not completion order", async () => {
    const results = await mapWithConcurrency([30, 10, 20], 3, async (delay) => {
      await settleAfter(delay);
      return delay;
    });

    expect(results).toEqual([30, 10, 20]);
  });

  it("never runs more than the limit at once", async () => {
    let inFlight = 0;
    let peak = 0;

    await mapWithConcurrency(
      Array.from({ length: 12 }, (_, i) => i),
      3,
      async () => {
        inFlight += 1;
        peak = Math.max(peak, inFlight);
        await settleAfter(5);
        inFlight -= 1;
        return null;
      },
    );

    expect(peak).toEqual(3);
  });

  it("runs every item even when there are more items than workers", async () => {
    const seen: number[] = [];

    await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (item) => {
      seen.push(item);
      return item;
    });

    expect(seen.sort()).toEqual([1, 2, 3, 4, 5]);
  });

  it("handles an empty list without spawning workers", async () => {
    const fn = jest.fn();

    const results = await mapWithConcurrency([], 4, fn);

    expect(results).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });

  it("keeps icon lookups concurrent enough to stay off the critical path", () => {
    expect(ICON_LOOKUP_CONCURRENCY).toBeGreaterThan(1);
  });
});

describe("firstLoadableIconUrl candidate fairness", () => {
  it("still attempts a later candidate when an earlier one uses its whole slice", async () => {
    // The reported bug is a throttled gateway. If the first candidate can spend
    // the entire budget hanging, a healthy second candidate is never reached —
    // which is the failure this whole change exists to prevent.
    const probe = jest.fn(async (url: string, timeoutMs: number) => {
      if (url === A) {
        await new Promise((resolve) => setTimeout(resolve, timeoutMs));
        return false;
      }
      return true;
    });

    const result = await firstLoadableIconUrl([A, B], {
      budgetMs: 200,
      probe,
    });

    expect(result).toEqual(B);
    expect(probe).toHaveBeenCalledTimes(2);
  });

  it("shares the budget out so every candidate gets a turn", async () => {
    const probe = jest.fn(async () => false);

    await firstLoadableIconUrl([A, B, C], { budgetMs: 300, probe });

    expect(probe).toHaveBeenCalledTimes(3);
    // The first candidate is held to a share rather than the whole budget;
    // candidates that answer instantly leave their unused time to the rest.
    const [, firstTimeout] = probe.mock.calls[0];
    expect(firstTimeout).toBeLessThan(300);
  });
});
