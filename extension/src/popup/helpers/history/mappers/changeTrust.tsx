import React from "react";
import { t } from "i18next";

import BigNumber from "bignumber.js";
import {
  TransactionDetails,
  TransactionType,
  TransactionStatus,
  HistoryItemData,
} from "../types";
import { createOperationString } from "../helpers";
// import Icon from "components/sds/Icon";
// import { ThemeColors } from "hooks/useColors";

/**
 * Maps change trust operation data to history item data
 */
export const mapChangeTrustHistoryItem = (
  operation: any,
  stellarExpertUrl: string,
  date: string,
  fee: string,
  //   themeColors: ThemeColors,
): HistoryItemData => {
  const {
    asset_code: destAssetCode,
    asset_type: assetType,
    asset_issuer: assetIssuer,
    id,
  } = operation;

  console.log(assetType);
  console.log(assetIssuer);

  const isRemovingTrustline = BigNumber(operation?.limit).eq(0);

  //   const IconComponent = (
  //     <AssetIcon
  //       token={{
  //         code: destAssetCode,
  //         type: assetType,
  //         issuer: {
  //           key: assetIssuer,
  //         },
  //       }}
  //       size="lg"
  //     />
  //   );

  //   const actionText = isRemovingTrustline
  //     ? t("history.transactionHistory.removedTrustline")
  //     : t("history.transactionHistory.addedTrustline");

  const actionText = isRemovingTrustline
    ? t("Remove trustline")
    : t("Add trustline");

  //   const ActionIconComponent = isRemovingTrustline ? (
  //     <Icon.MinusCircle size={16} color={themeColors.foreground.primary} />
  //   ) : (
  //     <Icon.PlusCircle size={16} color={themeColors.foreground.primary} />
  //   );

  const ActionIconComponent = isRemovingTrustline ? <>minus</> : <>plus</>;

  const transactionDetails: TransactionDetails = {
    operation,
    transactionTitle: actionText,
    transactionType: TransactionType.CHANGE_TRUST,
    status: TransactionStatus.SUCCESS,
    // iconComponent,
    ActionIconComponent,
    fee,
    externalUrl: `${stellarExpertUrl}/op/${id}`,
  };

  const {
    transaction_attr: { operation_count: operationCount } = {
      operation_count: 1,
    },
  } = operation;

  return {
    transactionDetails,
    rowText: destAssetCode,
    actionText,
    dateText: date,
    // iconComponent,
    ActionIconComponent,
    amountText: null,
    transactionStatus: TransactionStatus.SUCCESS,
    isAddingFunds: null,
    operationString: createOperationString(operation, operationCount),
  };
};
