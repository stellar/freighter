import BigNumber from "bignumber.js";
import {
  TransactionDetails,
  TransactionType,
  TransactionStatus,
  HistoryItemData,
} from "../types";
import { formatAmount } from "popup/helpers/formatters";

import { t } from "i18next";
import { createOperationString } from "../helpers";
/**
 * Maps payment operation data to history item data
 */
export const mapPaymentHistoryItem = (
  operation: any,
  publicKey: string,
  stellarExpertUrl: string,
  date: string,
  fee: string,
): HistoryItemData => {
  const {
    id,
    amount,
    asset_code: destAssetCode = "XLM",
    asset_type: assetType = "native",
    asset_issuer: assetIssuer = "",
    to,
    from,
  } = operation;

  const isRecipient = to === publicKey && from !== publicKey;
  const paymentDifference = isRecipient ? "+" : "-";
  const formattedAmount = `${paymentDifference}${formatAmount(
    new BigNumber(amount).toString(),
  )} ${destAssetCode}`;

  const iconString = null;
  const actionIconString = isRecipient ? "ArrowCircleDown" : "ArrowCircleUp";
  const actionText = isRecipient ? t("Received") : t("Sent");

  const transactionTitle = `${actionText} ${destAssetCode}`;

  const transactionDetails: TransactionDetails = {
    operation,
    transactionTitle,
    transactionType: TransactionType.PAYMENT,
    status: TransactionStatus.SUCCESS,
    fee,
    iconString,
    actionIconString,
    externalUrl: `${stellarExpertUrl}/op/${id}`,
    paymentDetails: {
      assetCode: destAssetCode,
      assetIssuer: assetIssuer || "",
      assetType,
      amount,
      from,
      to,
    },
  };

  return {
    transactionDetails,
    rowText: transactionTitle,
    actionText,
    dateText: date,
    amountText: formattedAmount,
    iconString,
    isAddingFunds: isRecipient,
    actionIconString,
    transactionStatus: TransactionStatus.SUCCESS,
    operationString: createOperationString(
      TransactionType.CREATE_ACCOUNT,
      operation,
    ),
  };
};
