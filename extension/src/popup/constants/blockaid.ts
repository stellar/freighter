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
