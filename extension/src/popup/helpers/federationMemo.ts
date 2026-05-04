import { Memo } from "stellar-sdk";
import * as Sentry from "@sentry/browser";
import i18n from "popup/helpers/localizationConfig";

/**
 * Memo types defined by SEP-0002 federation protocol.
 * https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0002.md
 */
export enum FederationMemoType {
  Text = "text",
  Id = "id",
  Hash = "hash",
}

const FEDERATION_MEMO_TEXT_MAX_BYTES = 28;

// Max value of a 64-bit unsigned integer
const MAX_UINT64 = BigInt("18446744073709551615");

// 32-byte value expressed as a 64-character lowercase/uppercase hex string
const HEX_32_BYTES_RE = /^[0-9a-fA-F]{64}$/;

/**
 * Validates a federation memo value against the constraints for its SEP-0002
 * memo type. Throws a descriptive `Error` if the value is invalid. These
 * errors are intended for Sentry logging only — do not surface them to users.
 *
 * Spec: https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0002.md
 */
export const validateFederationMemo = (
  memo: string,
  memoType: FederationMemoType | string,
): void => {
  // An empty memo is always valid regardless of type
  if (!memo) {
    return;
  }

  switch (memoType) {
    case FederationMemoType.Text: {
      const byteLength = new TextEncoder().encode(memo).length;
      if (byteLength > FEDERATION_MEMO_TEXT_MAX_BYTES) {
        throw new Error(
          `Federation memo text exceeds ${FEDERATION_MEMO_TEXT_MAX_BYTES} bytes`,
        );
      }
      break;
    }

    case FederationMemoType.Id: {
      if (!/^\d+$/.test(memo)) {
        throw new Error("Federation memo id must be a non-negative integer");
      }
      if (BigInt(memo) > MAX_UINT64) {
        throw new Error("Federation memo id exceeds maximum uint64 value");
      }
      break;
    }

    case FederationMemoType.Hash: {
      if (!HEX_32_BYTES_RE.test(memo)) {
        throw new Error(
          "Federation memo hash must be a 64-character hex string (32 bytes)",
        );
      }
      break;
    }

    default:
      // Unknown memo type — pass through and let stellar-sdk validate
      break;
  }
};

/**
 * Builds a Stellar `Memo` object from a federation server memo value and type,
 * running SEP-0002 validation before construction.
 *
 * Validation errors are logged to Sentry; a generic user-facing error is thrown
 * so implementation details are never surfaced to users.
 */
export const buildMemoFromFederation = (
  memo: string,
  memoType: FederationMemoType | string,
): Memo => {
  try {
    validateFederationMemo(memo, memoType);
  } catch (err) {
    Sentry.captureException(err);
    throw new Error(i18n.t("Failed to resolve federated address"));
  }

  switch (memoType) {
    case FederationMemoType.Id:
      return Memo.id(memo);
    case FederationMemoType.Hash:
      return Memo.hash(memo);
    default:
      return Memo.text(memo);
  }
};
