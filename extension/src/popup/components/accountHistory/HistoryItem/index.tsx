/* eslint-disable @typescript-eslint/no-unsafe-argument */
// In order to allow that rule we need to refactor this to use the correct Horizon types and narrow operation types

import React, { useState, useEffect, useCallback } from "react";
import { captureException } from "@sentry/browser";
import camelCase from "lodash/camelCase";
import { Badge, Icon, Loader } from "@stellar/design-system";
import { BigNumber } from "bignumber.js";
import { useTranslation } from "react-i18next";

import { OPERATION_TYPES } from "constants/transaction";
import { SorobanTokenInterface } from "@shared/constants/soroban/token";
import { METRIC_NAMES } from "popup/constants/metricsNames";

import { emitMetric } from "helpers/metrics";
import { getStellarExpertUrl } from "popup/helpers/account";
import {
  formatTokenAmount,
  getAttrsFromSorobanHorizonOp,
} from "popup/helpers/soroban";
import { formatAmount } from "popup/helpers/formatters";
import { getBalanceByKey } from "popup/helpers/balance";

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
  networkDetails: NetworkDetails;
  setDetailViewProps: (props: TransactionDetailProps) => void;
  setIsDetailViewShowing: (isDetailViewShowing: boolean) => void;
}

export const HistoryItem = ({
  accountBalances,
  operation,
  publicKey,
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

  const stellarExpertUrl = getStellarExpertUrl(networkDetails);

  const transactionDetailPropsBase: TransactionDetailProps = {
    operation: _op,
    isCreateExternalAccount,
    isRecipient: false,
    isPayment,
    isSwap,
    headerTitle: "",
    operationText: "",
    externalUrl: `${stellarExpertUrl}/op/${id}`,
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

  const renderBodyComponent = () => {
    if (BodyComponent) {
      return BodyComponent;
    }

    return (
      <Badge variant="tertiary" size="md">
        {t("N/A")}
      </Badge>
    );
  };
  const renderIcon = () => IconComponent;
  /* eslint-disable react-hooks/exhaustive-deps */
  const translations = useCallback(t, []);

  useEffect(() => {
    const buildHistoryItem = async () => {
      if (isSwap) {
        const formattedAmount = `${formatAmount(
          new BigNumber(amount).toString(),
        )} ${destAssetCode}`;

        setBodyComponent(
          <Badge variant="primary" size="md">
            {formattedAmount}
          </Badge>,
        );
        setRowText(
          translations(`{{srcAssetCode}} for {{destAssetCode}}`, {
            srcAssetCode,
            destAssetCode,
          }),
        );
        setTxDetails((_state) => ({
          ..._state,
          headerTitle: translations(
            `Swapped {{srcAssetCode}} for {{destAssetCode}}`,
            {
              srcAssetCode,
              destAssetCode,
            },
          ),
          operationText: formattedAmount,
        }));
      } else if (isPayment) {
        // default to Sent if a payment to self
        const _isRecipient = to === publicKey && from !== publicKey;
        const paymentDifference = _isRecipient ? "+" : "-";
        const formattedAmount = `${paymentDifference}${formatAmount(
          new BigNumber(amount).toString(),
        )} ${destAssetCode}`;
        setBodyComponent(
          <Badge variant={_isRecipient ? "success" : "primary"} size="md">
            {formattedAmount}
          </Badge>,
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
            `${
              _isRecipient ? translations("Received") : translations("Sent")
            } \u2022 ${date}`,
        );
        setTxDetails((_state) => ({
          ..._state,
          isRecipient: _isRecipient,
          headerTitle: `${
            _isRecipient ? translations("Received") : translations("Sent")
          } ${destAssetCode}`,
          operationText: formattedAmount,
        }));
      } else if (isCreateExternalAccount) {
        const formattedAmount = `-${formatAmount(
          new BigNumber(startingBalance).toString(),
        )} XLM`;
        setBodyComponent(
          <Badge variant="primary" size="md">
            {formattedAmount}
          </Badge>,
        );
        setIconComponent(<Icon.ArrowUp className="HistoryItem__icon--sent" />);
        setRowText("XLM");
        setDateText((_dateText) => `${translations("Sent")} \u2022 ${date}`);
        setTxDetails((_state) => ({
          ..._state,
          headerTitle: translations("Create Account"),
          isPayment: true,
          operation: {
            ...operation,
            // eslint-disable-next-line
            asset_type: "native",
            to: account,
          } as any, // TODO: overloaded op type, native not valid
          operationText: formattedAmount,
        }));
      } else if (isInvokeHostFn) {
        const attrs = getAttrsFromSorobanHorizonOp(operation, networkDetails);
        const balances =
          accountBalances.balances || ({} as NonNullable<Balances>);

        const tokenKey = getBalanceByKey(
          attrs.contractId,
          balances,
          networkDetails,
        );

        if (!attrs) {
          setRowText(operationString);
          setTxDetails((_state) => ({
            ..._state,
            headerTitle: translations("Transaction"),
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
                  headerTitle: translations("Transaction"),
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
                const formattedAmount = `${
                  isRecieving && "+"
                }${formattedTokenAmount} ${_token.symbol}`;
                setBodyComponent(
                  <Badge
                    variant={isRecieving ? "success" : "primary"}
                    size="md"
                  >
                    {formattedAmount}
                  </Badge>,
                );

                setDateText(
                  (_dateText) =>
                    `${
                      isRecieving
                        ? translations("Received")
                        : translations("Minted")
                    } \u2022 ${date}`,
                );
                setRowText(translations(capitalize(attrs.fnName)));
                setTxDetails((_state) => ({
                  ..._state,
                  operation: {
                    ..._state.operation,
                    from: attrs.from,
                    to: attrs.to,
                  },
                  headerTitle: `${translations(capitalize(attrs.fnName))} ${
                    _token.symbol
                  }`,
                  isPayment: false,
                  isRecipient: isRecieving,
                  operationText: formattedAmount,
                }));
              }
              setIsLoading(false);
            } catch (error) {
              console.error(error);
              captureException(`Error fetching token details: ${error}`);
              setRowText(translations(capitalize(attrs.fnName)));
              setBodyComponent(
                <Badge variant={isRecieving ? "success" : "primary"} size="md">
                  {`${isRecieving && "+"}${translations("Unknown")}`}
                </Badge>,
              );
              setDateText(
                (_dateText) =>
                  `${
                    isRecieving
                      ? translations("Received")
                      : translations("Minted")
                  } \u2022 ${date}`,
              );
              setTxDetails((_state) => ({
                ..._state,
                operation: {
                  ..._state.operation,
                  from: attrs.from,
                  to: attrs.to,
                },
                headerTitle: translations(capitalize(attrs.fnName)),
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
            const formattedAmount = `${
              isRecieving && "+"
            }${formattedTokenAmount} ${token.code}`;
            setBodyComponent(
              <Badge variant={isRecieving ? "success" : "primary"} size="md">
                {formattedAmount}
              </Badge>,
            );

            setDateText(
              (_dateText) =>
                `${
                  isRecieving
                    ? translations("Received")
                    : translations("Minted")
                } \u2022 ${date}`,
            );
            setRowText(translations(capitalize(attrs.fnName)));
            setTxDetails((_state) => ({
              ..._state,
              operation: {
                ..._state.operation,
                from: attrs.from,
                to: attrs.to,
              },
              headerTitle: `${translations(capitalize(attrs.fnName))} ${
                token.code
              }`,
              isPayment: false,
              isRecipient: isRecieving,
              operationText: formattedAmount,
            }));
          }
        } else if (attrs.fnName === SorobanTokenInterface.transfer) {
          setIconComponent(
            <Icon.ArrowUp className="HistoryItem__icon--sent" />,
          );
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
                headerTitle: translations("Transaction"),
                operationText: operationString,
              }));
            }

            const { symbol, decimals } = tokenDetailsResponse!;
            const code = symbol === "native" ? "XLM" : symbol;
            const formattedTokenAmount = formatTokenAmount(
              new BigNumber(attrs.amount),
              decimals,
            );
            const _isRecipient =
              attrs.to === publicKey && attrs.from !== publicKey;
            const paymentDifference = _isRecipient ? "+" : "-";
            const formattedAmount = `${paymentDifference}${formattedTokenAmount} ${code}`;
            setBodyComponent(
              <Badge variant={_isRecipient ? "success" : "primary"} size="md">
                {formattedAmount}
              </Badge>,
            );
            setIconComponent(
              _isRecipient ? (
                <Icon.ArrowDown className="HistoryItem__icon--received" />
              ) : (
                <Icon.ArrowUp className="HistoryItem__icon--sent" />
              ),
            );
            setRowText(code);
            setDateText(
              (_dateText) =>
                `${
                  _isRecipient ? translations("Received") : translations("Sent")
                } \u2022 ${date}`,
            );
            setTxDetails((_state) => ({
              ..._state,
              isRecipient: _isRecipient,
              headerTitle: `${
                _isRecipient ? translations("Received") : translations("Sent")
              } ${code}`,
              operationText: formattedAmount,
            }));
          } catch (error) {
            // falls back to only showing contract ID
            setRowText(operationString);
            setTxDetails((_state) => ({
              ..._state,
              headerTitle: translations("Transaction"),
              operationText: operationString,
            }));
          } finally {
            setIsLoading(false);
          }
        } else {
          setRowText(operationString);
          setTxDetails((_state) => ({
            ..._state,
            headerTitle: translations("Transaction"),
            operationText: operationString,
          }));
        }
      } else {
        setRowText(operationString);
        setTxDetails((_state) => ({
          ..._state,
          headerTitle: translations("Transaction"),
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
    translations,
    to,
    accountBalances.balances,
  ]);

  return (
    <div
      data-testid="history-item"
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

            <div
              className="HistoryItem__payment"
              data-testid="history-item-body-component"
            >
              {renderBodyComponent()}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
/* eslint-enable @typescript-eslint/no-unsafe-argument */
