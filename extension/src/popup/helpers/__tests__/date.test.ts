import {
  formatClockTime,
  formatDetailTimestamp,
  formatLegacyDetailDate,
  formatMonthDay,
  formatMonthDayYear,
  formatMonthLabel,
  getMonthYearKey,
} from "popup/helpers/date";

/**
 * The formatters render in local time and jest does not pin `TZ`, so build the
 * fixtures from local-time components: whatever zone the suite runs in, this
 * instant is 2:33 PM on Apr 8 2024 locally.
 */
const localIso = (
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
) => new Date(year, monthIndex, day, hour, minute).toISOString();

const TIMESTAMP = localIso(2024, 3, 8, 14, 33);

describe("date formatters", () => {
  it("formats a row date as 'MMM D' with no zero padding", () => {
    expect(formatMonthDay(TIMESTAMP)).toBe("Apr 8");
    expect(formatMonthDay(localIso(2024, 4, 27, 12, 0))).toBe("May 27");
  });

  it("formats a date with the year", () => {
    expect(formatMonthDayYear(TIMESTAMP)).toBe("Apr 8, 2024");
  });

  it("formats a 12-hour clock time", () => {
    expect(formatClockTime(TIMESTAMP)).toBe("2:33 PM");
    expect(formatClockTime(localIso(2024, 3, 8, 0, 5))).toBe("12:05 AM");
  });

  it("formats the detail sheet timestamp", () => {
    expect(formatDetailTimestamp(TIMESTAMP)).toBe("Apr 8, 2024 · 2:33pm");
  });

  it("formats the legacy detail date without a comma", () => {
    expect(formatLegacyDetailDate(TIMESTAMP)).toBe("Apr 08 2024");
  });

  it("labels a month index, January being 0", () => {
    expect(formatMonthLabel(0)).toBe("January");
    expect(formatMonthLabel(11)).toBe("December");
  });

  it("labels nothing for a month index that isn't one", () => {
    expect(formatMonthLabel(NaN)).toBe("");
    expect(formatMonthLabel(12)).toBe("");
    expect(formatMonthLabel(-1)).toBe("");
  });

  it("keys a timestamp by month and year", () => {
    expect(getMonthYearKey(TIMESTAMP)).toBe("3:2024");
  });

  it("keys an unparseable timestamp so it renders no month header", () => {
    const key = getMonthYearKey("not a date");
    expect(key).toBe("NaN:NaN");
    // how the views derive the header — must not resolve to a real month
    expect(formatMonthLabel(Number(key.split(":")[0]))).toBe("");
  });

  it("returns an empty string for an unparseable timestamp", () => {
    for (const format of [
      formatMonthDay,
      formatMonthDayYear,
      formatClockTime,
      formatDetailTimestamp,
      formatLegacyDetailDate,
    ]) {
      expect(format("not a date")).toBe("");
      expect(format("")).toBe("");
    }
  });

  it("does not fall back to the runtime locale", () => {
    // An unpinned toLocaleString() reads the *browser's* locale, which is how
    // the legacy detail modal rendered "08:33 undefined" for a de-DE user.
    const spy = jest
      .spyOn(Date.prototype, "toLocaleString")
      .mockImplementation(() => {
        throw new Error("unpinned locale formatting");
      });

    expect(formatMonthDay(TIMESTAMP)).toBe("Apr 8");
    expect(formatClockTime(TIMESTAMP)).toBe("2:33 PM");
    expect(formatDetailTimestamp(TIMESTAMP)).toBe("Apr 8, 2024 · 2:33pm");

    spy.mockRestore();
  });
});
