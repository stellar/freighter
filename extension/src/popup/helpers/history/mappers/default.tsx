import { Icon } from "@stellar/design-system";
// import {
//     TransactionDetails,
//     TransactionType,
//     TransactionStatus,
//     HistoryItemData,
//   } from "components/screens/HistoryScreen/types";
import {
  TransactionDetails,
  TransactionType,
  TransactionStatus,
  HistoryItemData,
} from "../types";
//   import Icon from "components/sds/Icon";
//   import { ThemeColors } from "hooks/useColors";
import { t } from "i18next";
import { capitalize } from "lodash";
import React from "react";

/**
 * Creates a default history item data for unrecognized transaction types
 */
export const createDefaultHistoryItemData = (
  operation: any,
  stellarExpertUrl: string,
  date: string,
  fee: string,
  // themeColors: ThemeColors,
): HistoryItemData => {
  const { type, id, amount = null } = operation;

  const rowText = capitalize(type).replaceAll("_", " ");

  const transactionDetails: TransactionDetails = {
    operation,
    transactionTitle: rowText,
    transactionType: TransactionType.UNKNOWN,
    status: TransactionStatus.SUCCESS,
    fee,
    // iconComponent: null,
    ActionIconComponent: null,
    externalUrl: `${stellarExpertUrl}/op/${id}`,
  };

  return {
    transactionDetails,
    dateText: date,
    rowText,
    amountText: amount,
    actionText: t("history.transactionHistory.transaction"),
    //   ActionIconComponent: (
    //     <Icon.Wallet03 size={16} color={themeColors.foreground.primary} />
    //   ),
    ActionIconComponent: <Icon.Wallet03 size={16} />,
    transactionStatus: TransactionStatus.SUCCESS,
    isAddingFunds: null,
    operationString: "",
  };
};
