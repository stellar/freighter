import BigNumber from "bignumber.js";

import { formatAmount } from "popup/helpers/formatters";

export const calculateSwapRate = ({
  sendAmount,
  destinationAmount,
}: {
  sendAmount: string;
  destinationAmount: string;
}): string => {
  const send = new BigNumber(sendAmount || "0");
  if (send.isZero() || send.isNaN()) {
    return "0";
  }
  const rate = new BigNumber(destinationAmount || "0").dividedBy(send);
  return formatAmount(rate.decimalPlaces(7).toString());
};
