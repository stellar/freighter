import React from "react";
import { useTranslation } from "react-i18next";
import { Icon } from "@stellar/design-system";

import { TruncatedMemo } from "popup/components/TruncatedMemo";
import { HistoryEntryDetails } from "popup/views/AccountHistory/model";

export const MetaCard = ({
  details,
  memo,
}: {
  details: HistoryEntryDetails;
  /** lazily fetched from Horizon; not present in the v2 payload */
  memo?: string | null;
}) => {
  const { t } = useTranslation();

  return (
    <div className="TransactionDetailModal__metadata" data-testid="meta-card">
      <div className="Metadata" data-testid="meta-status">
        <div className="Metadata__label">
          <Icon.ClockCheck />
          {t("Status")}
        </div>
        <div className={`Metadata__value ${details.status}`}>
          {details.status === "success" ? t("Success") : t("Failed")}
        </div>
      </div>

      {details.rate ? (
        <div className="Metadata" data-testid="meta-rate">
          <div className="Metadata__label">
            <Icon.RefreshCw02 />
            {t("Rate")}
          </div>
          <div className="Metadata__value">{details.rate}</div>
        </div>
      ) : null}

      <div className="Metadata" data-testid="meta-fee">
        <div className="Metadata__label">
          <Icon.Route />
          {t("Fee")}
        </div>
        <div className="Metadata__value">{details.fee} XLM</div>
      </div>

      {memo ? (
        <div className="Metadata Metadata--memo" data-testid="meta-memo">
          <div className="Metadata__label">
            <Icon.File02 />
            {t("Memo")}
          </div>
          <div className="Metadata__value Metadata__value--memo">
            <TruncatedMemo memo={memo} className="Metadata__memo" />
          </div>
        </div>
      ) : null}
    </div>
  );
};
