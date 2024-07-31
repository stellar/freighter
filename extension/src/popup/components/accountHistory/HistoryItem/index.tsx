/* eslint-disable @typescript-eslint/no-unsafe-argument */
// In order to allow that rule we need to refactor this to use the correct Horizon types and narrow operation types

import React, { useState, useEffect } from "react";
import { captureException } from "@sentry/browser";
import camelCase from "lodash/camelCase";
import { Icon, Loader } from "@stellar/design-system";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";

import { OPERATION_TYPES } from "constants/transaction";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { emitMetric } from "helpers/metrics";
import {
  formatTokenAmount,
  getAttrsFromSorobanHorizonOp,
} from "popup/helpers/soroban";
import { formatAmount } from "popup/helpers/formatters";

import {
  AccountBalancesInterface,
  Balances,
  HorizonOperation,
  TokenBalance,
} from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { getTokenDetails } from "@shared/api/internal";

import { TransactionDetailProps } from "../TransactionDetail";
import "./styles.scss";

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

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
  accountBalances: AccountBalancesInterface;
  operation: HistoryItemOperation;
  publicKey: string;
  url: string;
  networkDetails: NetworkDetails;
  setDetailViewProps: (props: TransactionDetailProps) => void;
  setIsDetailViewShowing: (isDetailViewShowing: boolean) => void;
}

