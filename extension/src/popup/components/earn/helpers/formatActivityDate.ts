import { formatEarnDay } from "./formatDepositDate";

/**
 * The date on an Activity row, in the app's language: "Aug 28" within the
 * current year, "Aug 28 2025" outside it, where the day alone is ambiguous.
 * No comma before the year, as History's details write it.
 */
export const formatActivityDate = (
  occurredAt: string,
  language: string,
  now: Date = new Date(),
): string => {
  const date = new Date(occurredAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return formatEarnDay(
    date,
    language,
    date.getFullYear() !== now.getFullYear(),
  );
};
