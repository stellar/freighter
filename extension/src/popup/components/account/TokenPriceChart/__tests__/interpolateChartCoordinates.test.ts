import {
  ChartCoordinate,
  easeOutCubic,
  getChartCoordinates,
  interpolateChartCoordinates,
} from "../LineChart";
import { CHART_VIEWBOX_WIDTH } from "../constants";

// A rising two-point line across the full width, and a V-shaped three-point
// series — different point counts and different x positions, which is the
// whole reason the morph cannot assume a shared grid.
const RISING: ChartCoordinate[] = [
  { x: 0, y: 132 },
  { x: 320, y: 8 },
];
const VALLEY: ChartCoordinate[] = [
  { x: 0, y: 8 },
  { x: 160, y: 132 },
  { x: 320, y: 8 },
];

describe("easeOutCubic", () => {
  it("pins both ends and eases out in between", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    // 1 - (1 - 0.5)^3 = 0.875: most of the distance is covered early.
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 10);
    expect(easeOutCubic(0.25)).toBeGreaterThan(0.25);
  });

  it("clamps progress outside [0, 1]", () => {
    expect(easeOutCubic(-2)).toBe(0);
    expect(easeOutCubic(4)).toBe(1);
  });
});

describe("interpolateChartCoordinates", () => {
  it("settles EXACTLY on the incoming series' real geometry", () => {
    // The property the whole design rests on: at p = 1 the frame is the
    // incoming coordinates themselves, not a resampled approximation of them.
    // A settled morph must be byte-identical to a hard switch.
    const frame = interpolateChartCoordinates({
      from: RISING,
      to: VALLEY,
      progress: 1,
    });

    expect(frame).toEqual(VALLEY);
    expect(frame).toHaveLength(VALLEY.length);
  });

  it("settles exactly on real, unrounded geometry from getChartCoordinates", () => {
    const from = getChartCoordinates({
      points: [
        { t: 0, p: "1.00" },
        { t: 900, p: "2.00" },
      ],
      resolutionSeconds: 900,
      nowSeconds: 5000,
    });
    const to = getChartCoordinates({
      points: [
        { t: 0, p: "3.13" },
        { t: 900, p: "1.07" },
        { t: 1800, p: "2.71" },
        { t: 2700, p: "1.99" },
      ],
      resolutionSeconds: 900,
      nowSeconds: 9000,
    });

    expect(interpolateChartCoordinates({ from, to, progress: 1 })).toEqual(to);
  });

  it("starts from the outgoing shape, sampled at the incoming x positions", () => {
    const frame = interpolateChartCoordinates({
      from: RISING,
      to: VALLEY,
      progress: 0,
    });

    // RISING runs (0, 132) → (320, 8); at VALLEY's midpoint x = 160 it is 70.
    expect(frame).toEqual([
      { x: 0, y: 132 },
      { x: 160, y: 70 },
      { x: 320, y: 8 },
    ]);
  });

  it("clamps to the outgoing series' end y outside its domain", () => {
    // `from` covers only the left third; the rest of `to`'s domain has no
    // outgoing geometry to sample, so it holds the last y rather than
    // extrapolating off the viewBox.
    const from: ChartCoordinate[] = [
      { x: 40, y: 100 },
      { x: 120, y: 20 },
    ];
    const to: ChartCoordinate[] = [
      { x: 0, y: 10 },
      { x: 80, y: 10 },
      { x: 320, y: 10 },
    ];

    const frame = interpolateChartCoordinates({ from, to, progress: 0 });

    expect(frame[0]).toEqual({ x: 0, y: 100 });
    expect(frame[1]).toEqual({ x: 80, y: 60 });
    expect(frame[2]).toEqual({ x: 320, y: 20 });
  });

  it("interpolates linearly between the two shapes", () => {
    const frame = interpolateChartCoordinates({
      from: RISING,
      to: VALLEY,
      progress: 0.5,
    });

    expect(frame).toEqual([
      { x: 0, y: 70 },
      { x: 160, y: 101 },
      { x: 320, y: 8 },
    ]);
  });

  it("takes x from the incoming series only, keeping it monotonic", () => {
    [0, 0.13, 0.5, 0.99, 1].forEach((progress) => {
      const frame = interpolateChartCoordinates({
        from: VALLEY,
        to: RISING,
        progress,
      });
      expect(frame.map((coord) => coord.x)).toEqual([0, CHART_VIEWBOX_WIDTH]);
      frame.forEach((coord, i) => {
        if (i > 0) {
          expect(coord.x).toBeGreaterThanOrEqual(frame[i - 1].x);
        }
      });
    });
  });

  it("clamps progress outside [0, 1]", () => {
    expect(
      interpolateChartCoordinates({ from: RISING, to: VALLEY, progress: -1 }),
    ).toEqual(
      interpolateChartCoordinates({ from: RISING, to: VALLEY, progress: 0 }),
    );
    expect(
      interpolateChartCoordinates({ from: RISING, to: VALLEY, progress: 2 }),
    ).toEqual(VALLEY);
  });

  it("does not tween when either series has fewer than two points", () => {
    const single: ChartCoordinate[] = [{ x: 0, y: 70 }];

    // No outgoing line to morph from, and no incoming line to morph to: the
    // settled geometry is the only honest thing to draw.
    expect(
      interpolateChartCoordinates({ from: single, to: VALLEY, progress: 0 }),
    ).toEqual(VALLEY);
    expect(
      interpolateChartCoordinates({ from: [], to: VALLEY, progress: 0 }),
    ).toEqual(VALLEY);
    expect(
      interpolateChartCoordinates({ from: RISING, to: single, progress: 0 }),
    ).toEqual(single);
    expect(
      interpolateChartCoordinates({ from: RISING, to: [], progress: 0 }),
    ).toEqual([]);
  });

  it("survives the clock-skew clamp's duplicate x without producing NaN", () => {
    // The monotonic clamp can land the final point exactly on its
    // predecessor, so a bracketing pair can be zero-width. Dividing by that
    // span would give NaN and blank the chart mid-morph.
    const from: ChartCoordinate[] = [
      { x: 0, y: 10 },
      { x: 320, y: 90 },
      { x: 320, y: 40 },
    ];

    const frame = interpolateChartCoordinates({
      from,
      to: VALLEY,
      progress: 0,
    });

    frame.forEach((coord) => expect(Number.isNaN(coord.y)).toBe(false));
    // At the duplicated x the later point wins — the one actually drawn last.
    expect(frame[2]).toEqual({ x: 320, y: 40 });
  });

  it("samples the LAST of an internal duplicate x, which is what the line shows", () => {
    // The clock-skew clamp can land two points on one x. The polyline paints
    // that as a vertical segment and carries on from the later point, so the
    // morph has to start from that y — sampling the earlier one makes the
    // line jump on the first frame. The duplicate is INTERNAL on purpose:
    // at either end the domain clamps short-circuit before the search runs,
    // which is how this went unnoticed.
    const stepped: ChartCoordinate[] = [
      { x: 0, y: 100 },
      { x: 160, y: 80 },
      { x: 160, y: 20 },
      { x: 320, y: 10 },
    ];

    const frame = interpolateChartCoordinates({
      from: stepped,
      to: VALLEY,
      progress: 0,
    });

    frame.forEach((coord) => expect(Number.isNaN(coord.y)).toBe(false));
    // VALLEY's middle point sits at x = 160, exactly on the duplicate.
    expect(frame[1]).toEqual({ x: 160, y: 20 });
  });

  it("still interpolates an x that lands exactly on a non-repeated point", () => {
    // Guards the strict comparison above: walking past an exact match must
    // not skip the bracket it belongs to.
    const frame = interpolateChartCoordinates({
      from: VALLEY,
      to: [
        { x: 0, y: 0 },
        { x: 160, y: 0 },
        { x: 320, y: 0 },
      ],
      progress: 0,
    });

    expect(frame[1]).toEqual({ x: 160, y: 132 });
  });

  it("returns fresh objects rather than aliasing the incoming coordinates", () => {
    const frame = interpolateChartCoordinates({
      from: RISING,
      to: VALLEY,
      progress: 1,
    });

    expect(frame).not.toBe(VALLEY);
    frame.forEach((coord, i) => expect(coord).not.toBe(VALLEY[i]));
  });
});
