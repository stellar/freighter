import { Memo, MemoType } from "stellar-sdk";
import buffer from "buffer";
import get from "lodash/get";

import { ErrorMessage } from "@shared/api/types";

export const decodeMemo = (memo: any): { value: string; type: MemoType } => {
  const _memo = memo as Memo;

  if (_memo.type === "id") {
    return { value: _memo.value as string, type: _memo.type };
  }

  const decodeMethod = ["hash", "return"].includes(_memo.type)
    ? "hex"
    : "utf-8";

  return {
    value: _memo.value
      ? // NOTE:
        // Can also be an ArrayBufferLike but the memo type doesn't make it easy for buffer to accept it without narrowing.
        buffer.Buffer.from(_memo.value as string).toString(decodeMethod)
      : "",
    type: _memo.type,
  };
};

export enum RESULT_CODES {
  tx_failed = "tx_failed",
  tx_insufficient_fee = "tx_insufficient_fee",
  op_invalid_limit = "op_invalid_limit",
  op_low_reserve = "op_low_reserve",
  op_under_dest_min = "op_under_dest_min",
  op_underfunded = "op_underfunded",
  op_no_destination = "op_no_destination",
  op_no_trust = "op_no_trust",
}

export const getResultCodes = (error: ErrorMessage | undefined) => {
  const txError = get(error, "response.extras.result_codes.transaction", "");
  const opErrors = get(error, "response.extras.result_codes.operations", []);

  return { operations: opErrors, transaction: txError };
};
