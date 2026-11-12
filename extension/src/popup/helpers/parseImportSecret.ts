import { StrKey } from "stellar-sdk";

import {
  isValidImportMnemonic,
  normalizeMnemonic,
} from "@shared/api/helpers/mnemonic";

export type ParsedImportSecret =
  | { type: "phrase"; mnemonic: string }
  | { type: "secret_key"; secretKey: string }
  | { type: "invalid" };

/**
 * Classify onboarding import input as a Stellar secret key, a BIP-39
 * recovery phrase, or neither. The secret key is checked first.
 */
export const parseImportSecret = (input: string): ParsedImportSecret => {
  const trimmed = input.trim();
  if (StrKey.isValidEd25519SecretSeed(trimmed)) {
    return { type: "secret_key", secretKey: trimmed };
  }
  if (isValidImportMnemonic(input)) {
    return { type: "phrase", mnemonic: normalizeMnemonic(input) };
  }
  return { type: "invalid" };
};
