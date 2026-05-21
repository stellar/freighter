/**
 * Single source of truth for the idle auto-lock timeout feature.
 *
 * The browser session is locked after this many minutes of user
 * inactivity across all extension surfaces (popup, sidebar, standalone
 * signing windows, grant-access windows). Any user interaction inside
 * an extension page resets the timer.
 */
export const VALID_AUTO_LOCK_TIMEOUT_MINUTES = [1, 5, 15, 30, 60] as const;

export type AutoLockTimeoutMinutes =
  (typeof VALID_AUTO_LOCK_TIMEOUT_MINUTES)[number];

export const DEFAULT_AUTO_LOCK_TIMEOUT_MINUTES: AutoLockTimeoutMinutes = 15;

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
