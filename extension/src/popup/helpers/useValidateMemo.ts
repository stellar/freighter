import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Memo } from "stellar-sdk";

const MAX_MEMO_BYTES = 28;

/**
 * Calculates the byte length of a string
 * @param str The string to measure
 * @returns The length in bytes
 */
const getByteLength = (str: string): number =>
  new TextEncoder().encode(str).length;

/**
 * Hook to validate a transaction memo
 * Returns error message if invalid
 */
export const useValidateMemo = (memo: string) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Memo is optional, so empty is valid
    if (!memo) {
      setError(null);
      return;
    }

    // Check byte length first (Stellar has a 28-byte limit for text memos)
    if (getByteLength(memo) > MAX_MEMO_BYTES) {
      setError(
        t("Memo is too long. Maximum {{max}} bytes allowed.", {
          max: String(MAX_MEMO_BYTES),
        }),
      );
      return;
    }

    try {
      // Then try creating a Stellar memo to validate
      Memo.text(memo);

      setError(null);
    } catch (err) {
      setError(t("Invalid memo format."));
    }
  }, [memo, t]);

  return { error };
};
