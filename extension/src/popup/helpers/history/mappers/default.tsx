import {
  TransactionDetails,
  TransactionType,
  TransactionStatus,
  HistoryItemData,
} from "../types";
import { createOperationString, getIconString } from "../helpers";

import { t } from "i18next";
import { capitalize } from "lodash";

/**
 * Creates a default history item data for unrecognized transaction types
 */
export const createDefaultHistoryItemData = (
  operation: any,
  stellarExpertUrl: string,
  date: string,
  fee: string,
): HistoryItemData => {
  const { type, id, amount = null } = operation;

  const rowText = capitalize(type).replaceAll("_", " ");

  const iconString = getIconString();
  const actionIconString = "Wallet03";

  const transactionDetails: TransactionDetails = {
    operation,
    transactionTitle: rowText,
    transactionType: TransactionType.UNKNOWN,
    status: TransactionStatus.SUCCESS,
    fee,
    iconString,
    actionIconString,
    externalUrl: `${stellarExpertUrl}/op/${id}`,
  };

  return {
    transactionDetails,
    dateText: date,
    rowText,
    amountText: amount,
    actionText: t("history.transactionHistory.transaction"),
    iconString,
    actionIconString,
    transactionStatus: TransactionStatus.SUCCESS,
    isAddingFunds: null,
    operationString: createOperationString("", operation),
  };
};
