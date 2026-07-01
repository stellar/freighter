import BigNumber from "bignumber.js";

import { cleanAmount } from "popup/helpers/formatters";
import { TX_SEND_MAX } from "popup/constants/transaction";
import { AMOUNT_ERROR } from "helpers/transaction";

/**
 * Validates the raw sell amount for the swap. Returns an AMOUNT_ERROR key when
 * the amount has more than 7 decimals or exceeds the max send amount, else null.
 * Pure so it can be unit-tested in isolation and keeps the Formik validate a
 * one-liner.
 */
export const validateSwapAmount = (rawAmount: string): string | null => {
  const val = cleanAmount(rawAmount);
  if (val.indexOf(".") !== -1 && val.split(".")[1].length > 7) {
    return AMOUNT_ERROR.DEC_MAX;
  }
  if (new BigNumber(val).gt(new BigNumber(TX_SEND_MAX))) {
    return AMOUNT_ERROR.SEND_MAX;
  }
  return null;
};
