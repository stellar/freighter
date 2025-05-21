// In order to allow that rule we need to refactor this to use the correct Horizon types and narrow operation types
import React, { useState, useEffect, useCallback } from "react";
import { captureException } from "@sentry/browser";
import camelCase from "lodash/camelCase";
import {
  Badge,
  Icon,
  Loader,
  Asset as AssetSds,
  Text,
  TextProps,
} from "@stellar/design-system";
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

import { HorizonOperation, TokenBalance } from "@shared/api/types";
import { NetworkDetails } from "@shared/constants/stellar";
import { getTokenDetails } from "@shared/api/internal";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";
import { AccountBalances } from "helpers/hooks/useGetBalances";

import StellarLogo from "popup/assets/stellar-logo.png";
import {
  mapHistoryItemData,
  isChangeTrustOperation,
  isCreateAccountOperation,
} from "shared-lib-poc";

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
  accountBalances: AccountBalances;
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
    asset_issuer: assetIssuer,
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
    transaction_successful: transactionSuccessful,
  } = _op;
  let sourceAssetCode;
  let sourceAssetIssuer: string;
  if ("source_asset_code" in operation) {
    sourceAssetCode = operation.source_asset_code || "";
  }
  if ("source_asset_issuer" in operation) {
    sourceAssetIssuer = operation.source_asset_issuer || "";
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
    null as React.ReactElement | null,
  );
  const [AmountComponent, setAmountComponent] = useState(
    null as React.ReactElement | null,
  );

  const renderIconComponent = () => {
    if (IconComponent) {
      return IconComponent;
    }

    return (
      <div className="HistoryItem__icon__bordered">
        <Icon.User01 />
      </div>
    );
  };

  const renderIconPlaceholder = (
    tokenCode: string = "",
    size: TextProps["size"] = "sm",
  ) => (
    <div className="HistoryItem__icon__bordered">
      <Text
        as="div"
        size={size}
        weight="bold"
        addlClassName="HistoryItem--placeholder"
      >
        {tokenCode.slice(0, 2)}
      </Text>
    </div>
  );

  /* eslint-disable react-hooks/exhaustive-deps */
  const translations = useCallback(t, []);

  useEffect(() => {
    const map = async () => {
      const historyItemData = await mapHistoryItemData({
        operation,
        publicKey,
        networkDetails,
      });

      console.log("historyItemData", historyItemData);
    };

    map();
  }, []);

  useEffect(() => {
    const buildHistoryItem = async () => {
      setIsLoading(true);

      const historyItemData = await mapHistoryItemData({
        operation,
        publicKey,
        networkDetails,
      });

      const IconComponent =
        Icon[historyItemData.iconString as keyof typeof Icon];

      const ActionIconComponent =
        Icon[historyItemData.actionIconString as keyof typeof Icon];

      if (isCreateAccountOperation(type)) {
        // If you're not creating an external account then this means you're
        // receiving some XLM to create(fund) your own account
        const _isRecipient =
          !historyItemData.transactionDetails.createAccountDetails
            ?.isCreatingExternalAccount;

        setAmountComponent(
          <Badge variant={_isRecipient ? "success" : "primary"} size="md">
            {historyItemData.amountText || ""}
          </Badge>,
        );
        setIconComponent(
          <div className="HistoryItem__icon__bordered">
            <IconComponent />
            <div className="HistoryItem__icon__small HistoryItem--create-account">
              <ActionIconComponent />
            </div>
          </div>,
        );
        setRowText(historyItemData.rowText);
        setDateText(
          (_dateText) =>
            `${historyItemData.actionText} \u2022 ${historyItemData.dateText}`,
        );
        if (
          historyItemData.transactionDetails.createAccountDetails
            ?.isCreatingExternalAccount
        ) {
          setTxDetails((_state) => ({
            ..._state,
            headerTitle: historyItemData.rowText,
            isPayment: true,
            operation: {
              ...historyItemData.transactionDetails.operation,
              asset_type: "native",
              to: historyItemData.transactionDetails.createAccountDetails
                ?.accountPublicKey,
            } as any, // TODO: overloaded op type, native not valid
            operationText: historyItemData.amountText,
          }));
        } else {
          setTxDetails((_state) => ({
            ..._state,
            headerTitle: historyItemData.rowText,
            operationText: historyItemData.amountText,
          }));
        }
      } else if (isChangeTrustOperation(type)) {
        const destIcon = await getIconUrlFromIssuer({
          key: assetIssuer || "",
          code: destAssetCode || "",
          networkDetails,
        });
        setIconComponent(
          <>
            {destIcon && (
              <AssetSds
                size="lg"
                variant="single"
                sourceOne={{
                  altText: "Add trustline token logo",
                  image: destIcon,
                }}
              />
            )}
            {!destIcon && renderIconPlaceholder(destAssetCode)}
            <div className="HistoryItem__icon__small HistoryItem--add-trustline">
              <ActionIconComponent />
            </div>
          </>,
        );
        setRowText(historyItemData.actionText);
        setTxDetails((_state) => ({
          ..._state,
          headerTitle: historyItemData.actionText,
          operationText: historyItemData.operationString,
        }));
      } else if (isSwap) {
        const formattedAmount = `${formatAmount(
          new BigNumber(amount).toString(),
        )} ${destAssetCode}`;
        setAmountComponent(
          <Badge variant="primary" size="md">
            {formattedAmount}
          </Badge>,
        );
        const destIcon =
          destAssetCode === "XLM"
            ? StellarLogo
            : await getIconUrlFromIssuer({
                key: assetIssuer || "",
                code: destAssetCode || "",
                networkDetails,
              });
        const sourceIcon =
          srcAssetCode === "XLM"
            ? StellarLogo
            : await getIconUrlFromIssuer({
                key: sourceAssetIssuer || "",
                code: srcAssetCode || "",
                networkDetails,
              });
        setIconComponent(
          <>
            <div className="HistoryItem__icon__swap-source">
              {sourceIcon && (
                <AssetSds
                  size="md"
                  variant="single"
                  sourceOne={{
                    altText: "Swap source token logo",
                    image: sourceIcon,
                  }}
                />
              )}
              {!sourceIcon && renderIconPlaceholder(srcAssetCode, "xs")}
            </div>
            <div className="HistoryItem__icon__swap-dest">
              {destIcon && (
                <AssetSds
                  size="md"
                  variant="single"
                  sourceOne={{
                    altText: "Swap destination token logo",
                    image: destIcon,
                  }}
                />
              )}
              {!destIcon && renderIconPlaceholder(destIcon, "xs")}
            </div>
            <div className="HistoryItem__icon__small HistoryItem--swap">
              <Icon.RefreshCcw03 />
            </div>
          </>,
        );
        setRowText(
          translations(`{{srcAssetCode}} for {{destAssetCode}}`, {
            srcAssetCode,
            destAssetCode,
          }),
        );
        setDateText((_dateText) => `${translations("Swapped")} \u2022 ${date}`);
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

        setAmountComponent(
          <Badge variant={_isRecipient ? "success" : "primary"} size="md">
            {historyItemData.amountText || ""}
          </Badge>,
        );
        const destIcon =
          destAssetCode === "XLM"
            ? StellarLogo
            : await getIconUrlFromIssuer({
                key: assetIssuer || "",
                code: destAssetCode || "",
                networkDetails,
              });
        setIconComponent(
          <>
            {destIcon && (
              <AssetSds
                size="lg"
                variant="single"
                sourceOne={{
                  altText: "Payment token logo",
                  image: destIcon,
                }}
              />
            )}
            {!destIcon && renderIconPlaceholder(destAssetCode)}
            {_isRecipient && (
              <div className="HistoryItem__icon__small HistoryItem--received">
                <ActionIconComponent />
              </div>
            )}
            {!_isRecipient && (
              <div className="HistoryItem__icon__small HistoryItem--sent">
                <ActionIconComponent />
              </div>
            )}
          </>,
        );
        setRowText(destAssetCode);
        setDateText(
          (_dateText) =>
            `${historyItemData.actionText} \u2022 ${historyItemData.dateText}`,
        );
        setTxDetails((_state) => ({
          ..._state,
          isRecipient: _isRecipient,
          headerTitle: historyItemData.rowText,
          operationText: historyItemData.amountText,
        }));
      } else if (isInvokeHostFn) {
        const attrs = getAttrsFromSorobanHorizonOp(operation, networkDetails);

        if (!attrs) {
          setRowText(operationString);
          setTxDetails((_state) => ({
            ..._state,
            headerTitle: translations("Transaction"),
            operationText: operationString,
          }));
        } else if (attrs.fnName === SorobanTokenInterface.mint) {
          const assetBalance = getBalanceByKey(
            attrs.contractId,
            accountBalances.balances,
            networkDetails,
          );

          const isReceiving = attrs.to === publicKey;
          setIconComponent(
            <div className="HistoryItem__icon__bordered">
              <Icon.User01 />
              {isReceiving && (
                <div className="HistoryItem__icon__small HistoryItem--received">
                  <Icon.ArrowDown />
                </div>
              )}
              {!isReceiving && (
                <div className="HistoryItem__icon__small HistoryItem--sent">
                  <Icon.Send03 />
                </div>
              )}
            </div>,
          );

          // Minter does not need to have tokens to mint, and
          // they are not neccessarily minted to themselves.
          // If user has minted to self, add token to their token list.
          if (!assetBalance) {
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
                  decimals: tokenDetailsResponse.decimals,
                  name: tokenDetailsResponse.name,
                  symbol: tokenDetailsResponse.symbol,
                };

                const formattedTokenAmount = formatTokenAmount(
                  new BigNumber(attrs.amount),
                  _token.decimals,
                );

                const formattedAmount = `${
                  isReceiving ? "+" : ""
                }${formattedTokenAmount} ${_token.symbol}`;

                setAmountComponent(
                  <Badge
                    variant={isReceiving ? "success" : "primary"}
                    size="md"
                  >
                    {formattedAmount}
                  </Badge>,
                );
                setDateText(
                  (_dateText) =>
                    `${
                      isReceiving
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
                  isRecipient: isReceiving,
                  operationText: formattedAmount,
                }));
              }
              setIsLoading(false);
            } catch (error) {
              console.error(error);
              captureException(`Error fetching token details: ${error}`);
              setRowText(translations(capitalize(attrs.fnName)));
              setAmountComponent(
                <Badge variant={isReceiving ? "success" : "primary"} size="md">
                  {`${isReceiving ? "+" : ""}${translations("Unknown")}`}
                </Badge>,
              );
              setDateText(
                (_dateText) =>
                  `${
                    isReceiving
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
                isRecipient: isReceiving,
                operationText: operationString,
              }));
              setIsLoading(false);
            }
          } else {
            const { token, decimals } = assetBalance as TokenBalance;
            const formattedTokenAmount = formatTokenAmount(
              new BigNumber(attrs.amount),
              decimals,
            );
            const formattedAmount = `${
              isReceiving ? "+" : ""
            }${formattedTokenAmount} ${token.code}`;
            setAmountComponent(
              <Badge variant={isReceiving ? "success" : "primary"} size="md">
                {formattedAmount}
              </Badge>,
            );
            setDateText(
              (_dateText) =>
                `${
                  isReceiving
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
              isRecipient: isReceiving,
              operationText: formattedAmount,
            }));
          }
        } else if (attrs.fnName === SorobanTokenInterface.transfer) {
          setIconComponent(
            <div className="HistoryItem__icon__bordered">
              <Icon.User01 />
              <div className="HistoryItem__icon__small HistoryItem--sent">
                <Icon.Send03 />
              </div>
            </div>,
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
            const isNative = symbol === "native";
            const code = isNative ? "XLM" : symbol;
            const formattedTokenAmount = formatTokenAmount(
              new BigNumber(attrs.amount),
              decimals,
            );
            const _isRecipient =
              attrs.to === publicKey && attrs.from !== publicKey;
            const paymentDifference = _isRecipient ? "+" : "-";
            const formattedAmount = `${paymentDifference}${formattedTokenAmount} ${code}`;
            setAmountComponent(
              <Badge variant={_isRecipient ? "success" : "primary"} size="md">
                {formattedAmount}
              </Badge>,
            );
            setIconComponent(
              <>
                {isNative && (
                  <AssetSds
                    size="lg"
                    variant="single"
                    sourceOne={{
                      altText: "Stellar token logo",
                      image: StellarLogo,
                    }}
                  />
                )}
                {!isNative && (
                  <div className="HistoryItem__icon__bordered">
                    <Icon.User01 />
                  </div>
                )}
                {_isRecipient && (
                  <div className="HistoryItem__icon__small HistoryItem--received">
                    <Icon.ArrowDown />
                  </div>
                )}
                {!_isRecipient && (
                  <div className="HistoryItem__icon__small HistoryItem--sent">
                    <Icon.Send03 />
                  </div>
                )}
              </>,
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
          operationText: historyItemData.operationString,
        }));
      }

      if (transactionSuccessful === false) {
        setRowText(translations("Transaction failed"));
        setDateText((_dateText) => date);

        setIconComponent(
          <div className="HistoryItem__icon__bordered">
            <Icon.Wallet03 />

            <div className="HistoryItem__icon__small HistoryItem--failed">
              <Icon.XCircle />
            </div>
          </div>,
        );
        setTxDetails((_state) => ({
          ..._state,
          headerTitle: translations("Transaction failed"),
        }));
        setAmountComponent(null);
      }
      setIsLoading(false);
    };

    try {
      buildHistoryItem();
    } catch (e) {
      setIsLoading(false);
    }
  }, [
    account,
    amount,
    date,
    destAssetCode,
    from,
    type,
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
        {isLoading && (
          <div className="HistoryItem__loader">
            <Loader size="2rem" />
          </div>
        )}
        {!isLoading && (
          <div className="HistoryItem__row HistoryItem--space-between">
            <div className="HistoryItem__row">
              <div className="HistoryItem__icon">{renderIconComponent()}</div>
              <Text
                as="div"
                size="md"
                weight="regular"
                addlClassName="HistoryItem__description"
              >
                <span data-testid="history-item-label">{rowText}</span>
                <Text
                  as="div"
                  size="xs"
                  weight="regular"
                  addlClassName="HistoryItem--date"
                >
                  {dateText}
                </Text>
              </Text>
            </div>
            <div
              className="HistoryItem__amount"
              data-testid="history-item-amount-component"
            >
              {AmountComponent}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
