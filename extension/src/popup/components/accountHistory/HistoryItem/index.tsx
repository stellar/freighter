import React, { useContext } from "react";
import { captureException } from "@sentry/browser";
import camelCase from "lodash/camelCase";
import { Icon } from "@stellar/design-system";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";

import { OPERATION_TYPES } from "constants/transaction";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";
import { getDecimals, getName, getSymbol } from "@shared/helpers/soroban/token";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { emitMetric } from "helpers/metrics";
import { SorobanContext } from "popup/SorobanContext";
import {
  formatTokenAmount,
  getAttrsFromSorobanHorizonOp,
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
  const isInvokeHostFn = typeI === 24;

  const transactionDetailPropsBase: TransactionDetailProps = {
    operation,
    isCreateExternalAccount,
    isRecipient: false,
    isPayment,
    isSwap,
    headerTitle: "",
    operationText: "",
    externalUrl: `${url}/op/${id}`,
    setIsDetailViewShowing,
  };

  const [txDetails, setTxDetails] = React.useState(transactionDetailPropsBase);
  const [dateText, setDateText] = React.useState(date);
  const [rowText, setRowText] = React.useState("");
  const [IconComponent, setIconComponent] = React.useState(
    (
      <Icon.Shuffle className="HistoryItem__icon--default" />
    ) as React.ReactElement | null,
  );
  const [BodyComponent, setBodyComponent] = React.useState(
    null as React.ReactElement | null,
  );

  const renderBodyComponent = () => BodyComponent;
  const renderIcon = () => IconComponent;

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
        setTxDetails((_state) => ({
          ..._state,
          headerTitle: t(`Swapped {{srcAssetCode}} for {{destAssetCode}}`, {
            srcAssetCode,
            destAssetCode,
          }),
          operationText: `+${new BigNumber(amount)} ${destAssetCode}`,
        }));
      } else if (isPayment) {
        // default to Sent if a payment to self
        const _isRecipient = to === publicKey && from !== publicKey;
        const paymentDifference = _isRecipient ? "+" : "-";
        setBodyComponent(
          <>
            {paymentDifference}
            {formatAmount(new BigNumber(amount).toFixed(2, 1))} {destAssetCode}
          </>,
        );
        setIconComponent(
          _isRecipient ? (
            <Icon.ArrowDown className="HistoryItem__icon--received" />
          ) : (
            <Icon.ArrowUp className="HistoryItem__icon--sent" />
          ),
        );
        setRowText(destAssetCode);
        setDateText(
          (_dateText) =>
            `${_isRecipient ? t("Received") : t("Sent")} \u2022 ${_dateText}`,
        );
        setTxDetails((_state) => ({
          ..._state,
          isRecipient: _isRecipient,
          headerTitle: `${
            _isRecipient ? t("Received") : t("Sent")
          } ${destAssetCode}`,
          operationText: `${paymentDifference}${new BigNumber(
            amount,
          )} ${destAssetCode}`,
        }));
      } else if (isCreateExternalAccount) {
        setBodyComponent(
          <>-{new BigNumber(startingBalance).toFixed(2, 1)} XLM</>,
        );
        setIconComponent(<Icon.ArrowUp className="HistoryItem__icon--sent" />);
        setRowText("XLM");
        setDateText((_dateText) => `${t("Sent")} \u2022 ${_dateText}`);
        setTxDetails((_state) => ({
          ..._state,
          headerTitle: t("Create Account"),
          isPayment: true,
          operation: {
            ...operation,
            asset_type: "native",
            to: account,
          },
          operationText: `-${new BigNumber(startingBalance)} XLM`,
        }));
      } else if (isInvokeHostFn) {
        const attrs = getAttrsFromSorobanHorizonOp(operation, networkDetails);
        const token = tokenBalances.find(
          (balance) => attrs && balance.contractId === attrs.contractId,
        );

        if (!attrs) {
          setRowText(operationString);
          setTxDetails((_state) => ({
            ..._state,
            headerTitle: t("Transaction"),
            operationText: operationString,
          }));
        } else if (attrs.fnName === SorobanTokenInterface.mint) {
          const isRecieving = attrs.to === publicKey;
          // Minter does not need to have tokens to mint, and
          // they are not neccessarily minted to themselves.
          // If user has minted to self, add token to their token list.
          let _token = token;
          if (!_token) {
            // TODO: When fetching contract details, we could encounter an expired state entry
            // and fail to fetch values through the RPC.
            // We can address this in several ways -
            // 1. If token is a SAC, fetch details from Horizon.
            // 2. If not SAC or unknown, look up ledger entry directly.
            try {
              const tokenDecimals = await getDecimals(
                attrs.contractId,
                sorobanClient.server,
                sorobanClient.newTxBuilder(),
              );
              const tokenName = await getName(
                attrs.contractId,
                sorobanClient.server,
                sorobanClient.newTxBuilder(),
              );
              const tokenSymbol = await getSymbol(
                attrs.contractId,
                sorobanClient.server,
                sorobanClient.newTxBuilder(),
              );

              _token = {
                contractId: attrs.contractId,
                total: isRecieving ? attrs.amount : 0,
                decimals: tokenDecimals,
                name: tokenName,
                symbol: tokenSymbol,
              };

              const formattedTokenAmount = formatTokenAmount(
                new BigNumber(attrs.amount),
                _token.decimals,
              );
              setBodyComponent(
                <>
                  {isRecieving && "+"}
                  {formattedTokenAmount} {_token.symbol}
                </>,
              );
              setIconComponent(
                <Icon.ArrowUp className="HistoryItem__icon--sent" />,
              );
              setDateText((_dateText) => `${t("Mint")} \u2022 ${_dateText}`);
              setRowText(_token.symbol);
              setTxDetails((_state) => ({
                ..._state,
                operation: {
                  ..._state.operation,
                  from: attrs.from,
                  to: attrs.to,
                },
                headerTitle: `${t("Mint")} ${_token!.symbol}`,
                // manually set `isPayment` now that we've passed the above `isPayment` conditional
                isPayment: true,
                isRecipient: false,
                operationText: `${formattedTokenAmount} ${_token!.symbol}`,
              }));
            } catch (error) {
              console.error(error);
              captureException(`Error fetching token details: ${error}`);
              // can't get token details, display as generic tx
              setRowText(operationString);
              setTxDetails((_state) => ({
                ..._state,
                headerTitle: t("Transaction"),
                operationText: operationString,
              }));
            }
          }
        } else {
          setRowText(operationString);
          setTxDetails((_state) => ({
            ..._state,
            headerTitle: t("Transaction"),
            operationText: operationString,
          }));
        }
      } else {
        setRowText(operationString);
        setTxDetails((_state) => ({
          ..._state,
          headerTitle: t("Transaction"),
          operationText: operationString,
        }));
      }
    };

    buildHistoryItem();
  }, [
    isSwap,
    isPayment,
    isCreateExternalAccount,
    isInvokeHostFn,
    account,
    amount,
    destAssetCode,
    from,
    to,
    networkDetails,
    operation,
    operationString,
    publicKey,
    sorobanClient,
    srcAssetCode,
    startingBalance,
    t,
    tokenBalances,
  ]);

  return (
    <div
      className="HistoryItem"
      onClick={() => {
        emitMetric(METRIC_NAMES.historyOpenItem);
        setDetailViewProps(txDetails);
        setIsDetailViewShowing(true);
      }}
    >
      <div className="HistoryItem__row">
        <div className="HistoryItem__icon">{renderIcon()}</div>
        <div className="HistoryItem__operation">
          {rowText}
          <div className="HistoryItem__date">{dateText}</div>
        </div>

        <div className="HistoryItem__payment">{renderBodyComponent()}</div>
      </div>
    </div>
  );
};
