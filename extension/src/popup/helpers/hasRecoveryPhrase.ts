import { SecretSource, SecretSourceType } from "@shared/api/types";

// A wallet onboarded from a secret key holds only SECRET_KEY sources and has
// no recovery phrase to show. An empty list means sources haven't loaded, so
// stay permissive.
export const hasRecoveryPhrase = (sources: SecretSource[]): boolean =>
  sources.length === 0 ||
  sources.some((s) => s.type === SecretSourceType.PHRASE);
