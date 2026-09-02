import {
  ICON_LOAD_BUDGET_MS,
  canLoadIcon,
  firstLoadableIconUrl,
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

  it("hands each probe only the budget that is left", async () => {
    const probe = jest.fn(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      return false;
    });

    await firstLoadableIconUrl([A, B], { budgetMs: 200, probe });

    const [, firstTimeout] = probe.mock.calls[0];
    const [, secondTimeout] = probe.mock.calls[1];
    expect(secondTimeout).toBeLessThan(firstTimeout as number);
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
