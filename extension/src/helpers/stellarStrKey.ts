/**
 * Stellar StrKey identifiers (publicKeys `G...` and secret seeds `S...`) are
 * base32-encoded with a fixed prefix and exact 56-char length. The pattern is
 * anchored on word boundaries so a 56-char substring inside a longer
 * alphanumeric run does not match.
 *
 * Leaf module (no project imports) so it can be shared by any PII-sensitive
 * sink (e.g. analytics, a third-party sink not covered by Sentry's beforeSend)
 * without creating import cycles.
 */
const STELLAR_STRKEY_PATTERN = /\b[GS][A-Z2-7]{55}\b/g;

/**
 * Replace any embedded Stellar StrKey with a short prefix sentinel
 * ("G***" / "S***"). Preserves the prefix so triage can still distinguish a
 * publicKey leak from a secret-seed leak (the latter is a critical bug —
 * secrets should never reach this code path).
 */
export const scrubStrKeys = (s: string | undefined): string | undefined =>
  s?.replace(STELLAR_STRKEY_PATTERN, (match) => `${match[0]}***`);
