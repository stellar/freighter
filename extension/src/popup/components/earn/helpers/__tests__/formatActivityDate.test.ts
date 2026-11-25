import { formatActivityDate } from "popup/components/earn/helpers/formatActivityDate";

// Midday UTC, so the calendar day is the same in every test runner's zone.
const AUG_28 = "2026-08-28T12:00:00Z";
const NOW = new Date("2026-11-24T12:00:00Z");

describe("formatActivityDate", () => {
  it("reads like the design within the current year", () => {
    expect(formatActivityDate(AUG_28, "en", NOW)).toBe("Aug 28");
  });

  it("follows the app's language", () => {
    expect(formatActivityDate(AUG_28, "pt", NOW)).toBe("28 de ago.");
  });

  it("adds the year outside the current one, where the day is ambiguous", () => {
    expect(formatActivityDate("2025-08-28T12:00:00Z", "en", NOW)).toBe(
      "Aug 28, 2025",
    );
  });

  it("returns nothing for a date it cannot read", () => {
    expect(formatActivityDate("not a date", "en", NOW)).toBe("");
  });
});
