import { SecurityLevel, mergeSecurityLevels } from "../blockaid";

describe("mergeSecurityLevels", () => {
  it("returns null when nothing is flagged", () => {
    expect(
      mergeSecurityLevels([null, undefined, SecurityLevel.SAFE]),
    ).toBeNull();
  });

  it("returns the only flagged level", () => {
    expect(mergeSecurityLevels([null, SecurityLevel.SUSPICIOUS])).toBe(
      SecurityLevel.SUSPICIOUS,
    );
  });

  it("escalates to the most severe level (MALICIOUS > SUSPICIOUS)", () => {
    expect(
      mergeSecurityLevels([SecurityLevel.SUSPICIOUS, SecurityLevel.MALICIOUS]),
    ).toBe(SecurityLevel.MALICIOUS);
  });

  it("ranks SUSPICIOUS above UNABLE_TO_SCAN", () => {
    expect(
      mergeSecurityLevels([
        SecurityLevel.UNABLE_TO_SCAN,
        SecurityLevel.SUSPICIOUS,
      ]),
    ).toBe(SecurityLevel.SUSPICIOUS);
  });

  it("surfaces UNABLE_TO_SCAN when it is the only non-safe verdict", () => {
    expect(
      mergeSecurityLevels([SecurityLevel.SAFE, SecurityLevel.UNABLE_TO_SCAN]),
    ).toBe(SecurityLevel.UNABLE_TO_SCAN);
  });

  it("never returns SAFE (a clean set is null, not SAFE)", () => {
    expect(
      mergeSecurityLevels([SecurityLevel.SAFE, SecurityLevel.SAFE]),
    ).toBeNull();
  });
});
