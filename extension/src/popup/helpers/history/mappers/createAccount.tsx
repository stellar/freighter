/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */
// import TransactionDetailsContent from "components/screens/HistoryScreen/TransactionDetailsContent";
// import {
//   TransactionDetails,
//   TransactionType,
//   TransactionStatus,
//   HistoryItemData,
// } from "components/screens/HistoryScreen/types";
import {
  TransactionDetails,
  TransactionType,
  TransactionStatus,
  HistoryItemData,
} from "../types";
// import Avatar, { AvatarSizes } from "components/sds/Avatar";
// import Icon from "components/sds/Icon";
// import { Text } from "components/sds/Typography";
// import { formatAssetAmount } from "helpers/formatAmount";
// import { formatAssetAmount } from "helpers/formatAmount";
import { formatAmount } from "popup/helpers/formatters";

// import { truncatePublicKey } from "helpers/stellar";
// import { ThemeColors } from "hooks/useColors";
import { t } from "i18next";
import React from "react";
// import { View } from "react-native";

interface CreateAccountHistoryItemData {
  operation: any;
  stellarExpertUrl: string;
  date: string;
  fee: string;
  //   themeColors: ThemeColors;
  isCreateExternalAccount: boolean;
}

/**
 * Maps create account operation data to history item data
 */
export const mapCreateAccountHistoryItem = ({
  operation,
  stellarExpertUrl,
  date,
  fee,
  //   themeColors,
  isCreateExternalAccount,
}: CreateAccountHistoryItemData): HistoryItemData => {
  const { account, starting_balance: startingBalance } = operation;
  const isRecipient = !isCreateExternalAccount;
  const paymentDifference = isRecipient ? "+" : "-";
  const formattedAmount = `${paymentDifference}${formatAmount(
    startingBalance,
  )} "XLM"`;

  //   const ActionIconComponent = isRecipient ? (
  //     <Icon.PlusCircle size={16} color={themeColors.foreground.primary} />
  //   ) : (
  //     <Icon.ArrowCircleUp size={16} color={themeColors.foreground.primary} />
  //   );

  const ActionIconComponent = isRecipient ? (
    <>plusCircle</>
  ) : (
    <>ArrowCircleUp</>
  );

  const transactionDetails: TransactionDetails = {
    operation,
    transactionTitle: t("history.transactionHistory.createAccount"),
    transactionType: TransactionType.CREATE_ACCOUNT,
    fee,
    status: TransactionStatus.SUCCESS,
    ActionIconComponent,
    externalUrl: `${stellarExpertUrl}/op/${operation.id}`,
    createAccountDetails: {
      isCreatingExternalAccount: isCreateExternalAccount,
      accountPublicKey: account,
      startingBalance,
    },
  };

  return {
    transactionDetails,
    rowText: t("history.transactionHistory.createAccount"),
    dateText: date,
    amountText: formattedAmount,
    actionText: isRecipient
      ? t("history.transactionHistory.received")
      : t("history.transactionHistory.sent"),
    ActionIconComponent,
    transactionStatus: TransactionStatus.SUCCESS,
    isAddingFunds: isRecipient,
    operationString: "",
  };
};
