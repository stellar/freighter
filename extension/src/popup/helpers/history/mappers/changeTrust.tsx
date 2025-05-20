import { t } from "i18next";

import BigNumber from "bignumber.js";
import {
  TransactionDetails,
  TransactionType,
  TransactionStatus,
  HistoryItemData,
} from "../types";
import { createOperationString } from "../helpers";

/**
 * Maps change trust operation data to history item data
 */
export const mapChangeTrustHistoryItem = (
  operation: any,
  stellarExpertUrl: string,
  date: string,
  fee: string,
): HistoryItemData => {
  const { asset_code: destAssetCode, id } = operation;

  const isRemovingTrustline = BigNumber(operation?.limit).eq(0);

  const actionText = isRemovingTrustline
    ? t("Remove trustline")
    : t("Add trustline");

  const iconString = null;

  const actionIconString = isRemovingTrustline ? "MinusCircle" : "PlusCircle";

  const transactionDetails: TransactionDetails = {
    operation,
    transactionTitle: actionText,
    transactionType: TransactionType.CHANGE_TRUST,
    status: TransactionStatus.SUCCESS,
    iconString,
    actionIconString,
    fee,
    externalUrl: `${stellarExpertUrl}/op/${id}`,
  };

  return {
    transactionDetails,
    rowText: destAssetCode,
    actionText,
    dateText: date,
    iconString,
    actionIconString,
    amountText: "",
    transactionStatus: TransactionStatus.SUCCESS,
    isAddingFunds: null,
    operationString: createOperationString(
      TransactionType.CHANGE_TRUST,
      operation,
    ),
  };
};
