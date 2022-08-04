import buffer from "buffer";
import { get } from "lodash";

import { MEMO_TYPES } from "popup/constants/memoTypes";

import { ErrorMessage } from "@shared/api/types";

export const decodeMemo = (memo: {}) => {
  const memoType = get(memo, "_switch.name", "");

  if (memoType === MEMO_TYPES.MEMO_ID) {
    return get(memo, "_value.low", "");
  }
  const decodeMethod = memoType === MEMO_TYPES.MEMO_HASH ? "hex" : "utf-8";
  return buffer.Buffer.from(get(memo, "_value.data", "")).toString(
    decodeMethod,
  );
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
