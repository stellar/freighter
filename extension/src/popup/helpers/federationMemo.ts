import { Memo } from "stellar-sdk";

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
 * memo type. Throws a descriptive `Error` if the value is invalid so callers
 * can surface the message to the user.
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
 * @throws if `memo` is non-empty and fails validation for `memoType`
 */
export const buildMemoFromFederation = (
  memo: string,
  memoType: FederationMemoType | string,
): Memo => {
  validateFederationMemo(memo, memoType);

  switch (memoType) {
    case FederationMemoType.Id:
      return Memo.id(memo);
    case FederationMemoType.Hash:
      return Memo.hash(memo);
    default:
      return Memo.text(memo);
  }
};
