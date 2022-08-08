import React from "react";
import { useTranslation } from "react-i18next";

import { Button } from "popup/basics/buttons/Button";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { SubviewHeader } from "popup/components/SubviewHeader";
import { AssetNetworkInfo } from "popup/components/accountHistory/AssetNetworkInfo";

import { emitMetric } from "helpers/metrics";
import { openTab } from "popup/helpers/navigate";
import { stroopToXlm } from "helpers/stellar";
import { useAssetDomain } from "popup/helpers/useAssetDomain";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { HorizonOperation } from "@shared/api/types";
import "./styles.scss";

export interface TransactionDetailProps {
  operation: HorizonOperation;
  headerTitle: string;
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
}: TransactionDetailProps) => {
  const {
    asset_code: assetCode,
    asset_issuer: assetIssuer,
    asset_type: assetType,
    from,
    to,
    created_at: createdAt,
    transaction_attr: { fee_charged: feeCharged, memo },
  } = operation;
  const createdAtDateInstance = new Date(Date.parse(createdAt));
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

  const { assetDomain } = useAssetDomain({
    assetIssuer,
  });

  return assetIssuer && !assetDomain ? null : (
    <div className="TransactionDetail">
      <div className="TransactionDetail__content">
        <SubviewHeader
          customBackAction={() => setIsDetailViewShowing(false)}
          title={headerTitle}
        />
        {isPayment ? (
          <div className="TransactionDetail__header">
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
                    <div>
                      <KeyIdenticon
                        publicKey={from}
                        customSize={identiconDimensions}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>{t("To")}</div>
                    <div>
                      <KeyIdenticon
                        publicKey={to}
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
                  <div>{operationText}</div>
                </>
              )
            )}
          </div>
          <div className="TransactionDetail__info__row">
            <div>{t("Date")}</div>
            <div>
              {createdAtTime} &bull; {createdAtDateStr}
            </div>
          </div>
          <div className="TransactionDetail__info__row">
            <div>{t("Memo")}</div>
            <div>{memo || `None`}</div>
          </div>
          <div className="TransactionDetail__info__row">
            <div>{t("Transaction fee")}</div>
            <div>{stroopToXlm(feeCharged).toString()} XLM</div>
          </div>
        </div>
      </div>
      <Button
        fullWidth
        onClick={() => {
          emitMetric(METRIC_NAMES.historyOpenItem);
          openTab(externalUrl);
        }}
        variant={Button.variant.tertiary}
      >
        {t("View on")} stellar.expert
      </Button>
    </div>
  );
};
