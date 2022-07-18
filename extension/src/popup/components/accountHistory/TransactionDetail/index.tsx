import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import StellarSdk from "stellar-sdk";
import { useTranslation } from "react-i18next";

import { Button } from "popup/basics/buttons/Button";

import { KeyIdenticon } from "popup/components/identicons/KeyIdenticon";
import { SubviewHeader } from "popup/components/SubviewHeader";

import { emitMetric } from "helpers/metrics";
import { openTab } from "popup/helpers/navigate";
import { stroopToXlm } from "helpers/stellar";
import { getIconUrlFromIssuer } from "@shared/api/helpers/getIconUrlFromIssuer";

import { settingsNetworkDetailsSelector } from "popup/ducks/settings";

import { METRIC_NAMES } from "popup/constants/metricsNames";

import { HorizonOperation } from "@shared/api/types";
import StellarLogo from "popup/assets/stellar-logo.png";

import "./styles.scss";

export interface TransactionDetailProps {
  operation: HorizonOperation;
  headerTitle: string;
  isRecipient: boolean;
  isPayment: boolean;
  operationText: string;
  externalUrl: string;
  setIsDetailViewShowing: (isDetailViewShoing: boolean) => void;
}

export const TransactionDetail = ({
  operation,
  headerTitle,
  isPayment,
  isRecipient,
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
  const networkDetails = useSelector(settingsNetworkDetailsSelector);
  const [networkIconUrl, setNetworkIconUrl] = useState("");
  const [networkDomain, setNetworkDomain] = useState("");

  useEffect(() => {
    const fetchIconUrl = async () => {
      const { networkUrl } = networkDetails;
      const server = new StellarSdk.Server(networkUrl);
      let iconUrl = "";
      let assetDomain = "";

      // TODO: Combine these 2 into 1 call. getIconUrlFromIssuer load's the issuer account from Horizon.
      // Find a way to get the icon and the home domain in one call even when icon is cached
      // https://github.com/stellar/freighter/issues/410
      try {
        ({ home_domain: assetDomain } = await server.loadAccount(assetIssuer));
      } catch (e) {
        console.error(e);
      }
      setNetworkDomain(assetDomain || " ");

      try {
        iconUrl = await getIconUrlFromIssuer({
          key: assetIssuer || "",
          code: assetCode || "",
          networkDetails,
        });
      } catch (e) {
        console.error(e);
      }

      setNetworkIconUrl(iconUrl);
    };

    if (assetIssuer) {
      fetchIconUrl();
    }
  }, [assetCode, assetIssuer, isRecipient, networkDetails]);

  return assetIssuer && !networkDomain ? null : (
    <div className="TransactionDetail">
      <div className="TransactionDetail__content">
        <SubviewHeader
          customBackAction={() => setIsDetailViewShowing(false)}
          title={headerTitle}
        />
        {isPayment ? (
          <div className="TransactionDetail__header">
            {operationText}
            <div className="TransactionDetail__header__network">
              <>
                {networkIconUrl || assetType === "native" ? (
                  <img src={networkIconUrl || StellarLogo} alt="Network icon" />
                ) : (
                  <div className="TransactionDetail__header__network__icon" />
                )}

                <span>{networkDomain || "Stellar Lumens"}</span>
              </>
            </div>
          </div>
        ) : null}

        <div className="TransactionDetail__info">
          <div className="TransactionDetail__info__row">
            {isPayment ? (
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
              <>
                <div>{t("Action")}</div>
                <div>{operationText}</div>
              </>
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
