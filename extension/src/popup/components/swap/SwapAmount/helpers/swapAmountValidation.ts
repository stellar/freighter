import BigNumber from "bignumber.js";

import { cleanAmount } from "popup/helpers/formatters";
import { TX_SEND_MAX } from "popup/constants/transaction";
import { AMOUNT_ERROR } from "helpers/transaction";

/**
 * Returns an AMOUNT_ERROR key when the sell amount is invalid (too many decimals
 * or over the send cap), else null. Kept pure so it can be unit-tested directly.
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
