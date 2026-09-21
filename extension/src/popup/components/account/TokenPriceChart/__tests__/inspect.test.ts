import { computeInspectedChange, nearestCoordinateIndex } from "../inspect";

describe("nearestCoordinateIndex", () => {
  const xs = [0, 100, 200, 300];
  it("returns -1 for an empty series", () => {
    expect(nearestCoordinateIndex([], 50)).toBe(-1);
  });
  it("snaps to the nearest plotted x", () => {
    expect(nearestCoordinateIndex(xs, 40)).toBe(0);
    expect(nearestCoordinateIndex(xs, 60)).toBe(1);
    expect(nearestCoordinateIndex(xs, 199)).toBe(2);
  });
  it("clamps outside the plotted domain", () => {
    expect(nearestCoordinateIndex(xs, -50)).toBe(0);
    expect(nearestCoordinateIndex(xs, 900)).toBe(3);
  });
  it("resolves a tie to the LATER point", () => {
    expect(nearestCoordinateIndex(xs, 150)).toBe(2);
  });
  it("resolves duplicate x values (the clock-skew clamp) to the last of them", () => {
    expect(nearestCoordinateIndex([0, 100, 100, 100], 100)).toBe(3);
    expect(nearestCoordinateIndex([0, 100, 100, 100], 90)).toBe(3);
  });
});

describe("computeInspectedChange", () => {
  it("is close-to-close from the first point to the inspected one", () => {
    expect(computeInspectedChange({ t: 0, p: "0.20" }, { t: 900, p: "0.26" })).toEqual({
      absolute: "0.06",
      percent: "30.00",
    });
  });
  it("carries the sign on a fall and rounds percent to 2dp like the server", () => {
    expect(computeInspectedChange({ t: 0, p: "3" }, { t: 900, p: "2.5" })).toEqual({
      absolute: "-0.5",
      percent: "-16.67",
    });
  });
  it("is zero at the first point", () => {
    expect(computeInspectedChange({ t: 0, p: "1.5" }, { t: 0, p: "1.5" })).toEqual({
      absolute: "0",
      percent: "0.00",
    });
  });
  it("reports 0.00% when the start price is zero rather than dividing by it", () => {
    expect(computeInspectedChange({ t: 0, p: "0" }, { t: 900, p: "0.5" })).toEqual({
      absolute: "0.5",
      percent: "0.00",
    });
  });
  it("never uses exponent notation for dust prices", () => {
    expect(computeInspectedChange({ t: 0, p: "0.00000010" }, { t: 900, p: "0.00000030" }).absolute).toBe(
      "0.0000002",
    );
  });
});
