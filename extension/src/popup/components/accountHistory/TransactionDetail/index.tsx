import React from "react";
import { useTranslation } from "react-i18next";
import { Asset, Button, Icon, Text } from "@stellar/design-system";
import { Horizon } from "stellar-sdk";

import StellarLogo from "popup/assets/stellar-logo.png";

import { emitMetric } from "helpers/metrics";
import { openTab } from "popup/helpers/navigate";
import { stroopToXlm, truncatedPublicKey } from "helpers/stellar";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { isCustomNetwork } from "@shared/helpers/stellar";
import {
  getActionIconByType,
  getPaymentIcon,
  getSwapIcons,
  OperationDataRow,
} from "popup/views/AccountHistory/hooks/useGetHistoryData";
import { NetworkDetails } from "@shared/constants/stellar";
import { getStellarExpertUrl } from "popup/helpers/account";
import { IdenticonImg } from "popup/components/identicons/IdenticonImg";

import "./styles.scss";

export const TransactionDetail = ({
  activeOperation,
  networkDetails,
}: {
  activeOperation: OperationDataRow | null;
  networkDetails: NetworkDetails;
}) => {
  const { t } = useTranslation();
  if (!activeOperation) {
    return <></>;
  }

  const createdAtDateInstance = new Date(
    Date.parse(activeOperation.metadata.createdAt),
  );
  const createdAtLocalStrArr = createdAtDateInstance
    .toLocaleString()
    .split(" ");
  const createdAtTime = `${createdAtLocalStrArr[1]
    .split(":")
    .slice(0, 2)
    .join(":")} ${createdAtLocalStrArr[2]}`;
  const createdAtDateStr = createdAtDateInstance
    .toDateString()
    .split(" ")
    .slice(1)
    .join(" ");

  const stellarExpertUrl = getStellarExpertUrl(networkDetails);
  const { feeCharged, memo } = activeOperation.metadata;

  const renderBody = (activeOperation: OperationDataRow) => {
    if (activeOperation.metadata.isInvokeHostFn) {
      const {
        destAssetCode,
        isTokenMint,
        isTokenTransfer,
        nonLabelAmount,
        to,
      } = activeOperation.metadata;
      const title =
        isTokenTransfer || isTokenMint ? (
          <>
            {`${activeOperation.action} `}
            {activeOperation.rowText}
          </>
        ) : (
          activeOperation.action
        );
      return (
        <>
          <div className="TransactionDetailModal__title-row">
            <div className="TransactionDetailModal__icon">
              {activeOperation.rowIcon}
            </div>
            <div className="TransactionDetailModal__title-details">
              <div className="TransactionDetailModal__title invocation">
                {title}
              </div>
              <Text
                as="div"
                size="xs"
                weight="regular"
                addlClassName="TransactionDetailModal__subtitle"
              >
                <>
                  {getActionIconByType(activeOperation.actionIcon)}
                  <div className="TransactionDetailModal__subtitle-date">
                    {createdAtDateStr} &bull; {createdAtTime}
                  </div>
                </>
              </Text>
            </div>
          </div>
          {isTokenTransfer && (
            <div className="TransactionDetailModal__body transfer">
              <div className="Send__src">
                <div className="Send__src__amount">{nonLabelAmount}</div>
                <div className="Send__src__icon">
                  {getPaymentIcon({ destAssetCode })}
                </div>
              </div>
              <div className="Send__direction">
                <Icon.ChevronDownDouble />
              </div>
              <div className="Send__dst">
                <div className="Send__dst__amount">
                  {truncatedPublicKey(to)}
                </div>
                <div className="Send__dst__icon">
                  <IdenticonImg publicKey={to} />
                </div>
              </div>
            </div>
          )}
        </>
      );
    }

    if (activeOperation.metadata.isPayment) {
      const { destIcon, destAssetCode, to, nonLabelAmount } =
        activeOperation.metadata;

      return (
        <>
          <div className="TransactionDetailModal__title-row">
            <div className="TransactionDetailModal__icon">
              {getPaymentIcon({ destIcon, destAssetCode })}
            </div>
            <div className="TransactionDetailModal__title-details">
              <div
                className="TransactionDetailModal__title swap"
                data-testid="TransactionDetailModal__title"
              >
                {`${activeOperation.action} `}
                {activeOperation.rowText}
              </div>
              <Text
                as="div"
                size="xs"
                weight="regular"
                addlClassName="TransactionDetailModal__subtitle"
              >
                <>
                  {getActionIconByType(activeOperation.actionIcon)}
                  <div
                    className="TransactionDetailModal__subtitle-date"
                    data-testid="TransactionDetailModal__subtitle-date"
                  >
                    {createdAtDateStr} &bull; {createdAtTime}
                  </div>
                </>
              </Text>
            </div>
          </div>
          <div className="TransactionDetailModal__body send">
            <div className="Send__src">
              <div
                className="Send__src__amount"
                data-testid="TransactionDetailModal__src-amount"
              >
                {nonLabelAmount}
              </div>
              <div className="Send__src__icon">
                <Asset
                  size="lg"
                  variant="single"
                  sourceOne={{
                    altText: "Payment asset",
                    image: destIcon,
                  }}
                />
              </div>
            </div>
            <div className="Send__direction">
              <Icon.ChevronDownDouble />
            </div>
            <div className="Send__dst">
              <div
                className="Send__dst__amount"
                data-testid="TransactionDetailModal__dst-amount"
              >
                {truncatedPublicKey(to)}
              </div>
              <div className="Send__dst__icon">
                <IdenticonImg publicKey={to} />
              </div>
            </div>
          </div>
        </>
      );
    }

    if (activeOperation.metadata.isSwap) {
      const {
        destIcon,
        formattedSrcAmount,
        srcAssetCode,
        sourceIcon,
        nonLabelAmount,
      } = activeOperation.metadata;
      return (
        <>
          <div className="TransactionDetailModal__title-row">
            <div className="TransactionDetailModal__icon">
              {getSwapIcons({ destIcon, srcAssetCode, sourceIcon })}
            </div>
            <div className="TransactionDetailModal__title-details">
              <div className="TransactionDetailModal__title swap">
                {`${activeOperation.action} `}
                {activeOperation.rowText}
              </div>
              <Text
                as="div"
                size="xs"
                weight="regular"
                addlClassName="TransactionDetailModal__subtitle"
              >
                <>
                  {getActionIconByType(activeOperation.actionIcon)}
                  <div className="TransactionDetailModal__subtitle-date">
                    {createdAtDateStr} &bull; {createdAtTime}
                  </div>
                </>
              </Text>
            </div>
          </div>
          <div className="TransactionDetailModal__body swap">
            <div className="Swap__src">
              <div className="Swap__src__amount">{formattedSrcAmount}</div>
              <div className="Swap__src__icon">
                <Asset
                  size="lg"
                  variant="single"
                  sourceOne={{
                    altText: "Swap source",
                    image: sourceIcon,
                    backgroundColor: "transparent",
                  }}
                />
              </div>
            </div>
            <div className="Swap__direction">
              <Icon.ChevronDownDouble />
            </div>
            <div className="Swap__dst">
              <div className="Swap__dst__amount">{nonLabelAmount}</div>
              <div className="Swap__dst__icon">
                <Asset
                  size="lg"
                  variant="single"
                  sourceOne={{
                    altText: "Swap destination",
                    image: destIcon,
                  }}
                />
              </div>
            </div>
          </div>
        </>
      );
    }

    switch (activeOperation.metadata.type) {
      case Horizon.HorizonApi.OperationResponseType.createAccount: {
        const { nonLabelAmount, to } = activeOperation.metadata;
        return (
          <>
            <div className="TransactionDetailModal__title-row">
              <div className="TransactionDetailModal__icon">
                {activeOperation.rowIcon}
              </div>
              <div className="TransactionDetailModal__title-details">
                <div className="TransactionDetailModal__title invocation">
                  {activeOperation.rowText}
                </div>
                <Text
                  as="div"
                  size="xs"
                  weight="regular"
                  addlClassName="TransactionDetailModal__subtitle"
                >
                  <>
                    {getActionIconByType(activeOperation.actionIcon)}
                    <div className="TransactionDetailModal__subtitle-date">
                      {createdAtDateStr} &bull; {createdAtTime}
                    </div>
                  </>
                </Text>
              </div>
            </div>
            <div className="TransactionDetailModal__body send">
              <div className="Send__src">
                <div className="Send__src__amount">{nonLabelAmount}</div>
                <div className="Send__src__icon">
                  <Asset
                    size="lg"
                    variant="single"
                    sourceOne={{
                      altText: t("Stellar token logo"),
                      image: StellarLogo,
                    }}
                  />
                </div>
              </div>
              <div className="Send__direction">
                <Icon.ChevronDownDouble />
              </div>
              <div className="Send__dst">
                <div className="Send__dst__amount">
                  {truncatedPublicKey(to)}
                </div>
                <div className="Send__dst__icon">
                  <IdenticonImg publicKey={to} />
                </div>
              </div>
            </div>
          </>
        );
      }

      case Horizon.HorizonApi.OperationResponseType.changeTrust: {
        return (
          <>
            <div className="TransactionDetailModal__title-row">
              <div className="TransactionDetailModal__icon">
                {activeOperation.rowIcon}
              </div>
              <div className="TransactionDetailModal__title-details">
                <div className="TransactionDetailModal__title invocation">
                  {activeOperation.rowText} for{" "}
                  {activeOperation.metadata.destAssetCode}
                </div>
                <Text
                  as="div"
                  size="xs"
                  weight="regular"
                  addlClassName="TransactionDetailModal__subtitle"
                >
                  <>
                    {getActionIconByType(activeOperation.actionIcon)}
                    <div className="TransactionDetailModal__subtitle-date">
                      {createdAtDateStr} &bull; {createdAtTime}
                    </div>
                  </>
                </Text>
              </div>
            </div>
          </>
        );
      }

      default: {
        return (
          <>
            <div className="TransactionDetailModal__title-row">
              <div className="TransactionDetailModal__icon">
                {activeOperation.rowIcon}
              </div>
              <div className="TransactionDetailModal__title-details">
                <div className="TransactionDetailModal__title invocation">
                  {activeOperation.rowText}
                </div>
                <Text
                  as="div"
                  size="xs"
                  weight="regular"
                  addlClassName="TransactionDetailModal__subtitle"
                >
                  <>
                    {getActionIconByType(activeOperation.actionIcon)}
                    <div className="TransactionDetailModal__subtitle-date">
                      {createdAtDateStr} &bull; {createdAtTime}
                    </div>
                  </>
                </Text>
              </div>
            </div>
          </>
        );
      }
    }
  };

  return (
    <div
      className="TransactionDetailModal"
      data-testid="TransactionDetailModal"
    >
      {renderBody(activeOperation)}
      <div className="TransactionDetailModal__metadata">
        <div className="Metadata">
          <div className="Metadata__label">
            <Icon.ClockCheck />
            Status
          </div>
          <div
            className={`Metadata__value ${activeOperation.metadata.transactionFailed ? "failed" : "success"}`}
            data-testid="TransactionDetailModal__status"
          >
            {activeOperation.metadata.transactionFailed ? "Failed" : "Success"}
          </div>
        </div>
        <div className="Metadata">
          <div className="Metadata__label">
            <Icon.Route />
            Fee
          </div>
          <div className="Metadata__value">
            {stroopToXlm(feeCharged as string).toString()} XLM
          </div>
        </div>
        {memo && (
          <div className="Metadata">
            <div className="Metadata__label">
              <Icon.File02 />
              Memo
            </div>
            <div className="Metadata__value">{memo}</div>
          </div>
        )}
      </div>
      {!isCustomNetwork(networkDetails) ? (
        <Button
          size="lg"
          variant="secondary"
          isFullWidth
          isRounded
          onClick={() => {
            emitMetric(METRIC_NAMES.historyOpenItem);
            openTab(`${stellarExpertUrl}/op/${activeOperation.id}`);
          }}
          icon={<Icon.LinkExternal01 />}
          iconPosition="right"
        >
          {t("View on")} stellar.expert
        </Button>
      ) : null}
    </div>
  );
};
