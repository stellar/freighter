import type { TFunction } from "i18next";

import pt from "popup/locales/pt/translation.json";
import { formatInspectedTimestamp } from "popup/components/account/TokenPriceChart";

const interpolate = (template: string, options?: Record<string, unknown>) =>
  template.replace(/{{(\w+)}}/g, (_match, name: string) =>
    String(options?.[name] ?? ""),
  );

const enT = ((key: string, options?: Record<string, unknown>) =>
  interpolate(key, options)) as unknown as TFunction;

const ptT = ((key: string, options?: Record<string, unknown>) =>
  interpolate(
    (pt as Record<string, string>)[key] ?? key,
    options,
  )) as unknown as TFunction;

// 2025-09-21, midday UTC, so the calendar day is the same in any test timezone.
const UNIX_SECONDS = Date.UTC(2025, 8, 21, 12, 3) / 1000;

describe("formatInspectedTimestamp", () => {
  it("joins date and lower-case time for an intraday range", () => {
    const text = formatInspectedTimestamp({
      unixSeconds: UNIX_SECONDS,
      range: "1D",
      language: "en-US",
      t: enT,
    });
    expect(text).toContain("Sep 21");
    expect(text).toContain(" at ");
    expect(text).toMatch(/\d{1,2}:03\s(am|pm)$/);
    expect(text).not.toContain("2025");
  });

  it("uses the time part on 1H too", () => {
    expect(
      formatInspectedTimestamp({
        unixSeconds: UNIX_SECONDS,
        range: "1H",
        language: "en-US",
        t: enT,
      }),
    ).toContain(" at ");
  });

  it("shows the date alone on 1W", () => {
    const text = formatInspectedTimestamp({
      unixSeconds: UNIX_SECONDS,
      range: "1W",
      language: "en-US",
      t: enT,
    });
    expect(text).toContain("Sep 21");
    expect(text).not.toContain(" at ");
    expect(text).not.toContain("2025");
  });

  it.each(["1Y", "ALL"] as const)(
    "adds the year and no time on %s",
    (range) => {
      const text = formatInspectedTimestamp({
        unixSeconds: UNIX_SECONDS,
        range,
        language: "en-US",
        t: enT,
      });
      expect(text).toContain("2025");
      expect(text).not.toContain(" at ");
      expect(text).not.toMatch(/am|pm/i);
    },
  );

  it("formats in the given language through the translated template", () => {
    const text = formatInspectedTimestamp({
      unixSeconds: UNIX_SECONDS,
      range: "1D",
      language: "pt",
      t: ptT,
    });
    expect(text).toContain(" às ");
    expect(text).toContain("21");
  });
});
