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

/**
 * A single friendly Blockaid reason extracted from a token/asset scan's
 * `features[]`. Carried alongside the SecurityLevel so the review screen can
 * list these reasons next to the transaction-scan reasons.
 */
export interface BlockaidWarning {
  // The human-readable feature description, e.g. "An identified malicious
  // address is associated with the token."
  description: string;
  // true for "Malicious" features, false for "Warning" (suspicious) ones.
  isError: boolean;
  // Blockaid's feature_id, used to dedupe against the transaction-scan reasons.
  featureId?: string;
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
