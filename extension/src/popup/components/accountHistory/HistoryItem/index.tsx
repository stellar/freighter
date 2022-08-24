import React from "react";
import camelCase from "lodash/camelCase";
import { Icon } from "@stellar/design-system";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";

import { OPERATION_TYPES } from "constants/transaction";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { emitMetric } from "helpers/metrics";

import { HorizonOperation } from "@shared/api/types";

import { TransactionDetailProps } from "../TransactionDetail";
import "./styles.scss";

export const historyItemDetailViewProps: TransactionDetailProps = {
  operation: {} as HorizonOperation,
  headerTitle: "",
  isCreateExternalAccount: false,
  isPayment: false,
  isRecipient: false,
  isSwap: false,
  operationText: "",
  externalUrl: "",
  setIsDetailViewShowing: () => null,
};

export type HistoryItemOperation = HorizonOperation & {
  isCreateExternalAccount: boolean;
  isPayment: boolean;
  isSwap: boolean;
};

interface HistoryItemProps {
  operation: HistoryItemOperation;
  publicKey: string;
  url: string;
  setDetailViewProps: (props: TransactionDetailProps) => void;
  setIsDetailViewShowing: (isDetailViewShowing: boolean) => void;
}

export const HistoryItem = ({
  operation,
  publicKey,
  url,
  setDetailViewProps,
  setIsDetailViewShowing,
}: HistoryItemProps) => {
  const { t } = useTranslation();
  const {
    account,
    amount,
    asset_code: assetCode,
    created_at: createdAt,
    id,
    to,
    from,
    starting_balance: startingBalance,
    type,
    transaction_attr: { operation_count: operationCount },
    isCreateExternalAccount = false,
    isPayment = false,
    isSwap = false,
  } = operation;
  let sourceAssetCode;
  if ("source_asset_code" in operation) {
    sourceAssetCode = operation.source_asset_code;
  }
  const operationType = camelCase(type) as keyof typeof OPERATION_TYPES;
  const operationString = `${OPERATION_TYPES[operationType]}${
    operationCount > 1 ? ` + ${operationCount - 1} ops` : ""
  }`;
  const date = new Date(Date.parse(createdAt))
    .toDateString()
    .split(" ")
    .slice(1, 3)
    .join(" ");
  const srcAssetCode = sourceAssetCode || "XLM";
  const destAssetCode = assetCode || "XLM";

  let isRecipient = false;
  let paymentDifference = "";
  let rowText = "";
  let dateText = date;
  let IconComponent = <Icon.Shuffle className="HistoryItem__icon--default" />;
  let PaymentComponent = null as React.ReactElement | null;

  let transactionDetailProps: TransactionDetailProps = {
    operation,
    isCreateExternalAccount,
    isRecipient,
    isPayment,
    isSwap,
    headerTitle: "",
    operationText: "",
    externalUrl: `${url}/op/${id}`,
    setIsDetailViewShowing,
  };

  if (isSwap) {
    PaymentComponent = (
      <>
        {new BigNumber(amount).toFixed(2, 1)} {destAssetCode}
      </>
    );
    rowText = t(`{{srcAssetCode}} for {{destAssetCode}}`, {
      srcAssetCode,
      destAssetCode,
    });
    dateText = t(`Swap \u2022 {{date}}`, { date });
    transactionDetailProps = {
      ...transactionDetailProps,
      headerTitle: t(`Swapped {{srcAssetCode}} for {{destAssetCode}}`, {
        srcAssetCode,
        destAssetCode,
      }),
      operationText: `+${new BigNumber(amount)} ${destAssetCode}`,
    };
  } else if (isPayment) {
    // default to Sent if a payment to self
    isRecipient = to === publicKey && from !== publicKey;
    paymentDifference = isRecipient ? "+" : "-";
    PaymentComponent = (
      <>
        {paymentDifference}
        {new BigNumber(amount).toFixed(2, 1)} {destAssetCode}
      </>
    );
    IconComponent = isRecipient ? (
      <Icon.ArrowDown className="HistoryItem__icon--received" />
    ) : (
      <Icon.ArrowUp className="HistoryItem__icon--sent" />
    );
    rowText = destAssetCode;
    dateText = `${isRecipient ? t("Received") : t("Sent")} \u2022 ${date}`;
    transactionDetailProps = {
      ...transactionDetailProps,
      isRecipient,
      headerTitle: `${
        isRecipient ? t("Received") : t("Sent")
      } ${destAssetCode}`,
      operationText: `${paymentDifference}${new BigNumber(
        amount,
      )} ${destAssetCode}`,
    };
  } else if (isCreateExternalAccount) {
    PaymentComponent = <>-{new BigNumber(startingBalance).toFixed(2, 1)} XLM</>;
    IconComponent = <Icon.ArrowUp className="HistoryItem__icon--sent" />;
    rowText = "XLM";
    dateText = `${t("Sent")} \u2022 ${date}`;
    transactionDetailProps = {
      ...transactionDetailProps,
      headerTitle: t("Create Account"),
      isPayment: true,
      operation: {
        ...operation,
        asset_type: "native",
        to: account,
      },
      operationText: `-${new BigNumber(startingBalance)} XLM`,
    };
  } else {
    rowText = operationString;
    transactionDetailProps = {
      ...transactionDetailProps,
      headerTitle: t("Transaction"),
      operationText: operationString,
    };
  }

  const renderPaymentComponent = () => PaymentComponent;
  const renderIcon = () => IconComponent;

  return (
    <div
      className="HistoryItem"
      onClick={() => {
        emitMetric(METRIC_NAMES.historyOpenItem);
        setDetailViewProps(transactionDetailProps);
        setIsDetailViewShowing(true);
      }}
    >
      <div className="HistoryItem__row">
        <div className="HistoryItem__icon">{renderIcon()}</div>
        <div className="HistoryItem__operation">
          {rowText}
          <div className="HistoryItem__date">{dateText}</div>
        </div>

        <div className="HistoryItem__payment">{renderPaymentComponent()}</div>
      </div>
    </div>
  );
};
