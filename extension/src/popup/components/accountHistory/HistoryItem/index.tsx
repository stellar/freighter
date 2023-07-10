import React from "react";
import camelCase from "lodash/camelCase";
import { Icon } from "@stellar/design-system";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";

import { OPERATION_TYPES } from "constants/transaction";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { emitMetric } from "helpers/metrics";
import {
  formatTokenAmount,
  getAttrsFromSorobanHorizonOp,
  SorobanTokenInterface,
} from "popup/helpers/soroban";
import { formatAmount } from "popup/helpers/formatters";

import { HorizonOperation, TokenBalances } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";

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
  tokenBalances: TokenBalances;
  operation: HistoryItemOperation;
  publicKey: string;
  url: string;
  networkDetails: NetworkDetails;
  setDetailViewProps: (props: TransactionDetailProps) => void;
  setIsDetailViewShowing: (isDetailViewShowing: boolean) => void;
}

export const HistoryItem = ({
  operation,
  tokenBalances,
  publicKey,
  url,
  networkDetails,
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
    type_i: typeI,
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
  // TODO should be combined with isPayment
  const isSorobanTx = typeI === 24;

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
        {formatAmount(new BigNumber(amount).toFixed(2, 1))} {destAssetCode}
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
  } else if (isSorobanTx) {
    const attrs = getAttrsFromSorobanHorizonOp(operation, networkDetails);
    const token = tokenBalances.find(
      (balance) => attrs && balance.contractId === attrs.contractId,
    );

    if (!token || !attrs) {
      rowText = operationString;
      transactionDetailProps = {
        ...transactionDetailProps,
        headerTitle: t("Transaction"),
        operationText: operationString,
      };
    } else if (attrs.fnName === SorobanTokenInterface.mint) {
      // handle a mint operation, which is similar to a Sent Payment, but with subtle differences
      const formattedTokenAmount = formatTokenAmount(
        new BigNumber(attrs.amount),
        Number(token.decimals),
      );
      PaymentComponent = (
        <>
          {formattedTokenAmount} {token.symbol}
        </>
      );
      IconComponent = <Icon.ArrowUp className="HistoryItem__icon--sent" />;

      // specify that this is a mint operation
      dateText = `${t("Mint")} \u2022 ${date}`;
      rowText = token.symbol;
      transactionDetailProps = {
        ...transactionDetailProps,
        operation: {
          ...transactionDetailProps.operation,
          from: attrs.from,
          to: attrs.to,
        },
        // we don't use a +/- as mint does not negatively affect balance
        headerTitle: `${t("Mint")} ${token.symbol}`,
        // manually set `isPayment` now that we've passed the above `isPayment` conditional
        isPayment: true,
        isRecipient: false,
        operationText: `${formattedTokenAmount} ${token.symbol}`,
      };
    } else {
      // otherwise handle as a token payment
      const formattedTokenAmount = formatTokenAmount(
        new BigNumber(attrs.amount),
        Number(token.decimals),
      );

      // we're not getting token received ops from Horizon,
      // but we'll check to make sure we're not the one sending the payment
      isRecipient = attrs.from !== publicKey;
      paymentDifference = isRecipient ? "+" : "-";
      PaymentComponent = (
        <>
          {paymentDifference}
          {formattedTokenAmount} {token.symbol}
        </>
      );
      IconComponent = isRecipient ? (
        <Icon.ArrowDown className="HistoryItem__icon--received" />
      ) : (
        <Icon.ArrowUp className="HistoryItem__icon--sent" />
      );
      dateText = `${isRecipient ? t("Received") : t("Sent")} \u2022 ${date}`;
      rowText = token.symbol;
      transactionDetailProps = {
        ...transactionDetailProps,
        operation: {
          ...transactionDetailProps.operation,
          from: attrs.from,
          to: attrs.to,
        },
        // manually set `isPayment` now that we've passed the above `isPayment` conditional
        isPayment: true,
        isRecipient,
        headerTitle: `${isRecipient ? t("Received") : t("Sent")} ${
          token.symbol
        }`,
        operationText: `${paymentDifference}${formattedTokenAmount} ${token.symbol}`,
      };
    }
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
