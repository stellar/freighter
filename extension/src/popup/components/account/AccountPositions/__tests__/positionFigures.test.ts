import {
  formatGainBadge,
  formatPositionGain,
} from "popup/components/account/AccountPositions/positionFigures";

describe("formatPositionGain", () => {
  it("reads like the design: dollars, then the share of principal", () => {
    expect(formatPositionGain(31.75, 0.025347)).toBe("+31.75 (2.53%)");
  });

  it("truncates the dollars to cents, like every account figure", () => {
    expect(formatPositionGain(0.129, 0.0002)).toBe("+0.12 (0.02%)");
  });

  it("groups thousands", () => {
    expect(formatPositionGain(1234.5, 0.1)).toBe("+1,234.50 (10.00%)");
  });

  it("keeps the dollars when the share cannot be measured", () => {
    expect(formatPositionGain(31.75, null)).toBe("+31.75");
  });

  it("is unknown when the interest is", () => {
    expect(formatPositionGain(null, 0.02)).toBeNull();
  });
});

describe("formatGainBadge", () => {
  it("signs the share of principal", () => {
    expect(formatGainBadge(0.0254)).toBe("+2.54%");
    expect(formatGainBadge(-0.01)).toBe("-1.00%");
  });

  it("is unknown when the share is", () => {
    expect(formatGainBadge(null)).toBeNull();
  });
});
