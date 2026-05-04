import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Memo } from "stellar-sdk";
import { FederationMemoType } from "popup/helpers/federationMemo";

const MAX_MEMO_BYTES = 28;
const MAX_UINT64 = BigInt("18446744073709551615");
const HEX_32_BYTES_RE = /^[0-9a-fA-F]{64}$/;

const getByteLength = (str: string): number =>
  new TextEncoder().encode(str).length;

export const useValidateMemo = (memo: string, memoType?: string) => {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!memo) {
      setError(null);
      return;
    }

    if (memoType === FederationMemoType.Hash) {
      setError(
        HEX_32_BYTES_RE.test(memo)
          ? null
          : t("Memo hash must be a 64-character hex string"),
      );
      return;
    }

    if (memoType === FederationMemoType.Id) {
      if (!/^\d+$/.test(memo)) {
        setError(t("Memo ID must be a non-negative integer"));
        return;
      }
      setError(
        BigInt(memo) > MAX_UINT64
          ? t("Memo ID exceeds maximum uint64 value")
          : null,
      );
      return;
    }

    if (getByteLength(memo) > MAX_MEMO_BYTES) {
      setError(
        t("Memo is too long. Maximum {{max}} bytes allowed", {
          max: String(MAX_MEMO_BYTES),
        }),
      );
      return;
    }

    try {
      Memo.text(memo);
      setError(null);
    } catch (err) {
      setError(t("Invalid memo format"));
    }
  }, [memo, memoType, t]);

  return { error };
};
