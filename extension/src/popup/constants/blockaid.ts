/**
 * Security levels for Blockaid assessments
 * Provides type-safe security classification
 */
export enum SecurityLevel {
  SAFE = "SAFE",
  SUSPICIOUS = "SUSPICIOUS",
  MALICIOUS = "MALICIOUS",
  UNABLE_TO_SCAN = "UNABLE_TO_SCAN",
}

// Severity ordering for rolling several verdicts into one. SAFE never warns.
const SECURITY_LEVEL_SEVERITY: Record<SecurityLevel, number> = {
  [SecurityLevel.SAFE]: 0,
  [SecurityLevel.UNABLE_TO_SCAN]: 1,
  [SecurityLevel.SUSPICIOUS]: 2,
  [SecurityLevel.MALICIOUS]: 3,
};

/**
 * Rolls multiple Blockaid verdicts (e.g. the transaction scan plus the source
 * and destination token verdicts on a swap) into the single most severe level
 * that warrants a warning. SAFE / null / undefined never escalate, so the
 * result is null when nothing is flagged — matching getTransactionSecurityLevel,
 * which returns null for a clean transaction (§4.1).
 */
export const mergeSecurityLevels = (
  levels: (SecurityLevel | null | undefined)[],
): SecurityLevel | null => {
  let worst: SecurityLevel | null = null;
  for (const level of levels) {
    if (!level || level === SecurityLevel.SAFE) {
      continue;
    }
    if (
      worst === null ||
      SECURITY_LEVEL_SEVERITY[level] > SECURITY_LEVEL_SEVERITY[worst]
    ) {
      worst = level;
    }
  }
  return worst;
};
