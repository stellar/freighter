import { validateMnemonic, wordlists } from "bip39";

/** Trim, lowercase and collapse whitespace runs to a single space. */
export const normalizeMnemonic = (phrase: string): string =>
  phrase.trim().toLowerCase().split(/\s+/).filter(Boolean).join(" ");

/**
 * True when the phrase, once normalized, is 12 or 24 words and passes the
 * BIP-39 English wordlist and checksum.
 */
export const isValidImportMnemonic = (phrase: string): boolean => {
  const normalized = normalizeMnemonic(phrase);
  const wordCount = normalized === "" ? 0 : normalized.split(" ").length;
  if (wordCount !== 12 && wordCount !== 24) {
    return false;
  }
  return validateMnemonic(normalized, wordlists.english);
};
