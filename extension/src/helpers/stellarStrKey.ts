/**
 * Stellar StrKey identifiers are base32-encoded with a fixed prefix. All of
 * ed25519 publicKey (`G…`), secret seed (`S…`), and contract (`C…`) are 56
 * chars; muxed accounts (`M…`) encode an extra 64-bit id and are 69 chars.
 * Both are anchored on word boundaries so a same-length substring inside a
 * longer alphanumeric run does not match.
 *
 * Leaf module (no project imports) so it can be shared by any PII-sensitive
 * sink (e.g. analytics, a third-party sink not covered by Sentry's beforeSend)
 * without creating import cycles.
 */
const STELLAR_STRKEY_PATTERN = /\b(?:[GSC][A-Z2-7]{55}|M[A-Z2-7]{68})\b/g;

/**
 * Replace any embedded Stellar StrKey with a short prefix sentinel
 * ("G***" / "S***" / "C***" / "M***"). Preserves the prefix so triage can
 * still distinguish a publicKey/contract/muxed leak from a secret-seed leak
 * (the latter is a critical bug — secrets should never reach this code path).
 */
export const scrubStrKeys = (
  s: string | null | undefined,
): string | undefined =>
  s?.replace(STELLAR_STRKEY_PATTERN, (match) => `${match[0]}***`) ?? undefined;
