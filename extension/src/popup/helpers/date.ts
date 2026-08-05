/**
 * Date/time display formatting for the popup.
 *
 * Every formatter here pins the "en-US" locale rather than relying on the
 * runtime default: the extension ships English only (see
 * `popup/helpers/localizationConfig.ts`), but `toLocaleString()` with no locale
 * follows the *browser's* locale, so an unpinned formatter renders differently
 * for a user whose Chrome is set to de-DE than the layout was designed for.
 *
 * Formatters take an ISO timestamp string (what the history APIs return) and
 * render "" for an unparseable one, so a bad value can't surface as
 * "Invalid Date". `getMonthYearKey` is the exception — it is a grouping key, not
 * display text, and documents its own behavior.
 */

const parse = (createdAt: string) => {
  const date = new Date(Date.parse(createdAt));
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "2024-05-27T14:33:00Z" → "May 27" — history row dates. */
export const formatMonthDay = (createdAt: string) => {
  const date = parse(createdAt);
  if (!date) {
    return "";
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

/** "2024-04-08T14:33:00Z" → "Apr 8, 2024" */
export const formatMonthDayYear = (createdAt: string) => {
  const date = parse(createdAt);
  if (!date) {
    return "";
  }
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

/** "2024-04-08T14:33:00Z" → "2:33 PM" */
export const formatClockTime = (createdAt: string) => {
  const date = parse(createdAt);
  if (!date) {
    return "";
  }
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

/** "2024-04-08T14:33:00Z" → "Apr 8, 2024 · 2:33pm" — detail sheet header. */
export const formatDetailTimestamp = (createdAt: string) => {
  const day = formatMonthDayYear(createdAt);
  if (!day) {
    return "";
  }
  const time = formatClockTime(createdAt).replace(/\s/g, "").toLowerCase();
  return `${day} · ${time}`;
};

/**
 * "2025-03-21T16:28:00Z" → "Mar 21 2025"
 *
 * Only for the legacy `TransactionDetail` modal, which renders the date without
 * a comma. Delete this along with the modal when `use_history_v2` defaults on.
 */
export const formatLegacyDetailDate = (createdAt: string) => {
  const date = parse(createdAt);
  if (!date) {
    return "";
  }
  // toDateString() is always English regardless of locale: "Fri Mar 21 2025"
  return date.toDateString().split(" ").slice(1).join(" ");
};

/**
 * Month index → full month name, for the history list's month headers.
 * Note: January is 0, December is 11.
 *
 * Callers parse the index out of a `getMonthYearKey` string, so an unusable key
 * arrives here as NaN — label nothing rather than a misleading "January".
 */
export const formatMonthLabel = (monthIndex: number) => {
  if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) {
    return "";
  }
  return new Date(2000, monthIndex, 1).toLocaleString("en-US", {
    month: "long",
  });
};

/**
 * "2024-04-08T14:33:00Z" → "3:2024" — the key both history hooks group rows by,
 * and which the month headers split back apart for `formatMonthLabel`.
 *
 * An unparseable timestamp yields "NaN:NaN" (all such rows group together),
 * which `formatMonthLabel` renders as no header at all. Deliberately not "":
 * that parses back to month 0 and would print a confident "January".
 */
export const getMonthYearKey = (createdAt: string) => {
  const date = new Date(Date.parse(createdAt));
  return `${date.getMonth()}:${date.getFullYear()}`;
};
