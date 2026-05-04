import { BASE_FEE } from "stellar-sdk";
import { stroopToXlm } from "helpers/stellar";

export const getCurrentTransactionFee = ({
  currentTransactionFee,
  fallbackTransactionFee,
}: {
  currentTransactionFee?: string;
  fallbackTransactionFee?: string;
}) =>
  currentTransactionFee ||
  fallbackTransactionFee ||
  stroopToXlm(BASE_FEE).toString();
