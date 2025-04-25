import React from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Button } from "@stellar/design-system";

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
  operation: HorizonOperation;
  headerTitle: string;
  isCreateExternalAccount: boolean;
  isRecipient: boolean;
  isPayment: boolean;
  isSwap: boolean;
  operationText: string;
  externalUrl: string;
  setIsDetailViewShowing: (isDetailViewShoing: boolean) => void;
}

export const TransactionDetail = ({
  operation,
  headerTitle,
  isPayment,
  isRecipient,
  isSwap,
  operationText,
  externalUrl,
  setIsDetailViewShowing,
}: Omit<TransactionDetailProps, "isCreateExternalAccount">) => {
  // TODO: Why does transaction_attr not exist on Horizon types?
  const _op = operation as any;
  const {
    asset_code: assetCode,
    asset_issuer: assetIssuer,
    asset_type: assetType,
    from,
    to,
    to_muxed,
    created_at: createdAt,
    transaction_attr: { fee_charged: feeCharged, memo },
  } = _op;
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
      <SubviewHeader
        customBackAction={() => setIsDetailViewShowing(false)}
        title={headerTitle}
      />
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
                assetType={assetType}
                assetIssuer={assetIssuer || ""}
                assetDomain={assetDomain}
              />
            </div>
          ) : null}

          <div className="TransactionDetail__info">
            <div className="TransactionDetail__info__row">
              {isPayment && !isSwap ? (
                <>
                  {isRecipient ? (
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
                        <KeyIdenticon
                          publicKey={to_muxed || to}
                          customSize={identiconDimensions}
                        />
                      </div>
                    </>
                  )}
                </>
              ) : (
                !isSwap && (
                  <>
                    <div>{t("Action")}</div>
                    <div className="InfoRow__right">{operationText}</div>
                  </>
                )
              )}
            </div>
            <div className="TransactionDetail__info__row">
              <div>{t("Date")}</div>
              <div className="InfoRow__right">
                {createdAtTime} &bull; {createdAtDateStr}
              </div>
            </div>
            <div className="TransactionDetail__info__row">
              <div>{t("Memo")}</div>
              <div className="InfoRow__right">{memo || `None`}</div>
            </div>
            <div className="TransactionDetail__info__row">
              <div>{t("Transaction fee")}</div>
              <div className="InfoRow__right">
                {stroopToXlm(feeCharged as string).toString()} XLM
              </div>
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
            onClick={() => {
              emitMetric(METRIC_NAMES.historyOpenItem);
              openTab(externalUrl);
            }}
          >
            {t("View on")} stellar.expert
          </Button>
        ) : null}
      </View.Footer>
    </React.Fragment>
  );
};
