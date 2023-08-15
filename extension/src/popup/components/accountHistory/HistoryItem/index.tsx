import React, { useContext } from "react";
import camelCase from "lodash/camelCase";
import { Icon } from "@stellar/design-system";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";

import { OPERATION_TYPES } from "constants/transaction";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { emitMetric } from "helpers/metrics";
import { SorobanContext } from "popup/SorobanContext";
import {
  formatTokenAmount,
  getAttrsFromSorobanHorizonOp,
  getTokenDecimals,
  getTokenName,
  getTokenSymbol,
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
  const sorobanClient = useContext(SorobanContext);
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
  const opTypeStr = OPERATION_TYPES[operationType] || t("Transaction");
  const operationString = `${opTypeStr}${
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
  const isInvokeHostFn = typeI === 24;

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

  const renderPaymentComponent = () => PaymentComponent;
  const renderIcon = () => IconComponent;

  // new state, set async
  const [txDetails, setTxDetails] = React.useState(transactionDetailProps);
  const [_dateText, setDateText] = React.useState(date);
  const [_rowText, setRowText] = React.useState("");
  const [iconComponent, setIconComponent] = React.useState(
    null as React.ReactElement | null,
  );
  const [bodyComponent, setBodyComponent] = React.useState(
    null as React.ReactElement | null,
  );

  React.useEffect(() => {
    const buildHistoryItem = async () => {
      if (isSwap) {
        setBodyComponent(
          <>
            {new BigNumber(amount).toFixed(2, 1)} {destAssetCode}
          </>,
        );
        setRowText(
          t(`{{srcAssetCode}} for {{destAssetCode}}`, {
            srcAssetCode,
            destAssetCode,
          }),
        );
        setTxDetails({
          ...transactionDetailProps,
          headerTitle: t(`Swapped {{srcAssetCode}} for {{destAssetCode}}`, {
            srcAssetCode,
            destAssetCode,
          }),
          operationText: `+${new BigNumber(amount)} ${destAssetCode}`,
        });
      } else if (isPayment) {
        // default to Sent if a payment to self
        isRecipient = to === publicKey && from !== publicKey;
        paymentDifference = isRecipient ? "+" : "-";
        setBodyComponent(
          <>
            {paymentDifference}
            {formatAmount(new BigNumber(amount).toFixed(2, 1))} {destAssetCode}
          </>,
        );
        setIconComponent(
          isRecipient ? (
            <Icon.ArrowDown className="HistoryItem__icon--received" />
          ) : (
            <Icon.ArrowUp className="HistoryItem__icon--sent" />
          ),
        );
        setRowText(destAssetCode);
        setDateText(
          `${isRecipient ? t("Received") : t("Sent")} \u2022 ${date}`,
        );
        setTxDetails({
          ...transactionDetailProps,
          isRecipient,
          headerTitle: `${
            isRecipient ? t("Received") : t("Sent")
          } ${destAssetCode}`,
          operationText: `${paymentDifference}${new BigNumber(
            amount,
          )} ${destAssetCode}`,
        });
      } else if (isCreateExternalAccount) {
        setBodyComponent(
          <>-{new BigNumber(startingBalance).toFixed(2, 1)} XLM</>,
        );
        setIconComponent(<Icon.ArrowUp className="HistoryItem__icon--sent" />);
        setRowText("XLM");
        setDateText(`${t("Sent")} \u2022 ${date}`);
        setTxDetails({
          ...transactionDetailProps,
          headerTitle: t("Create Account"),
          isPayment: true,
          operation: {
            ...operation,
            asset_type: "native",
            to: account,
          },
          operationText: `-${new BigNumber(startingBalance)} XLM`,
        });
      } else if (isInvokeHostFn) {
        const attrs = getAttrsFromSorobanHorizonOp(operation, networkDetails);
        const token = tokenBalances.find(
          (balance) => attrs && balance.contractId === attrs.contractId,
        );

        if (!attrs) {
          rowText = operationString;
          transactionDetailProps = {
            ...transactionDetailProps,
            headerTitle: t("Transaction"),
            operationText: operationString,
          };
        } else if (attrs.fnName === SorobanTokenInterface.mint) {
          const isRecieving = (attrs.to = publicKey);
          // Minter does not need to have tokens to mint, and
          // they are not neccessarily minted to themselves.
          // If user has minted to self, add token to their token list.
          let _token = token;
          if (!_token) {
            const tokenDecimals = await getTokenDecimals(
              sorobanClient,
              attrs.contractId,
            );
            const tokenName = await getTokenName(
              sorobanClient,
              attrs.contractId,
            );
            const tokenSymbol = await getTokenSymbol(
              sorobanClient,
              attrs.contractId,
            );
            _token = {
              contractId: attrs.contractId,
              total: isRecieving ? attrs.amount : 0,
              decimals: tokenDecimals,
              name: tokenName,
              symbol: tokenSymbol,
            };
          }

          const formattedTokenAmount = formatTokenAmount(
            new BigNumber(attrs.amount),
            _token.decimals,
          );
          PaymentComponent = (
            <>
              {isRecieving && "+"}
              {formattedTokenAmount} {_token.symbol}
            </>
          );
          IconComponent = <Icon.ArrowUp className="HistoryItem__icon--sent" />;
          dateText = `${t("Mint")} \u2022 ${date}`;
          rowText = _token.symbol;
          transactionDetailProps = {
            ...transactionDetailProps,
            operation: {
              ...transactionDetailProps.operation,
              from: attrs.from,
              to: attrs.to,
            },
            // TODO: if user minted to self, show +
            headerTitle: `${t("Mint")} ${_token.symbol}`,
            // manually set `isPayment` now that we've passed the above `isPayment` conditional
            isPayment: true,
            isRecipient: false,
            operationText: `${formattedTokenAmount} ${_token.symbol}`,
          };
        } else {
          setRowText(operationString);
          setTxDetails({
            ...transactionDetailProps,
            headerTitle: t("Transaction"),
            operationText: operationString,
          });
        }
      } else {
        setRowText(operationString);
        setTxDetails({
          ...transactionDetailProps,
          headerTitle: t("Transaction"),
          operationText: operationString,
        });
      }
    };

    buildHistoryItem();
  }, [isSwap, isPayment, isCreateExternalAccount, isInvokeHostFn]);

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
