import { Memo } from "stellar-sdk";
import buffer from "buffer";
import get from "lodash/get";

import { MEMO_TYPES } from "popup/constants/memoTypes";

import { ErrorMessage } from "@shared/api/types";

const mappedMemoType = {
  text: MEMO_TYPES.MEMO_TEXT,
  id: MEMO_TYPES.MEMO_ID,
  hash: MEMO_TYPES.MEMO_HASH,
  return: MEMO_TYPES.MEMO_RETURN,
  none: MEMO_TYPES.MEMO_NONE,
};

export const decodeMemo = (memo: any): { value: string; type: MEMO_TYPES } => {
  const _memo = memo as Memo;

  if (_memo.type === "id") {
    return { value: _memo.value as string, type: mappedMemoType[_memo.type] };
  }

  const decodeMethod = ["hash", "return"].includes(_memo.type)
    ? "hex"
    : "utf-8";

  return {
    value: _memo.value
      ? buffer.Buffer.from(_memo.value).toString(decodeMethod)
      : "",
    type: mappedMemoType[_memo.type],
  };
};

/*  eslint-disable camelcase  */
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
/*  eslint-enable camelcase  */

export const getResultCodes = (error: ErrorMessage | undefined) => {
  const txError = get(error, "response.extras.result_codes.transaction", "");
  const opErrors = get(error, "response.extras.result_codes.operations", []);

  return { operations: opErrors, transaction: txError };
};
