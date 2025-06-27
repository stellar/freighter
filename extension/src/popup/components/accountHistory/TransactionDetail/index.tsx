import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Button, CopyText, Icon } from "@stellar/design-system";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { AssetNetworkInfo } from "popup/components/accountHistory/AssetNetworkInfo";
import { Loading } from "popup/components/Loading";
import { View } from "popup/basics/layout/View";

import { emitMetric } from "helpers/metrics";
import { openTab } from "popup/helpers/navigate";
import { stroopToXlm } from "helpers/stellar";
import { useAssetDomain } from "popup/helpers/useAssetDomain";
import { useScanAsset } from "popup/helpers/blockaid";
import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { HorizonOperation } from "@shared/api/types";
import { isCustomNetwork } from "@shared/helpers/stellar";

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
