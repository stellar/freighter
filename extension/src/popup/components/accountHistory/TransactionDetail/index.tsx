import React, { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Asset, Button, CopyText, Icon, Text } from "@stellar/design-system";
import { Horizon } from "stellar-sdk";

import StellarLogo from "popup/assets/stellar-logo.png";
import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { AssetNetworkInfo } from "popup/components/accountHistory/AssetNetworkInfo";
import { Loading } from "popup/components/Loading";
import { View } from "popup/basics/layout/View";

import { emitMetric } from "helpers/metrics";
import { openTab } from "popup/helpers/navigate";
import { stroopToXlm, truncatedPublicKey } from "helpers/stellar";
import { useAssetDomain } from "popup/helpers/useAssetDomain";
import { useScanAsset } from "popup/helpers/blockaid";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { HorizonOperation } from "@shared/api/types";
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

export interface TransactionDetailProps {
  externalUrl: string;
  headerTitle: string;
  isCreateExternalAccount: boolean;
  isPayment: boolean;
  isRecipient: boolean;
  isSwap: boolean;
  onBack: () => void;
  operation: HorizonOperation;
  operationText: string;
  transactionSuccessful: boolean;
  txHash: string;
  icon: ReactNode;
}

export const TransactionDetail = ({
  externalUrl,
  isPayment,
  isRecipient,
  isSwap,
  onBack,
  operation,
  operationText,
  transactionSuccessful,
  txHash,
}: Omit<TransactionDetailProps, "isCreateExternalAccount">) => {
  const {
    asset_code: assetCode,
    asset_issuer: assetIssuer,
    asset_type: assetType,
    from,
    to,
    to_muxed,
    created_at: createdAt,
    transaction_attr: { fee_charged: feeCharged, memo },
  } = operation;
  const createdAtDateInstance = new Date(Date.parse(createdAt as string));
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
  const identiconDimensions = {
    dimension: "1rem",
    padding: ".1rem",
  };

  const { t } = useTranslation();

  const { assetDomain, error: assetError } = useAssetDomain({
    assetIssuer,
  });
  const { scannedAsset } = useScanAsset(`${assetCode}-${assetIssuer}`);
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const showContent = assetIssuer && !assetDomain && !assetError;
  const isMalicious = scannedAsset.result_type === "Malicious";

  return showContent ? (
    <Loading />
  ) : (
    <React.Fragment>
      <SubviewHeader customBackAction={onBack} title="Transaction" />
      <View.Content>
        <div
          className="TransactionDetail__content"
          data-testid="transaction-detail"
        >
          {isPayment ? (
            <div
              className={`TransactionDetail__header ${
                isMalicious ? "TransactionDetail__header--isMalicious" : ""
              }`}
            >
              {operationText}
              <AssetNetworkInfo
                assetCode={assetCode || ""}
                assetType={assetType || ""}
                assetIssuer={assetIssuer || ""}
                assetDomain={assetDomain}
              />
            </div>
          ) : null}

          <div className="TransactionDetail__info">
            <div className="TransactionDetail__info__row">
              {isPayment && !isSwap ? (
                <>
                  {isRecipient && from ? (
                    <>
                      <div>{t("From")}</div>
                      <div className="InfoRow__right">
                        <KeyIdenticon
                          publicKey={from}
                          customSize={identiconDimensions}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div>{t("To")}</div>
                      <div className="InfoRow__right">
                        {to_muxed || to ? (
                          <KeyIdenticon
                            publicKey={(to_muxed || to)!}
                            customSize={identiconDimensions}
                          />
                        ) : null}
                      </div>
                    </>
                  )}
                </>
              ) : (
                !isSwap && (
                  <>
                    <div className="InfoRow__title">{t("Action")}</div>
                    <div>{operationText}</div>
                  </>
                )
              )}
            </div>
            <div className="TransactionDetail__info__row">
              <div className="InfoRow__title">{t("Status")}</div>
              <div
                className={`InfoRow__${transactionSuccessful ? "success" : "failed"}`}
              >
                {transactionSuccessful ? "Success" : "Failed"}
              </div>
            </div>
            <div className="TransactionDetail__info__row">
              <div className="InfoRow__title">{t("Date")}</div>
              <div>
                {createdAtDateStr} &bull; {createdAtTime}
              </div>
            </div>
            <CopyText textToCopy={txHash} doneLabel="hash copied">
              <div className="TransactionDetail__info__row">
                <div className="InfoRow__title">
                  {t("Transaction")}
                  <Icon.Copy01 />
                </div>
                <div>{txHash}</div>
              </div>
            </CopyText>
            <div className="TransactionDetail__info__row">
              <div className="InfoRow__title">{t("Transaction fee")}</div>
              <div>{stroopToXlm(feeCharged as string).toString()} XLM</div>
            </div>
            <div className="TransactionDetail__info__row">
              <div className="InfoRow__title">{t("Memo")}</div>
              <div>{memo || `None`}</div>
            </div>
          </div>
        </div>
      </View.Content>
      <View.Footer>
        {!isCustomNetwork(networkDetails) ? (
          <Button
            size="md"
            variant="secondary"
            isFullWidth
            isRounded
            onClick={() => {
              emitMetric(METRIC_NAMES.historyOpenItem);
              openTab(externalUrl);
            }}
            icon={<Icon.LinkExternal01 />}
            iconPosition="right"
          >
            {t("View on")} stellar.expert
          </Button>
        ) : null}
      </View.Footer>
    </React.Fragment>
  );
};

export const TransactionDetail2 = ({
  activeOperation,
  networkDetails,
}: {
  activeOperation?: OperationDataRow;
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
          <div className="TransactionDetailModal__body send">
            <div className="Send__src">
              <div className="Send__src__amount">{nonLabelAmount}</div>
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
              <div className="Send__dst__amount">{truncatedPublicKey(to)}</div>
              <div className="Send__dst__icon">
                <IdenticonImg publicKey={to} />
              </div>
            </div>
          </div>
        </>
      );
    }

    if (activeOperation.metadata.isSwap) {
      const { destIcon, formattedSrcAmount, srcAssetCode, sourceIcon } =
        activeOperation.metadata;
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
                  }}
                />
              </div>
            </div>
            <div className="Swap__direction">
              <Icon.ChevronDownDouble />
            </div>
            <div className="Swap__dst">
              <div className="Swap__dst__amount">{activeOperation.amount}</div>
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
                      altText: "Stellar token logo",
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
    <div className="TransactionDetailModal">
      {renderBody(activeOperation)}
      <div className="TransactionDetailModal__metadata">
        <div className="Metadata">
          <div className="Metadata__label">
            <Icon.ClockCheck />
            Status
          </div>
          <div
            className={`Metadata__value ${activeOperation.metadata.transactionFailed ? "failed" : "success"}`}
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
          size="md"
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
