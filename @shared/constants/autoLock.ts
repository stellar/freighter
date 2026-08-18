/**
 * Single source of truth for the idle auto-lock timeout feature.
 *
 * The browser session is locked after this many minutes of user
 * inactivity across all extension surfaces (popup, sidebar, standalone
 * signing windows, grant-access windows). Any user interaction inside
 * an extension page resets the timer.
 */
export const VALID_AUTO_LOCK_TIMEOUT_MINUTES = [
  1, 5, 15, 30, 60, 360, 720, 1440,
] as const;

export type AutoLockTimeoutMinutes =
  (typeof VALID_AUTO_LOCK_TIMEOUT_MINUTES)[number];

export const DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES: AutoLockTimeoutMinutes = 720;

export const isValidAutoLockTimeoutMinutes = (
  value: unknown,
): value is AutoLockTimeoutMinutes =>
  typeof value === "number" &&
  (VALID_AUTO_LOCK_TIMEOUT_MINUTES as readonly number[]).includes(value);

export const coerceAutoLockTimeoutMinutes = (
  value: unknown,
): AutoLockTimeoutMinutes =>
  isValidAutoLockTimeoutMinutes(value)
    ? value
    : DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES;

/**
 * Build a human-readable label for a timeout preset. The English fallback is
 * constructed in JS and passed to `t()` as `defaultValue`, so even when an
 * i18n key is missing (common in dev or partial locales) the rendered label is
 * grammatically correct (e.g. "1 minute" / "5 minutes"). Locales can override
 * by providing the matching keys.
 */
export const formatTimeoutLabel = (
  minutes: AutoLockTimeoutMinutes,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string => {
  if (minutes >= 60) {
    const hours = minutes / 60;
    const fallback = hours === 1 ? "1 hour" : `${hours} hours`;
    return t("autoLockTimeout.hours", {
      count: hours,
      defaultValue: fallback,
    });
  }
  const fallback = minutes === 1 ? "1 minute" : `${minutes} minutes`;
  return t("autoLockTimeout.minutes", {
    count: minutes,
    defaultValue: fallback,
  });
};