export const HistoryItem = ({
  accountBalances,
  operation,
  publicKey,
  url,
  networkDetails,
  setDetailViewProps,
  setIsDetailViewShowing,
}: HistoryItemProps) => {
  const { t } = useTranslation();
  // Why does Horizon type not include transaction_attr?
  const _op = operation as any;
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
  } = _op;
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
    operation: _op,
    isCreateExternalAccount,
    isRecipient: false,
    isPayment,
    isSwap,
    headerTitle: "",
    operationText: "",
    externalUrl: `${url}/op/${id}`,
    setIsDetailViewShowing,
  };

  const [txDetails, setTxDetails] = useState(transactionDetailPropsBase);
  const [dateText, setDateText] = useState(date);
  const [rowText, setRowText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [IconComponent, setIconComponent] = useState(
    (
      <Icon.RefreshCcw01 className="HistoryItem__icon--default" />
    ) as React.ReactElement | null,
  );
  const [BodyComponent, setBodyComponent] = useState(
    null as React.ReactElement | null,
  );

  const renderBodyComponent = () => BodyComponent;
  const renderIcon = () => IconComponent;

  useEffect(() => {
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
            `${_isRecipient ? t("Received") : t("Sent")} \u2022 ${date}`,
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
        setDateText((_dateText) => `${t("Sent")} \u2022 ${date}`);
        setTxDetails((_state) => ({
          ..._state,
          headerTitle: t("Create Account"),
          isPayment: true,
          operation: {
            ...operation,
            // eslint-disable-next-line
            asset_type: "native",
            to: account,
          } as any, // TODO: overloaded op type, native not valid
          operationText: `-${new BigNumber(startingBalance)} XLM`,
        }));
      } else if (isInvokeHostFn) {
        const attrs = getAttrsFromSorobanHorizonOp(operation, networkDetails);
        const balances =
          accountBalances.balances || ({} as NonNullable<Balances>);
        const tokenKey = Object.keys(balances).find(
          (balanceKey) => attrs?.contractId === balanceKey.split(":")[1],
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

          setIconComponent(
            isRecieving ? (
              <Icon.ArrowDown className="HistoryItem__icon--received" />
            ) : (
              <Icon.RefreshCcw01 className="HistoryItem__icon--default" />
            ),
          );

          // Minter does not need to have tokens to mint, and
          // they are not neccessarily minted to themselves.
          // If user has minted to self, add token to their token list.
          if (!tokenKey) {
            setIsLoading(true);

            try {
              const tokenDetailsResponse = await getTokenDetails({
                contractId: attrs.contractId,
                publicKey,
                networkDetails,
              });

              if (!tokenDetailsResponse) {
                setRowText(operationString);
                setTxDetails((_state) => ({
                  ..._state,
                  headerTitle: t("Transaction"),
                  operationText: operationString,
                }));
              } else {
                const _token = {
                  contractId: attrs.contractId,
                  total: isRecieving ? attrs.amount : 0,
                  decimals: tokenDetailsResponse.decimals,
                  name: tokenDetailsResponse.name,
                  symbol: tokenDetailsResponse.symbol,
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

                setDateText(
                  (_dateText) =>
                    `${
                      isRecieving ? t("Received") : t("Minted")
                    } \u2022 ${date}`,
                );
                setRowText(t(capitalize(attrs.fnName)));
                setTxDetails((_state) => ({
                  ..._state,
                  operation: {
                    ..._state.operation,
                    from: attrs.from,
                    to: attrs.to,
                  },
                  headerTitle: `${t(capitalize(attrs.fnName))} ${
                    _token.symbol
                  }`,
                  isPayment: false,
                  isRecipient: isRecieving,
                  operationText: `${formattedTokenAmount} ${_token.symbol}`,
                }));
              }
              setIsLoading(false);
            } catch (error) {
              console.error(error);
              captureException(`Error fetching token details: ${error}`);
              setRowText(t(capitalize(attrs.fnName)));
              setBodyComponent(
                <>
                  {isRecieving && "+ "}
                  Unknown
                </>,
              );
              setDateText(
                (_dateText) =>
                  `${isRecieving ? t("Received") : t("Minted")} \u2022 ${date}`,
              );
              setTxDetails((_state) => ({
                ..._state,
                operation: {
                  ..._state.operation,
                  from: attrs.from,
                  to: attrs.to,
                },
                headerTitle: t(capitalize(attrs.fnName)),
                // manually set `isPayment` now that we've passed the above `isPayment` conditional
                isPayment: false,
                isRecipient: isRecieving,
                operationText: operationString,
              }));
              setIsLoading(false);
            }
          } else {
            const { token, decimals } = balances[tokenKey] as TokenBalance;
            const formattedTokenAmount = formatTokenAmount(
              new BigNumber(attrs.amount),
              decimals,
            );
            setBodyComponent(
              <>
                {isRecieving && "+"}
                {formattedTokenAmount} {token.code}
              </>,
            );

            setDateText(
              (_dateText) =>
                `${isRecieving ? t("Received") : t("Minted")} \u2022 ${date}`,
            );
            setRowText(t(capitalize(attrs.fnName)));
            setTxDetails((_state) => ({
              ..._state,
              operation: {
                ..._state.operation,
                from: attrs.from,
                to: attrs.to,
              },
              headerTitle: `${t(capitalize(attrs.fnName))} ${token.code}`,
              isPayment: false,
              isRecipient: isRecieving,
              operationText: `${formattedTokenAmount} ${token.code}`,
            }));
          }
        } else if (attrs.fnName === SorobanTokenInterface.transfer) {
          setIconComponent(
            <Icon.ArrowUp className="HistoryItem__icon--sent" />,
          );

          if (!tokenKey) {
            // TODO: attempt to fetch token details, not stored
            setRowText(operationString);
            setTxDetails((_state) => ({
              ..._state,
              headerTitle: t("Transaction"),
              operationText: operationString,
            }));
          } else {
            const { token, decimals } = balances[tokenKey] as TokenBalance;
            const formattedTokenAmount = formatTokenAmount(
              new BigNumber(attrs.amount),
              decimals,
            );
            setBodyComponent(
              <>
                - {formattedTokenAmount} {token.code}
              </>,
            );

            setDateText((_dateText) => `${t("Sent")} \u2022 ${date}`);
            setRowText(t(capitalize(attrs.fnName)));
            setTxDetails((_state) => ({
              ..._state,
              operation: {
                ..._state.operation,
                from: attrs.from,
                to: attrs.to,
              },
              headerTitle: `${t(capitalize(attrs.fnName))} ${token.code}`,
              isPayment: false,
              isRecipient: false,
              operationText: `${formattedTokenAmount} ${token.code}`,
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
    account,
    amount,
    date,
    destAssetCode,
    from,
    isCreateExternalAccount,
    isInvokeHostFn,
    isPayment,
    isSwap,
    networkDetails,
    operation,
    operationString,
    publicKey,
    srcAssetCode,
    startingBalance,
    t,
    to,
    accountBalances.balances,
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
        {isLoading ? (
          <div className="HistoryItem__loader">
            <Loader size="2rem" />
          </div>
        ) : (
          <>
            <div className="HistoryItem__icon">{renderIcon()}</div>
            <div className="HistoryItem__operation">
              {rowText}
              <div className="HistoryItem__date">{dateText}</div>
            </div>

            <div className="HistoryItem__payment">{renderBodyComponent()}</div>
          </>
        )}
      </div>
    </div>
  );
};
/* eslint-enable @typescript-eslint/no-unsafe-argument */
