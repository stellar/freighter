/**
 * The day of an Earn event, in the app's language: "Aug 28 2026", or
 * "Aug 28" without the year. No comma before the year, as History's details
 * write it.
 */
export const formatEarnDay = (date: Date, language: string, withYear = true) =>
  date
    .toLocaleDateString(language, {
      month: "short",
      day: "numeric",
      ...(withYear ? { year: "numeric" } : {}),
    })
    .replace(/,/g, "");

/**
 * When a deposit landed, in the app's language, the way mobile formats the
 * same receipt: "Aug 28 2026 · 2:33pm" in English, "28 de ago. de 2026 ·
 * 14:33" in Portuguese. No comma before the year, as History's details write it.
 */
export const formatDepositDate = (createdAt: string, language: string) => {
  const date = new Date(createdAt);
  const day = formatEarnDay(date, language);
  const time = date
    .toLocaleTimeString(language, { hour: "numeric", minute: "2-digit" })
    // The design's "2:33pm". Engines differ on the space before the day
    // period (some use a narrow no-break one), so any whitespace goes.
    .replace(/\s/g, "")
    .toLowerCase();
  return `${day} · ${time}`;
};
