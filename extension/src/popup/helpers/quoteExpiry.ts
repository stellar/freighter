import { ErrorMessage } from "@shared/api/types";
import { getResultCodes } from "popup/helpers/parseTransaction";

// Horizon op codes indicating a frozen quote cannot be filled at submit time.
export const QUOTE_EXPIRED_OP_CODES = [
  "op_under_dest_min",
  "op_too_few_offers",
];

export const getQuoteExpiredOperationCodes = (
  error: ErrorMessage | undefined,
): string[] => {
  const { operations } = getResultCodes(error);
  return (operations || []).filter((code) =>
    QUOTE_EXPIRED_OP_CODES.includes(code),
  );
};

export const isQuoteExpiredError = (error: ErrorMessage | undefined): boolean =>
  getQuoteExpiredOperationCodes(error).length > 0;
